"""
SecuGrid local-AI evaluation harness.

Run against the served model (via the proxy's OpenAI-compatible endpoint)
using a held-out test set. Produces the metrics gated in ARCHITECTURE.md
section 6 before rollout is allowed.

Usage:
    python eval_harness.py --endpoint http://localhost:8080/v1 \
        --model secugrid-qwen2.5-coder-7b --test data/test.jsonl \
        --schema report_schema.json
"""

import argparse
import json
import re
import time
from dataclasses import dataclass, field

import httpx
import jsonschema

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}")
CWE_RE = re.compile(r"CWE-\d{1,4}")


@dataclass
class EvalResult:
    total: int = 0
    schema_pass: int = 0
    hallucinated_ids: int = 0
    latencies_ms: list = field(default_factory=list)
    failures: list = field(default_factory=list)

    def summary(self) -> dict:
        n = max(self.total, 1)
        sorted_lat = sorted(self.latencies_ms)
        p50 = sorted_lat[len(sorted_lat) // 2] if sorted_lat else None
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if sorted_lat else None
        return {
            "total": self.total,
            "schema_pass_rate": self.schema_pass / n,
            "hallucinated_ids_per_100_reports": (self.hallucinated_ids / n) * 100,
            "p50_latency_ms": p50,
            "p95_latency_ms": p95,
            "acceptance": {
                "schema_pass_rate_ok": (self.schema_pass / n) >= 0.98,
                "zero_hallucinations_ok": self.hallucinated_ids == 0,
                "p95_latency_ok": (p95 or 0) <= 5000,
            },
        }


def context_ids(messages: list[dict]) -> set[str]:
    ids = set()
    for m in messages:
        if m["role"] in ("tool", "system"):
            ids |= set(CVE_RE.findall(m["content"])) | set(CWE_RE.findall(m["content"]))
    return ids


def run(endpoint: str, model: str, test_path: str, schema_path: str) -> EvalResult:
    with open(schema_path) as f:
        schema = json.load(f)

    result = EvalResult()
    client = httpx.Client(timeout=30)

    with open(test_path) as f:
        for line in f:
            example = json.loads(line)
            messages = [m for m in example["messages"] if m["role"] != "assistant"]
            allowed = context_ids(messages)

            result.total += 1
            start = time.perf_counter()
            try:
                resp = client.post(
                    f"{endpoint}/chat/completions",
                    json={"model": model, "messages": messages, "response_format": {"type": "json_object"}, "temperature": 0.0},
                )
                resp.raise_for_status()
                elapsed_ms = (time.perf_counter() - start) * 1000
                result.latencies_ms.append(elapsed_ms)

                content = resp.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                jsonschema.validate(parsed, schema)
                result.schema_pass += 1

                found_ids = set(CVE_RE.findall(content)) | set(CWE_RE.findall(content))
                unverified = found_ids - allowed
                if unverified:
                    result.hallucinated_ids += len(unverified)
                    result.failures.append({"target": example.get("target"), "unverified_ids": list(unverified)})

            except Exception as exc:  # noqa: BLE001
                result.failures.append({"target": example.get("target"), "error": str(exc)})

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--test", required=True)
    parser.add_argument("--schema", required=True)
    args = parser.parse_args()

    result = run(args.endpoint, args.model, args.test, args.schema)
    print(json.dumps(result.summary(), indent=2))
    if result.failures:
        print(f"\n{len(result.failures)} failures logged (showing first 10):")
        for f in result.failures[:10]:
            print(" -", f)


if __name__ == "__main__":
    main()
