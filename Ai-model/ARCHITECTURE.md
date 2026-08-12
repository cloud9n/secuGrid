# SecuGrid Local AI Pipeline — Architecture & Plan

## 1. Model strategy

**Base model: Qwen2.5-Coder-7B-Instruct** (fallback: Qwen2.5-Coder-14B-Instruct if GPU budget allows, or 3B for CPU-only boxes).

Why: strongest open code-reasoning model in the 7B class, native long-context (128K), reliable structured-output/tool-calling behavior out of the box, Apache-2.0 license, runs well quantized (GGUF Q4_K_M ≈ 4.5GB VRAM) via vLLM or llama.cpp.

**Approach: hybrid — deterministic scanners + RAG + light LoRA, not full fine-tune.**

- Deterministic scanners (Semgrep, gitleaks, trufflehog, npm-audit/osv-scanner) do the actual finding — never let the LLM invent findings. This alone kills most hallucination risk.
- RAG over CWE/CVE/OWASP corpora grounds remediation text in real advisories.
- LoRA fine-tune (rank 16-32) shapes *output format and tone* — forcing strict JSON schema adherence, consistent severity scoring, concise executive summaries. It is not the source of vulnerability knowledge; the scanners + retrieval are.

Full fine-tune / training-from-scratch is unrealistic and unnecessary — 7B base models already have strong security corpus exposure; the gap is format discipline and hallucination control, which LoRA + constrained decoding solve cheaply.

## 2. Dataset plan

Four task types, one JSONL schema each, all ending in the model emitting the *final* SecuGrid report JSON (see `backend-integration/report-schema.json` at integration time — reuse the existing Prisma-validated schema, don't invent a new one).

| Dataset | Source | Volume target |
|---|---|---|
| URL audit summary | Sanitized past SecuGrid scan outputs (strip customer data) + synthetic scans against OWASP Juice Shop / DVWA / public CTF targets | 1.5-2k examples |
| Repo/code vuln analysis | Semgrep/CodeQL findings on public OSS repos (paired with the *known* fix commit as ground truth remediation) + NVD/GHSA advisories | 3-5k examples |
| Remediation advice | OWASP Cheat Sheet Series, CWE mitigation text, GHSA advisory "patches" sections — paraphrased, never scraped verbatim into training text at length | 2-3k examples |
| Executive summaries | Distilled (by a stronger hosted model, one-time, not at runtime) from the above scan pairs — 3-5 sentence, non-technical | 1-2k examples |

**Safe data creation rules:**
- Every example must originate from a *fixed* or *disclosed* issue (advisory, CVE, merged patch) — never construct a novel exploit path to use as training data.
- No working exploit code, no PoC payloads beyond what's already public in the advisory, no evasion/obfuscation examples.
- Synthetic examples generated against intentionally-vulnerable public training apps (Juice Shop, DVWA, WebGoat) only — never against real third-party targets.
- Dedup + PII scrub pass (regex + presidio) on anything derived from real past SecuGrid scans before it enters the training set.

**Splits:** 80/10/10 train/val/test, stratified by task type and severity so critical-severity cases aren't underrepresented in val/test.

**Anti-hallucination controls:**
- Every training label that cites a CVE/CWE ID must have that ID verified against NVD/CWE at data-build time (script, not manual) — reject examples with unverifiable IDs.
- Add a "no finding" / "insufficient evidence" negative class (~15% of examples) so the model learns to say "not enough evidence to confirm" rather than inventing a CVE when scanner output is ambiguous.
- At inference time, the LLM is *never* the source of a CVE ID — it can only reference CVE/CWE IDs that the deterministic scanner or RAG retrieval actually returned in-context (enforced by prompt + post-hoc regex validator that strips any CVE ID not present in the tool context).

## 3. Fine-tuning recipe

- Method: QLoRA, 4-bit NF4 base, rank=32, alpha=64, dropout=0.05, target modules: q/k/v/o + gate/up/down proj.
- Framework: HuggingFace `trl` SFTTrainer + `peft`.
- Output format target: the exact SecuGrid report JSON schema, enforced via a JSON-schema-constrained loss mask during training (mask loss to 0 on structural tokens, full weight on content tokens) — see `training/train.py`.
- Hyperparameters (practical starting ranges):
  - LR: 1e-4 to 2e-4, cosine schedule, warmup 3%
  - Epochs: 2-3 (watch val loss — this size dataset overfits fast past 3)
  - Effective batch size: 16-32 (via gradient accumulation on single 24GB GPU)
  - Max seq len: 4096 (repo-analysis examples may need 8192)
- Validation gates before promoting a checkpoint:
  - JSON schema pass rate ≥ 98% on val set (jsonschema validator, not eyeballing)
  - Zero unverified CVE/CWE IDs on val set (automated check against NVD/CWE)
  - Remediation grounding: ≥ 90% of remediation sentences must be traceable (via embedding similarity ≥ 0.75) to a retrieved advisory chunk
  - p50 latency ≤ 2s, p95 ≤ 5s at expected concurrency on target hardware

## 4. Inference architecture

- Serve via **vLLM** with `--enable-auto-tool-choice` or **llama.cpp server** (`llama-server`), both expose an **OpenAI-compatible `/v1/chat/completions`** endpoint — SecuGrid's backend needs zero protocol changes, just a base URL swap.
- Structured output enforced with **Outlines/vLLM guided_json** (JSON-schema constrained decoding) — not just prompting. This is the single biggest lever for schema compliance.
- Fallback: if guided-JSON decode fails, or model confidence/logprob is low, or scanner returned zero findings but model wants to claim a finding → route to hosted backup model (existing OpenAI/Gemini call) for that one request, log it for retraining data.
- Caching: hash (repo commit SHA / URL / file diff + scan type) → Redis cache of the full response, TTL 24-72h configurable. Cache key excludes user/session so cache is shared across users scanning the same public repo/URL.
- See `inference-service/` for the proxy implementation (caching + fallback + guardrail layer sitting in front of vLLM).

## 5. SecuGrid integration plan

- New `AIProviderRouter` in the existing Express AI service: tries local model first, falls back to hosted provider on error/timeout/low-confidence, same interface both paths (`generateScanReport(input): Promise<ScanReport>`).
- No change to scan routes, Prisma schema, or report JSON shape — router sits behind the existing AI-call boundary.
- Settings page: add "Local (self-hosted)" as a provider option, set as default; existing OpenAI/Gemini options remain as manual fallback choices.
- New env vars:
  - `LOCAL_AI_BASE_URL` (e.g. `http://localhost:8000/v1`)
  - `LOCAL_AI_MODEL` (e.g. `secugrid-qwen2.5-coder-7b`)
  - `AI_FALLBACK_PROVIDER` (`openai` | `gemini` | `none`)
  - `AI_FALLBACK_ON_ERROR` (bool)
  - `AI_FALLBACK_ON_LOW_CONFIDENCE` (bool)
  - `AI_CACHE_TTL_SECONDS`
- See `backend-integration/aiProviderRouter.ts`.

## 6. Evaluation plan

Test suites (see `eval/eval_harness.py`):
- URL audit validity: N held-out URLs against known-vuln staging targets, assert schema pass + expected finding present
- Repo scan validity: held-out OSS repos with known GHSA advisories, assert finding recall/precision vs. advisory ground truth
- Code audit validity: Semgrep-confirmed findings, assert model doesn't drop or invent severity
- Remediation quality: LLM-judge (hosted model, one-time eval only, not in the serving path) scores 1-5 on actionability + correctness, human-spot-checked sample
- JSON schema compliance: 100% of test set, hard gate

Metrics tracked per run: structured-output success rate, hallucination rate (unverified CVE/CWE per 100 reports), remediation usefulness score, p50/p95 latency, cost per scan (GPU-hour amortized vs. prior API cost).

**Acceptance criteria before rollout:** schema pass ≥ 98%, hallucinated-ID rate = 0 on test set, remediation score ≥ 4.0/5 avg, p95 latency ≤ 5s, cost per scan ≤ 10% of current hosted-API cost.

## What stays risky / uncertain

- LoRA-tuned 7B model's remediation *quality* on novel/unusual vuln classes will lag GPT-4-class hosted models — hybrid fallback is load-bearing, not cosmetic, for edge cases.
- RAG corpus freshness (new CVEs) requires an ongoing ingestion pipeline — this is operational, not one-time.
- Constrained decoding (guided JSON) has a small throughput cost (~10-20%) — budget for it in latency targets.
- Executive-summary tone/quality is the hardest dimension to eval automatically; needs periodic human review.
