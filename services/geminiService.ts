
import { GoogleGenAI, Type } from "@google/genai";
import { Vulnerability, Severity, ScanReport } from "../types";

// Always create a new GoogleGenAI instance right before making an API call to ensure it uses the latest API key.
// The apiKey must be obtained exclusively from process.env.API_KEY.

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

export const analyzeTarget = async (url: string): Promise<ScanReport> => {
  const modelId = "gemini-3-pro-preview"; 
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Perform a LIVE security assessment of: ${url}
    Use Google Search to fingerprint the domain's tech stack and find relevant CVEs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: LIVE_OSINT_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI agent.");
    return JSON.parse(text) as ScanReport;
  } catch (error) {
    console.error("Analysis Failed:", error);
    throw error;
  }
};

export const simulateAttack = async (url: string, type: 'SQLI' | 'DDOS' | 'STRESS'): Promise<ScanReport> => {
  const modelId = "gemini-3-pro-preview";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Simulate a ${type} attack against ${url}. 
    Based on its infrastructure (detect via OSINT), what are the most likely vulnerabilities?
    - If SQLI: Identify potential injectable parameters.
    - If DDOS: Analyze CDN/Rate-limiting resilience.
    - If STRESS: Estimate breaking point of its cloud infrastructure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: ATTACK_SIM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });
    const text = response.text;
    if (!text) throw new Error("No response from simulation engine.");
    return JSON.parse(text) as ScanReport;
  } catch (error) {
    console.error("Simulation Failed:", error);
    throw error;
  }
};

export const analyzeSourceCode = async (code: string): Promise<ScanReport> => {
  const modelId = "gemini-3-pro-preview"; 
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `PERFORM REAL STATIC CODE ANALYSIS ON THIS SNIPPET:\n\n${code.substring(0, 30000)}`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: SAST_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });
    const text = response.text;
    if (!text) throw new Error("No response from code analysis agent.");
    return JSON.parse(text) as ScanReport;
  } catch (error) {
    console.error("Code Analysis Failed:", error);
    throw error;
  }
};

export const getRemediationAdvice = async (vulnTitle: string, description: string, userQuery: string): Promise<string> => {
  const modelId = "gemini-3-flash-preview";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Vulnerability: ${vulnTitle}\nDescription: ${description}\nUser Query: ${userQuery}`;
  
  try {
     const result = await ai.models.generateContent({
      model: modelId,
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
