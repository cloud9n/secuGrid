
import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// Create an MCP server
const server = new McpServer({
    name: "secugrid",
    version: "1.0.0",
});

const API_URL = process.env.SECUGRID_API_URL || "http://localhost:5000/api";

// Tool to scan a project directory
server.tool(
    "scan_project",
    {
        directory: z.string().describe("The absolute path to the project directory to scan"),
        apiKey: z.string().optional().describe("SecuGrid API Key (falls back to env var)"),
    },
    async ({ directory, apiKey }) => {
        const key = apiKey || process.env.SECUGRID_API_KEY;
        if (!key) {
            return {
                content: [{ type: "text", text: "Error: No API key provided. Set SECUGRID_API_KEY env var or provide it as an argument." }],
                isError: true,
            };
        }

        try {
            const absoluteDir = path.resolve(directory);
            if (!fs.existsSync(absoluteDir)) {
                return { content: [{ type: "text", text: `Error: Directory ${absoluteDir} does not exist.` }], isError: true };
            }

            // Find all source files (excluding common ignore patterns)
            const files = await glob("**/*.{ts,tsx,js,jsx,py,go,java,c,cpp,php}", {
                cwd: absoluteDir,
                ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
                absolute: true,
            });

            if (files.length === 0) {
                return { content: [{ type: "text", text: "No supported source files found to scan." }] };
            }

            // Read a sample of files (limiting to avoid payload size issues)
            const filesToRead = files.slice(0, 30);
            let combinedContent = "";
            for (const file of filesToRead) {
                const content = fs.readFileSync(file, "utf-8");
                const relativePath = path.relative(absoluteDir, file);
                combinedContent += `\n--- FILE: ${relativePath} ---\n${content}\n`;
            }

            // Call SecuGrid Backend
            const response = await axios.post(`${API_URL}/scans/cli`, {
                codeContent: combinedContent,
                targetUrl: `mcp://${path.basename(absoluteDir)}`
            }, {
                headers: { "X-API-KEY": key }
            });

            const report = response.data;

            // Format the result for the AI
            let resultText = `=== SecuGrid Audit Report for ${report.targetUrl} ===\n`;
            resultText += `Security Score: ${report.stats.securityScore}/100\n`;
            resultText += `Threats Identified: ${report.stats.threatsIdentified}\n\n`;

            if (report.vulnerabilities.length === 0) {
                resultText += "✔ No critical vulnerabilities found.";
            } else {
                report.vulnerabilities.forEach((v, i) => {
                    resultText += `${i + 1}. [${v.severity}] ${v.title}\n`;
                    resultText += `   Description: ${v.description}\n`;
                    resultText += `   Remediation: ${v.remediation}\n\n`;
                });
            }

            return {
                content: [{ type: "text", text: resultText }],
            };
        } catch (error) {
            const msg = error.response?.data?.error || error.message;
            return {
                content: [{ type: "text", text: `Scan failed: ${msg}` }],
                isError: true,
            };
        }
    }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("SecuGrid MCP server running on stdio");
