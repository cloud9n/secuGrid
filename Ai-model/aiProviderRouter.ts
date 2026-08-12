/**
 * AIProviderRouter
 *
 * Drop-in replacement for SecuGrid's current direct OpenAI/Gemini calls.
 * Same public interface (generateScanReport), so scan routes and the
 * Prisma report-write path don't change.
 *
 * Routing: local self-hosted model first (via secugrid-ai-proxy), falls
 * back to the user's configured hosted provider on error, timeout, or a
 * malformed/low-confidence response.
 */

import { z } from "zod";

// Reuse SecuGrid's existing report schema here instead of redefining it —
// import from wherever the current Prisma-validated schema lives, e.g.:
// import { ScanReportSchema } from "../schemas/scanReport";
declare const ScanReportSchema: z.ZodType<unknown>;

export type ScanType = "url_audit" | "repo_scan" | "code_audit";

export interface ScanReportRequest {
  scanType: ScanType;
  target: string; // URL or repo identifier
  scannerFindings: unknown; // raw output from Semgrep/gitleaks/osv-scanner etc.
  contextChunks?: string[]; // RAG-retrieved CWE/CVE/advisory text
}

export interface AIProviderConfig {
  localBaseUrl: string; // LOCAL_AI_BASE_URL
  localModel: string; // LOCAL_AI_MODEL
  fallbackProvider: "openai" | "gemini" | "none";
  fallbackOnError: boolean;
  fallbackOnLowConfidence: boolean;
  requestTimeoutMs: number;
}

export function loadAIProviderConfig(): AIProviderConfig {
  return {
    localBaseUrl: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:8080/v1",
    localModel: process.env.LOCAL_AI_MODEL ?? "secugrid-qwen2.5-coder-7b",
    fallbackProvider: (process.env.AI_FALLBACK_PROVIDER as AIProviderConfig["fallbackProvider"]) ?? "openai",
    fallbackOnError: process.env.AI_FALLBACK_ON_ERROR !== "false",
    fallbackOnLowConfidence: process.env.AI_FALLBACK_ON_LOW_CONFIDENCE !== "false",
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 20000),
  };
}

function buildMessages(req: ScanReportRequest): Array<{ role: string; content: string }> {
  const messages = [
    {
      role: "system",
      content:
        "You are SecuGrid's security analysis assistant. Only reference CVE/CWE IDs that " +
        "appear in the tool context below. Respond with a single JSON object matching the " +
        "SecuGrid scan report schema. Do not include markdown fences or prose outside the JSON.",
    },
  ];

  if (req.contextChunks?.length) {
    messages.push({
      role: "tool",
      content: req.contextChunks.join("\n---\n"),
    });
  }

  messages.push({
    role: "user",
    content: JSON.stringify({ scanType: req.scanType, target: req.target, findings: req.scannerFindings }),
  });

  return messages;
}

async function callChatCompletions(
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string | undefined,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`AI provider responded ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    return data.choices[0].message.content as string;
  } finally {
    clearTimeout(timer);
  }
}

function hostedProviderFor(provider: AIProviderConfig["fallbackProvider"]) {
  switch (provider) {
    case "openai":
      return {
        baseUrl: "https://api.openai.com/v1",
        model: process.env.OPENAI_FALLBACK_MODEL ?? "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
      };
    case "gemini":
      return {
        baseUrl: process.env.GEMINI_OPENAI_COMPAT_URL ?? "",
        model: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-1.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
      };
    default:
      return null;
  }
}

/**
 * Same signature the existing AI service exposes — scan routes call this
 * and don't need to know whether the response came from the local model
 * or the hosted fallback.
 */
export async function generateScanReport(req: ScanReportRequest): Promise<z.infer<typeof ScanReportSchema>> {
  const config = loadAIProviderConfig();
  const messages = buildMessages(req);

  let raw: string | null = null;
  let usedFallback = false;

  try {
    raw = await callChatCompletions(config.localBaseUrl, config.localModel, messages, undefined, config.requestTimeoutMs);
    const parsed = JSON.parse(raw);
    const validated = ScanReportSchema.safeParse(parsed);

    if (!validated.success) {
      if (config.fallbackOnLowConfidence) {
        throw new Error(`local model output failed schema validation: ${validated.error.message}`);
      }
      throw new Error(`local model output failed schema validation and fallback disabled`);
    }

    return validated.data;
  } catch (err) {
    if (!config.fallbackOnError || config.fallbackProvider === "none") {
      throw err;
    }
    const hosted = hostedProviderFor(config.fallbackProvider);
    if (!hosted || !hosted.apiKey) {
      throw new Error(`local model failed and no hosted fallback configured: ${(err as Error).message}`);
    }

    usedFallback = true;
    raw = await callChatCompletions(hosted.baseUrl, hosted.model, messages, hosted.apiKey, config.requestTimeoutMs);
    const parsed = JSON.parse(raw);
    const validated = ScanReportSchema.parse(parsed); // throw if hosted also fails — nothing left to fall back to

    // eslint-disable-next-line no-console
    console.warn(`[ai-provider] scan ${req.target} used hosted fallback (${config.fallbackProvider})`, {
      usedFallback,
    });

    return validated;
  }
}
