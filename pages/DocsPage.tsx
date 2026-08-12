
import React, { useState } from 'react';
import { Book, Terminal, Code, Settings, Github, Zap, Copy, Check, MessageSquare } from 'lucide-react';

const DocsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    { id: 'intro', title: 'Introduction', icon: <Book className="w-4 h-4" /> },
    { id: 'github', title: 'GitHub Integration', icon: <Github className="w-4 h-4" /> },
    { id: 'mcp', title: 'MCP Server Setup', icon: <Zap className="w-4 h-4" /> },
    { id: 'terminal', title: 'CLI Commands', icon: <Terminal className="w-4 h-4" /> },
  ];

  const mcpCode = `import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

const server = new McpServer({
  name: "secugrid",
  version: "1.0.0",
});

server.tool("scan_project", {
  directory: z.string().describe("Absolute path to scan"),
  apiKey: z.string().optional(),
}, async ({ directory, apiKey }) => {
  const key = apiKey || process.env.SECUGRID_API_KEY;
  // Deep scan logic calling SecuGrid API...
  const response = await axios.post("http://localhost:5000/api/scans/cli", {
    codeContent: "...", 
    targetUrl: "mcp-scan"
  }, { headers: { "X-API-KEY": key }});
  return { content: [{ type: "text", text: response.data.summary }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);`;

  const configCode = `{
  "mcpServers": {
    "secugrid": {
      "command": "node",
      "args": ["/path/to/secugrid-mcp.js"],
      "env": {
        "SECUGRID_API_KEY": "sk_secugrid_..."
      }
    }
  }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 px-3">Documentation</h3>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-cyber-800 hover:text-white transition-all text-sm"
            >
              {s.icon}
              {s.title}
            </a>
          ))}
          <hr className="my-6 border-cyber-800" />
          <div className="px-3">
            <div className="bg-cyber-accent/10 border border-cyber-accent/20 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-cyber-accent text-xs font-bold mb-2">
                <Zap className="w-3 h-3" />
                Pro Tip
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Use the MCP server with **Cursor** or **VS Code** to get real-time security fixes as you type.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-20 pb-20">
        <section id="intro">
          <h1 className="text-4xl font-bold text-white mb-6">Welcome to SecuGrid Docs</h1>
          <p className="text-lg text-gray-400 leading-relaxed mb-8">
            SecuGrid is an AI-powered security operations platform designed for modern engineering teams.
            This guide will help you integrate our autonomous agents into your workflow, from repository
            scanning to real-time IDE protection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-cyber-800 p-6 rounded-xl border border-cyber-700">
              <Code className="w-8 h-8 text-cyber-500 mb-4" />
              <h3 className="font-bold text-white mb-2">Code Audits</h3>
              <p className="text-sm text-gray-400">Deep analysis of source code using static and heuristic patterns.</p>
            </div>
            <div className="bg-cyber-800 p-6 rounded-xl border border-cyber-700">
              <Zap className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="font-bold text-white mb-2">MCP Integration</h3>
              <p className="text-sm text-gray-400">Model Context Protocol support for seamless IDE connectivity.</p>
            </div>
          </div>
        </section>

        <section id="github">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Github className="w-6 h-6 text-white" />
            GitHub Integration
          </h2>
          <div className="prose prose-invert max-w-none text-gray-400 space-y-4">
            <p>Connecting your GitHub account allows SecuGrid to scan your private and public repositories automatically.</p>
            <ol className="list-decimal list-inside space-y-3">
              <li>Visit <span className="text-white font-bold"><a target="_blank" href="https://github.com/settings/personal-access-tokens">GitHub</a></span> and create your personal access token</li>
              <li>Navigate to the <span className="text-white font-bold">GitHub Connect</span> tab in the navigation bar.</li>
              <li>Paste your personal access token in the input field and click <span className="text-white font-bold">"Connect GitHub Account"</span>.</li>
              <li>Once connected, browse your repositories and select one to initialize a scan.</li>
              <li>You can view historical scans and ongoing audits in your main dashboard.</li>
            </ol>
          </div>
        </section>

        <section id="mcp">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Zap className="w-6 h-6 text-amber-500" />
              MCP Server Setup
            </h2>
            <div className="bg-cyber-900 border border-cyber-700 px-3 py-1 rounded-full text-[10px] font-bold text-cyber-accent">BETA v1.0.0</div>
          </div>

          <div className="space-y-8 text-gray-400">
            <div>
              <h3 className="text-white font-bold mb-4">Step 1: Generate API Key</h3>
              <p className="mb-4">Go to your <span className="text-cyber-accent cursor-pointer">Settings/Wallet</span> page and generate a new API Key. Keep this safe.</p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Step 2: MCP Server Logic</h3>
              <p className="mb-4">Create a file named <code className="text-white font-mono bg-cyber-800 px-1 rounded">secugrid-mcp.js</code> and paste the following:</p>
              <div className="relative group">
                <pre className="bg-cyber-950 p-6 rounded-xl border border-cyber-700 font-mono text-xs overflow-x-auto text-gray-300">
                  {mcpCode}
                </pre>
                <button
                  onClick={() => copyCode(mcpCode, 'mcp')}
                  className="absolute top-4 right-4 p-2 bg-cyber-800 hover:bg-cyber-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedSection === 'mcp' ? <Check className="w-4 h-4 text-cyber-accent" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4">Step 3: Configure Your IDE</h3>
              <p className="mb-4">Open your IDE's MCP configuration (e.g., Cursor Settings {'>'} MCP) and add the following entry:</p>
              <div className="relative group">
                <pre className="bg-cyber-950 p-6 rounded-xl border border-cyber-700 font-mono text-xs overflow-x-auto text-gray-300">
                  {configCode}
                </pre>
                <button
                  onClick={() => copyCode(configCode, 'config')}
                  className="absolute top-4 right-4 p-2 bg-cyber-800 hover:bg-cyber-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedSection === 'config' ? <Check className="w-4 h-4 text-cyber-accent" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="terminal">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Terminal className="w-6 h-6 text-cyber-accent" />
            CLI Reference
          </h2>
          <div className="space-y-6">
            <div className="prose prose-invert max-w-none text-gray-400">
              <p>The SecuGrid CLI allows you to audit local projects without uploading your entire source code tree. Analysis is performed on-demand via our neural engine.</p>
              <h4 className="text-white text-sm font-bold mt-4">Installation</h4>
              <div className="bg-cyber-950 p-3 rounded-lg border border-cyber-700 font-mono text-xs text-cyber-accent flex justify-between items-center group">
                <code>npm install -g .  # Run inside cli directory</code>
                <button onClick={() => copyCode('npm install -g .', 'inst')} className="opacity-0 group-hover:opacity-100 transition-all">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-4 flex items-center justify-between group">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">SCAN DIRECTORY</div>
                  <code className="text-cyber-accent font-mono text-sm">secugrid scan . --key sk_secugrid_...</code>
                </div>
                <button onClick={() => copyCode('secugrid scan . --key ', 'cli1')} className="p-2 opacity-0 group-hover:opacity-100 transition-all">
                  {copiedSection === 'cli1' ? <Check className="w-4 h-4 text-cyber-accent" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
              <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-4 flex items-center justify-between group">
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-1">EXCLUDE PATTERNS</div>
                  <code className="text-cyber-accent font-mono text-sm">secugrid scan . -e "**/tests/**" "**/logs/**"</code>
                </div>
                <button onClick={() => copyCode('secugrid scan . -e ""', 'cli2')} className="p-2 opacity-0 group-hover:opacity-100 transition-all">
                  {copiedSection === 'cli2' ? <Check className="w-4 h-4 text-cyber-accent" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-20 border-t border-cyber-800 flex justify-between items-center text-gray-500 text-xs">
          <p>© 2024 SecuGrid Corp. Neural Security for Modern Devs.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default DocsPage;
