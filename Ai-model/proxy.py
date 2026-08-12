"""
SecuGrid local-AI proxy.

Sits in front of a vLLM / llama.cpp OpenAI-compatible server and adds:
  - JSON-schema guided decoding pass-through
  - response caching (Redis)
  - guardrail: strips any CVE/CWE ID not present in the tool/scanner context
  - fallback to a hosted provider on error, timeout, or failed guardrail

Exposes the SAME /v1/chat/completions shape, so the SecuGrid backend only
needs its base URL pointed here instead of at OpenAI/Gemini directly.
"""

import hashlib
import json
import os
import re
import time
from typing import Any

import httpx
import redis.asyncio as redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="secugrid-ai-proxy")

LOCAL_MODEL_URL = os.environ.get("LOCAL_MODEL_URL", "http://localhost:8000/v1")
LOCAL_MODEL_NAME = os.environ.get("LOCAL_MODEL_NAME", "secugrid-qwen2.5-coder-7b")
FALLBACK_URL = os.environ.get("FALLBACK_PROVIDER_URL")  # e.g. https://api.openai.com/v1
FALLBACK_API_KEY = os.environ.get("FALLBACK_PROVIDER_API_KEY")
FALLBACK_MODEL = os.environ.get("FALLBACK_MODEL", "gpt-4o-mini")
CACHE_TTL = int(os.environ.get("AI_CACHE_TTL_SECONDS", "86400"))
LOCAL_TIMEOUT_S = float(os.environ.get("LOCAL_MODEL_TIMEOUT_S", "20"))

redis_client = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}")
CWE_RE = re.compile(r"CWE-\d{1,4}")


def cache_key(payload: dict) -> str:
    # Cache on scan target + type + schema, not on user/session, so identical
    # scans (same repo commit / URL) share a cache entry across users.
    material = json.dumps(
        {
            "scan_type": payload.get("scan_type"),
            "target": payload.get("target"),
            "schema": payload.get("response_format"),
        },
        sort_keys=True,
    )
    return "secugrid:ai:" + hashlib.sha256(material.encode()).hexdigest()


def allowed_ids_from_context(messages: list[dict]) -> set[str]:
    """CVE/CWE IDs are only legitimate if they appear somewhere in the
    tool/context messages the scanner or RAG layer injected — never if the
    model introduces them itself."""
    allowed = set()
    for m in messages:
        if m.get("role") in ("tool", "system"):
            content = m.get("content", "")
            allowed |= set(CVE_RE.findall(content))
            allowed |= set(CWE_RE.findall(content))
    return allowed


def strip_unverified_ids(text: str, allowed: set[str]) -> tuple[str, bool]:
    """Returns (cleaned_text, guardrail_tripped)."""
    tripped = False

    def _sub(pattern: re.Pattern, s: str) -> str:
        nonlocal tripped

        def repl(m: re.Match) -> str:
            nonlocal tripped
            if m.group(0) in allowed:
                return m.group(0)
            tripped = True
            return "[unverified-id-removed]"

        return pattern.sub(repl, s)

    text = _sub(CVE_RE, text)
    text = _sub(CWE_RE, text)
    return text, tripped


async def call_model(base_url: str, api_key: str | None, model: str, body: dict) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {**body, "model": model}
    async with httpx.AsyncClient(timeout=LOCAL_TIMEOUT_S) as client:
        resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    allowed_ids = allowed_ids_from_context(messages)

    key = cache_key(body)
    cached = await redis_client.get(key)
    if cached:
        return JSONResponse(json.loads(cached))

    used_fallback = False
    result: dict[str, Any] | None = None

    try:
        result = await call_model(LOCAL_MODEL_URL, None, LOCAL_MODEL_NAME, body)
        content = result["choices"][0]["message"]["content"]

        # Guarded JSON parse — local server should already enforce this via
        # guided_json, this is a second, cheap safety check.
        json.loads(content)

        cleaned, tripped = strip_unverified_ids(content, allowed_ids)
        if tripped and FALLBACK_URL:
            # Guardrail caught a hallucinated ID — don't ship it, escalate.
            raise ValueError("guardrail: unverified CVE/CWE id, escalating to fallback")

        result["choices"][0]["message"]["content"] = cleaned

    except Exception as exc:  # noqa: BLE001 - broad on purpose, see fallback below
        if not FALLBACK_URL:
            raise HTTPException(status_code=502, detail=f"local model failed, no fallback configured: {exc}")
        used_fallback = True
        result = await call_model(FALLBACK_URL, FALLBACK_API_KEY, FALLBACK_MODEL, body)

    result["secugrid_meta"] = {
        "used_fallback": used_fallback,
        "cached": False,
        "ts": time.time(),
    }

    if not used_fallback:
        await redis_client.set(key, json.dumps(result), ex=CACHE_TTL)

    return JSONResponse(result)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
