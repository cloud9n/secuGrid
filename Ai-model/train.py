"""
QLoRA fine-tune of Qwen2.5-Coder-7B-Instruct for SecuGrid report formatting.

This tunes OUTPUT FORMAT/STYLE (strict JSON, severity scoring, concise
summaries) — it is not the source of vulnerability knowledge. That comes
from deterministic scanners + RAG at inference time (see inference-service/).

Dataset format expected (JSONL, one example per line):
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "tool", "content": "<scanner findings + retrieved advisory text>"},
    {"role": "user", "content": "<scan request>"},
    {"role": "assistant", "content": "<valid SecuGrid report JSON>"}
  ]
}

Run: python train.py --data ./data/train.jsonl --val ./data/val.jsonl --out ./out
"""

import argparse
import json

from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

BASE_MODEL = "Qwen/Qwen2.5-Coder-7B-Instruct"


def build_model_and_tokenizer():
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype="bfloat16",
        bnb_4bit_use_double_quant=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=32,
        lora_alpha=64,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_config)
    return model, tokenizer


def validate_example_labels(path: str) -> None:
    """Reject any example whose assistant turn isn't valid JSON, or whose
    CVE/CWE IDs don't appear verbatim in the tool/context turn — this is the
    anti-hallucination gate on the TRAINING data itself, run before training
    starts, not just at eval time."""
    import re

    id_re = re.compile(r"(CVE-\d{4}-\d{4,7}|CWE-\d{1,4})")
    bad = 0
    with open(path) as f:
        for i, line in enumerate(f):
            ex = json.loads(line)
            msgs = {m["role"]: m["content"] for m in ex["messages"] if m["role"] in ("tool", "assistant")}
            try:
                json.loads(msgs.get("assistant", ""))
            except json.JSONDecodeError:
                bad += 1
                continue
            context_ids = set(id_re.findall(msgs.get("tool", "")))
            assistant_ids = set(id_re.findall(msgs.get("assistant", "")))
            if assistant_ids - context_ids:
                bad += 1
    if bad:
        raise ValueError(f"{bad} training examples failed the anti-hallucination gate in {path} — fix data before training")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--val", required=True)
    parser.add_argument("--out", default="./out")
    parser.add_argument("--epochs", type=float, default=3)
    parser.add_argument("--lr", type=float, default=1.5e-4)
    parser.add_argument("--batch-size", type=int, default=2)
    parser.add_argument("--grad-accum", type=int, default=8)
    args = parser.parse_args()

    validate_example_labels(args.data)
    validate_example_labels(args.val)

    dataset = load_dataset("json", data_files={"train": args.data, "validation": args.val})
    model, tokenizer = build_model_and_tokenizer()

    sft_config = SFTConfig(
        output_dir=args.out,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        max_seq_length=4096,
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=100,
        save_strategy="steps",
        save_steps=100,
        save_total_limit=3,
        bf16=True,
        report_to=["none"],
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        tokenizer=tokenizer,
    )
    trainer.train()
    trainer.save_model(args.out)
    tokenizer.save_pretrained(args.out)


if __name__ == "__main__":
    main()
