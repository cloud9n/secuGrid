# Running the SecuGrid Local AI Pipeline

## Prereqs
- A GPU box: min 12-16GB VRAM for 7B Q4/AWQ inference, 24GB for QLoRA training. No GPU → drop to Qwen2.5-Coder-3B-Instruct and llama.cpp CPU inference (slower, still works).
- Docker + docker-compose, NVIDIA Container Toolkit installed.
- Redis (comes via compose).

## 1. Get the base model
```bash
pip install huggingface_hub
huggingface-cli download Qwen/Qwen2.5-Coder-7B-Instruct --local-dir ./inference-service/models/secugrid-qwen2.5-coder-7b
```
Skip fine-tuning at first — run the base model as-is to validate the pipeline end to end before investing in training data.

## 2. Start the local inference stack
```bash
cd inference-service
# optional, only if you want hosted fallback configured from the start:
export FALLBACK_PROVIDER_URL=https://api.openai.com/v1
export FALLBACK_PROVIDER_API_KEY=sk-...
docker-compose up -d
curl http://localhost:8080/healthz   # {"status":"ok"}
```
This gives you: vLLM on :8000 (raw model), the proxy on :8080 (caching + guardrail + fallback — this is the one SecuGrid talks to), Redis on :6379.

Sanity check it actually answers:
```bash
curl http://localhost:8080/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "secugrid-qwen2.5-coder-7b",
  "messages": [{"role":"user","content":"Say hello in JSON as {\"hello\":\"world\"}"}],
  "response_format": {"type": "json_object"}
}'
```

## 3. Wire it into SecuGrid backend
- Drop `aiProviderRouter.ts` into your existing AI service directory.
- Replace direct OpenAI/Gemini calls in your scan routes with `generateScanReport(...)` from that file.
- Point `ScanReportSchema` import at your real Prisma-validated schema (it's a placeholder `declare` in the file — swap for the real import).
- Copy the vars from `.env.example.additions` into your `.env`:
```
LOCAL_AI_BASE_URL=http://localhost:8080/v1
LOCAL_AI_MODEL=secugrid-qwen2.5-coder-7b
AI_FALLBACK_PROVIDER=openai
```
- Restart the backend. Run one real scan through the dashboard and confirm the report still renders — this is the "does the plumbing work" check, before any fine-tuning.

## 4. Only once step 3 works: build training data and fine-tune
- Build `data/train.jsonl` / `data/val.jsonl` per the schema and sourcing rules in `ARCHITECTURE.md` §2. This is manual/semi-scripted work — collect scanner findings + advisory text + your desired JSON output per example. Start with a few hundred examples, not thousands, to validate the training loop.
- Install training deps: `pip install torch transformers peft trl bitsandbytes datasets`
- Train:
```bash
cd training
python train.py --data ./data/train.jsonl --val ./data/val.jsonl --out ./out --epochs 3
```
- Merge LoRA into a servable model (or serve base+adapter directly if vLLM version supports `--enable-lora`), convert to GGUF/AWQ if quantizing, replace the model directory in `inference-service/models/`, restart `vllm` service.

## 5. Evaluate before flipping the default
```bash
cd eval
pip install jsonschema httpx
python eval_harness.py --endpoint http://localhost:8080/v1 \
  --model secugrid-qwen2.5-coder-7b \
  --test data/test.jsonl --schema report_schema.json
```
Check output against the acceptance criteria in `ARCHITECTURE.md` §6 (schema pass ≥98%, zero hallucinated IDs, p95 ≤5s) before setting local as the default provider for real users — keep hosted fallback on until those numbers hold for a few weeks of real traffic.

## Order of operations, summarized
base model running → wired into backend → validated on real scans → THEN build training data → fine-tune → re-eval → promote.
Don't fine-tune before step 3 works — you'd be debugging two things at once.
