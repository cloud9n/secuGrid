import { GoogleGenAI, Type } from "@google/genai";
import axios from "axios";
import { ScanReport } from "../types";

export type AiProvider = "gemini" | "openai-compatible";

export interface AiConfig {
  provider?: AiProvider;
  model?: string;
}

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const DEFAULT_OPENAI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

const LIVE_OSINT_INSTRUCTION = `
You are SecuGrid Prime, a Senior Security Consultant.
Perform a LIVE PASSIVE RECONNAISSANCE and THREAT MODELING audit.
Use Google Search to find:
1. Technology stack (Server, Frameworks, CMS).
2. Recent CVEs for that stack.
3. Misconfigurations, exposed admin panels, and known data leaks.
Output strict JSON.
`;

const ATTACK_SIM_INSTRUCTION = `
You are an Ethical Hacker simulating a targeted attack (SQLi, DDoS, or XSS).
Analyze the target's public architecture and identify how it would likely behave under the specified attack.
1. Predict failure points.
2. Identify bypassed defenses (e.g., WAF misconfigs).
3. Provide a detailed risk assessment.
Output strict JSON.
`;

const SAST_INSTRUCTION = `
You are a Senior Application Security Engineer performing Static Application Security Testing (SAST).
Analyze the provided SOURCE CODE for REAL vulnerabilities.
1. Identify actual security flaws (SQLi, XSS, Hardcoded Secrets, Logic Bugs, Insecure Deps).
2. Provide fixed code snippets for remediation.
Output strict JSON.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    targetUrl: { type: Type.STRING },
    timestamp: { type: Type.STRING },
    summary: { type: Type.STRING },
    stats: {
      type: Type.OBJECT,
      properties: {
        duration: { type: Type.NUMBER },
        endpointsScanned: { type: Type.NUMBER },
        threatsIdentified: { type: Type.NUMBER },
        securityScore: { type: Type.NUMBER },
      },
      required: ["duration", "endpointsScanned", "threatsIdentified", "securityScore"]
    },
    vulnerabilities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] },
          description: { type: Type.STRING },
          affectedPath: { type: Type.STRING },
          remediation: { type: Type.STRING },
          cveId: { type: Type.STRING },
        },
        required: ["id", "title", "severity", "description", "affectedPath", "remediation"]
      }
    }
  },
  required: ["targetUrl", "timestamp", "stats", "vulnerabilities", "summary"]
};

const normalizeProvider = (provider?: string): AiProvider => {
  if (provider === "openai-compatible") return "openai-compatible";
  return "gemini";
};

const stripCodeFences = (text: string) =>
  text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();

const parseJsonPayload = <T>(text: string): T => {
  const cleaned = stripCodeFences(text);
  return JSON.parse(cleaned) as T;
};

const createGeminiClient = () => new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || ""
});

const generateWithGemini = async (prompt: string, systemInstruction: string, model?: string, useSearch = false) => {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: model || DEFAULT_GEMINI_MODEL,
    contents: prompt,
    config: {
      ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini.");
  }

  return parseJsonPayload<ScanReport>(response.text);
};

const buildOpenAiMessages = (prompt: string, systemInstruction: string) => ([
  { role: "system", content: `${systemInstruction}\nReturn only strict JSON.` },
  { role: "user", content: prompt }
]);

const generateWithOpenAiCompatible = async (prompt: string, systemInstruction: string, model?: string) => {
  const baseURL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error("OpenAI-compatible provider requires AI_BASE_URL and AI_API_KEY.");
  }

  const response = await axios.post(
    `${baseURL.replace(/\/$/, "")}/chat/completions`,
    {
      model: model || DEFAULT_OPENAI_MODEL,
      messages: buildOpenAiMessages(prompt, systemInstruction),
      temperature: 0.2,
      response_format: { type: "json_object" }
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI-compatible provider.");
  }

  return parseJsonPayload<ScanReport>(content);
};

const generateReport = async (
  prompt: string,
  systemInstruction: string,
  config: AiConfig = {},
  useSearch = false
) => {
  const provider = normalizeProvider(config.provider || process.env.AI_PROVIDER);

  if (provider === "openai-compatible") {
    return generateWithOpenAiCompatible(prompt, systemInstruction, config.model);
  }

  return generateWithGemini(prompt, systemInstruction, config.model, useSearch);
};

export const analyzeTarget = async (url: string, config: AiConfig = {}): Promise<ScanReport> => {
  const prompt = `
    Perform a LIVE security assessment of: ${url}
    Use Google Search to fingerprint the domain's tech stack and find relevant CVEs.
  `;

  try {
    return await generateReport(prompt, LIVE_OSINT_INSTRUCTION, config, true);
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};

export const simulateAttack = async (
  url: string,
  type: 'SQLI' | 'DDOS' | 'STRESS',
  config: AiConfig = {}
): Promise<ScanReport> => {
  const prompt = `
    Simulate a ${type} attack against ${url}. 
    Based on its infrastructure (detect via OSINT), what are the most likely vulnerabilities?
    - If SQLI: Identify potential injectable parameters.
    - If DDOS: Analyze CDN/Rate-limiting resilience.
    - If STRESS: Estimate breaking point of its cloud infrastructure.
  `;

  try {
    return await generateReport(prompt, ATTACK_SIM_INSTRUCTION, config, true);
  } catch (error) {
    console.error("Simulation Failed:", error);
    throw error;
  }
};

export const analyzeSourceCode = async (code: string, config: AiConfig = {}): Promise<ScanReport> => {
  const prompt = `PERFORM REAL STATIC CODE ANALYSIS ON THIS SNIPPET:\n\n${code.substring(0, 30000)}`;

  try {
    return await generateReport(prompt, SAST_INSTRUCTION, config, false);
  } catch (error) {
    console.error("Code Analysis Failed:", error);
    throw error;
  }
};

export const getRemediationAdvice = async (
  vulnTitle: string,
  description: string,
  userQuery: string,
  config: AiConfig = {}
): Promise<string> => {
  const prompt = `Vulnerability: ${vulnTitle}\nDescription: ${description}\nUser Query: ${userQuery}`;
  const provider = normalizeProvider(config.provider || process.env.AI_PROVIDER);

  try {
    if (provider === "openai-compatible") {
      const baseURL = process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL;
      const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

      if (!baseURL || !apiKey) {
        throw new Error("OpenAI-compatible provider requires AI_BASE_URL and AI_API_KEY.");
      }

      const response = await axios.post(
        `${baseURL.replace(/\/$/, "")}/chat/completions`,
        {
          model: config.model || DEFAULT_OPENAI_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a senior security engineer. Provide specific, code-centric remediation advice."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      return response.data?.choices?.[0]?.message?.content || "Unable to generate advice.";
    }

    const ai = createGeminiClient();
    const result = await ai.models.generateContent({
      model: config.model || DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are a senior security engineer. Provide specific, code-centric remediation advice."
      }
    });
    return result.text || "Unable to generate advice.";
  } catch (e) {
    return "Unable to connect to remediation assistant.";
  }
};
