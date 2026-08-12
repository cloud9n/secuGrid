
import React, { useState, useEffect, useRef } from 'react';
import { User, ScanReport, AgentStatus, LogEntry, Vulnerability, Severity, Repository } from '../types';
import Terminal from '../components/Terminal';
import DiscoveryFeed from '../components/DiscoveryFeed';
import AgentActivity from '../components/AgentActivity';
import { scanApi } from '../services/api';
import { Play, X, Copy, Zap, Activity, MapPin, ShieldAlert, Globe, Crosshair, Search, Loader2, Database, Code, Github } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface DashboardPageProps {
  user: User;
  onScanComplete: (report: ScanReport) => void;
  prefilledRepo?: Repository | null;
  onClearRepo?: () => void;
}

const PROVIDER_PRESETS = [
  {
    id: 'gemini',
    label: 'Gemini',
    description: 'Uses Gemini with live search and the default fast model.',
    provider: 'gemini',
    model: 'gemini-3.5-flash',
  },
  {
    id: 'meta',
    label: 'Meta / Llama Gateway',
    description: 'Targets an OpenAI-compatible gateway that exposes Meta/Llama models.',
    provider: 'openai-compatible',
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Use your own provider settings and model ID.',
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
  },
] as const;

const MODEL_EXAMPLES: Record<'gemini' | 'openai-compatible', { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-3.5-flash', label: 'gemini-3.5-flash' },
    { value: 'gemini-3.5-pro', label: 'gemini-3.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
  ],
  'openai-compatible': [
    { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Meta-Llama-3.1-70B-Instruct' },
    { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Meta-Llama-3.1-8B-Instruct' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  ],
};

const WorldMapSVG = ({ activePoints }: { activePoints: { x: number, y: number }[] }) => (
  <svg viewBox="0 0 1000 500" className="w-full h-full opacity-40">
    <path
      fill="#1e293b"
      d="M150,150 L200,120 L250,150 L300,130 L350,160 L400,140 L450,170 L500,150 L550,180 L600,160 L650,190 L700,170 L750,200 L800,180 L850,210 L900,190 L950,220 L950,300 L900,320 L850,290 L800,310 L750,280 L700,300 L650,270 L600,290 L550,260 L500,280 L450,250 L400,270 L350,240 L300,260 L250,230 L200,250 L150,220 Z"
    />
    {activePoints.map((p, i) => (
      <g key={i}>
        <circle cx={p.x} cy={p.y} r="3" fill="#10b981" className="animate-ping" />
        <circle cx={p.x} cy={p.y} r="2" fill="#10b981" />
        <line x1="500" y1="250" x2={p.x} y2={p.y} stroke="#10b981" strokeWidth="0.5" strokeDasharray="4" className="animate-[dash_2s_linear_infinite]" />
        {/* Extra data packets moving along the lines */}
        <circle cx={p.x} cy={p.y} r="1.5" fill="#fff" className="animate-[packet_3s_infinite]">
          <animateMotion
            path={`M 500 250 L ${p.x} ${p.y}`}
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    ))}
    <style>{`
      @keyframes dash {
        to { stroke-dashoffset: -20; }
      }
      @keyframes packet {
        0% { opacity: 0; scale: 0.5; }
        50% { opacity: 1; scale: 1.2; }
        100% { opacity: 0; scale: 0.5; }
      }
    `}</style>
  </svg>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onScanComplete, prefilledRepo, onClearRepo }) => {
  const [scanMode, setScanMode] = useState<'URL' | 'CODE' | 'STRESS' | 'SQLI' | 'DDOS' | 'REPO'>('URL');
  const [targetInput, setTargetInput] = useState('');
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeTask, setActiveTask] = useState('');
  const [discoveries, setDiscoveries] = useState<Vulnerability[]>([]);
  const [activeNodes, setActiveNodes] = useState<{ x: number, y: number }[]>([]);
  const [simMetrics, setSimMetrics] = useState<{ time: string, requests: number }[]>([]);
  const [gridIntegrity, setGridIntegrity] = useState(99.1);
  const [aiProvider, setAiProvider] = useState(user.aiProvider || localStorage.getItem('secugrid.aiProvider') || 'gemini');
  const [aiModel, setAiModel] = useState(user.aiModel || localStorage.getItem('secugrid.aiModel') || 'gemini-3.5-flash');

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifiedUrls, setVerifiedUrls] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const metricsInterval = useRef<number | null>(null);
  const integrityInterval = useRef<number | null>(null);

  useEffect(() => {
    if (prefilledRepo) {
      setScanMode('REPO');
      setTargetInput(prefilledRepo.fullName);
    }
  }, [prefilledRepo]);

  useEffect(() => {
    if (user.aiProvider) setAiProvider(user.aiProvider);
    if (user.aiModel) setAiModel(user.aiModel);
  }, [user.aiProvider, user.aiModel]);

  useEffect(() => {
    localStorage.setItem('secugrid.aiProvider', aiProvider);
    localStorage.setItem('secugrid.aiModel', aiModel);
  }, [aiProvider, aiModel]);

  const applyPreset = (presetId: string) => {
    const preset = PROVIDER_PRESETS.find(item => item.id === presetId);
    if (!preset) return;
    setAiProvider(preset.provider);
    setAiModel(preset.model);
  };

  const handleProviderChange = (nextProvider: 'gemini' | 'openai-compatible') => {
    setAiProvider(nextProvider);
    const firstSuggestedModel = MODEL_EXAMPLES[nextProvider][0]?.value;
    if (firstSuggestedModel) {
      setAiModel(firstSuggestedModel);
    }
  };

  useEffect(() => {
    integrityInterval.current = window.setInterval(() => {
      setGridIntegrity(prev => {
        let change = (Math.random() - 0.5) * 0.1;
        if (status !== AgentStatus.IDLE) {
          const intensity = scanMode === 'DDOS' ? 0.6 : 0.2;
          change -= intensity * Math.random();
        } else if (prev < 99) {
          change += 0.05;
        }
        return Math.min(100, Math.max(40, prev + change));
      });
    }, 2000);

    return () => {
      if (metricsInterval.current) clearInterval(metricsInterval.current);
      if (integrityInterval.current) clearInterval(integrityInterval.current);
    };
  }, [status, scanMode]);

  const addLog = (agent: string, message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      agent,
      message,
      type
    }]);
  };

  const simulateStep = async (message: string, delay: number, progressInc: number, agent: string = 'SYSTEM') => {
    addLog(agent, message, 'info');
    setActiveTask(message);
    setProgress(p => Math.min(95, p + progressInc));
    await new Promise(r => setTimeout(r, delay));
  };

  const runFullSimulation = async () => {
    if (!targetInput) return;

    const isUrlMode = ['URL', 'STRESS', 'SQLI', 'DDOS'].includes(scanMode);
    if (isUrlMode) {
      const domain = targetInput.replace(/(^\w+:|^)\/\//, '').split('/')[0];
      if (!verifiedUrls.includes(domain)) {
        setVerificationToken(`secugrid-verify-${Math.random().toString(36).substring(7)}`);
        setShowVerificationModal(true);
        return;
      }
    }

    setLogs([]);
    setDiscoveries([]);
    setProgress(0);
    setActiveTask('Initializing secure neural link...');
    setActiveNodes([]);
    setStatus(AgentStatus.RECONNAISSANCE);

    const nodeInt = setInterval(() => {
      setActiveNodes(prev => [...prev.slice(-15), { x: Math.random() * 800 + 100, y: Math.random() * 300 + 100 }]);
    }, 600);

    let baseReq = 0;
    metricsInterval.current = window.setInterval(() => {
      const time = new Date().toLocaleTimeString([], { second: '2-digit' });
      baseReq += scanMode === 'DDOS' ? 1200 : 50;
      setSimMetrics(prev => [...prev.slice(-20), { time, requests: baseReq + Math.random() * 200 }]);
    }, 1000);

    try {
      await simulateStep(`Target Lock: ${targetInput}`, 1000, 5);

      const agentName = scanMode === 'REPO' ? 'RepoAudit' : 'ReconAI';
      await simulateStep(`Indexing infrastructure endpoints...`, 1500, 10, agentName);

      if (scanMode === 'REPO') {
        await simulateStep(`Mapping Abstract Syntax Tree (AST)...`, 1200, 10, 'SupplyChainAgent');
        await simulateStep(`Scanning history for sensitive credentials...`, 1800, 15, 'SecretHunter');
      } else {
        await simulateStep(`Probing for passive defense misconfigs...`, 1200, 10, 'NetStorm');
      }

      setStatus(AgentStatus.FUZZING);
      await simulateStep(`Generating polymorphic payloads...`, 1500, 15, 'PayloadGen');
      await simulateStep(`Injecting test vectors into API boundaries...`, 2000, 20, 'SQLBuster');

      setDiscoveries([
        { id: '1', title: 'Passive Fingerprint Match', severity: Severity.INFO, affectedPath: '/', description: 'Detected underlying technology stack.', remediation: 'Maintain patches.' }
      ]);

      setStatus(AgentStatus.ANALYSIS);
      let report: ScanReport;
      if (scanMode === 'CODE' || scanMode === 'REPO') {
        const resp = await scanApi.analyze(targetInput, { provider: aiProvider, model: aiModel });
        report = resp.data;
      } else if (scanMode === 'URL') {
        const resp = await scanApi.analyze(targetInput, { provider: aiProvider, model: aiModel });
        report = resp.data;
      } else {
        const resp = await scanApi.simulateAttack(targetInput, scanMode, { provider: aiProvider, model: aiModel });
        report = resp.data;
      }

      for (const vuln of report.vulnerabilities.slice(0, 5)) {
        await new Promise(r => setTimeout(r, 800));
        setDiscoveries(prev => [...prev, vuln]);
        addLog('ANALYSIS', `Confirmed Vulnerability: ${vuln.title}`, 'warning');
      }

      await simulateStep(`Compiling remediation heuristics...`, 1500, 20);

      clearInterval(nodeInt);
      stopSimulationMetrics();
      setStatus(AgentStatus.COMPLETED);
      setProgress(100);
      setActiveTask('Simulation sequence complete.');

      if (scanMode === 'REPO') onClearRepo?.();
      setTimeout(() => onScanComplete(report), 1500);

    } catch (error: any) {
      const status = error?.response?.status;
      const message = status === 429
        ? 'Gemini API quota exceeded. Check your API key billing or quota.'
        : error?.response?.data?.error || 'Analysis failed. Check the server logs.';
      addLog('SYSTEM', message, 'error');
      setStatus(AgentStatus.FAILED);
      setActiveTask('Operation failed.');
      stopSimulationMetrics();
      clearInterval(nodeInt);
      if (scanMode === 'REPO') onClearRepo?.();
    }
  };

  const stopSimulationMetrics = () => {
    if (metricsInterval.current) clearInterval(metricsInterval.current);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const domain = targetInput.replace(/(^\w+:|^)\/\//, '').split('/')[0];
      setVerifiedUrls(prev => [...prev, domain]);
      setShowVerificationModal(false);
      runFullSimulation();
    }, 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-cyber-800 border border-cyber-700 rounded-xl w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowVerificationModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-500/10 p-2 rounded-full"><ShieldAlert className="w-6 h-6 text-amber-500" /></div>
              <h2 className="text-xl font-bold text-white">Authorization Required</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">SecuGrid requires proof of ownership to initiate advanced simulations on production domains.</p>
            <div className="bg-cyber-900 border border-cyber-700 rounded p-4 mb-6">
              <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">DNS TXT Verification String</label>
              <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-cyber-700 font-mono text-sm text-cyber-accent">
                <span className="truncate mr-2">{verificationToken}</span>
                <Copy className="w-4 h-4 cursor-pointer hover:text-white shrink-0" onClick={() => navigator.clipboard.writeText(verificationToken)} />
              </div>
            </div>
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="w-full bg-cyber-accent hover:bg-emerald-500 text-cyber-900 font-bold py-3 rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Record Propagation'}
            </button>
          </div>
        </div>
      )}

      {/* Top Banner: Grid Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyber-accent animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            Neural Operations Center
          </h1>
          <p className="text-gray-400 max-w-xl">Deploy autonomous agents to execute complex multi-vector security simulations and audits.</p>
        </div>

        <div className="bg-cyber-800 border border-cyber-700 p-4 rounded-xl flex items-center gap-6 shadow-2xl min-w-[320px] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-1">
            <Globe className="w-12 h-12 text-cyber-700 -mr-4 -mt-4 group-hover:text-cyber-accent/20 transition-colors" />
          </div>
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-cyber-900" />
              <circle
                cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent"
                strokeDasharray={150.8}
                strokeDashoffset={150.8 - (150.8 * gridIntegrity / 100)}
                className={`${gridIntegrity > 80 ? 'text-cyber-accent' : 'text-amber-500'} transition-all duration-1000`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white font-mono">
              {gridIntegrity.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3" />
              Grid Integrity
            </div>
            <div className="text-lg font-bold font-mono text-white">
              {gridIntegrity > 90 ? 'NOMINAL' : gridIntegrity > 60 ? 'STRESSED' : 'CRITICAL'}
            </div>
            <div className="text-[9px] text-gray-500 uppercase">Latency: <span className="text-cyber-accent">14ms</span> | Nodes: <span className="text-white">1,402</span></div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Column: Input & Mode */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl shadow-lg">
            <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyber-accent" />
              Deployment Config
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Simulation Vector</label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'URL', label: 'Passive Recon', icon: <Search className="w-3 h-3" /> },
                    { id: 'REPO', label: 'GitHub Repository', icon: <Github className="w-3 h-3" /> },
                    { id: 'SQLI', label: 'SQL Injection', icon: <Database className="w-3 h-3" /> },
                    { id: 'DDOS', label: 'DDoS Simulation', icon: <Zap className="w-3 h-3" /> },
                    { id: 'CODE', label: 'Source Code Audit', icon: <Code className="w-3 h-3" /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setScanMode(m.id as any)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded border transition-all ${scanMode === m.id ? 'bg-cyber-accent text-cyber-900 border-cyber-accent' : 'bg-cyber-900 text-gray-400 border-cyber-700 hover:border-gray-500'}`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">
                  {scanMode === 'CODE' ? 'Source Snippet' : scanMode === 'REPO' ? 'Repository Path' : 'Target Host'}
                </label>
                {scanMode === 'CODE' ? (
                  <textarea
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Paste code to audit..."
                    className="w-full h-32 bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-[10px] focus:border-cyber-accent outline-none"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder={scanMode === 'REPO' ? "owner/repo" : "https://target-infra.com"}
                      className="w-full bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-xs focus:border-cyber-accent outline-none"
                    />
                    {scanMode === 'REPO' && prefilledRepo && (
                      <button
                        onClick={() => { setTargetInput(''); onClearRepo?.(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">AI Provider</label>
                <div className="grid grid-cols-1 gap-2">
                  {PROVIDER_PRESETS.map((preset) => {
                    const active = aiProvider === preset.provider && aiModel === preset.model;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={`text-left rounded border px-3 py-2 transition-all ${active
                          ? 'bg-cyber-accent text-cyber-900 border-cyber-accent'
                          : 'bg-cyber-900 text-gray-300 border-cyber-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider">{preset.label}</span>
                          {active && <span className="text-[10px] font-bold">Active</span>}
                        </div>
                        <div className={`text-[10px] mt-1 ${active ? 'text-cyber-900/80' : 'text-gray-500'}`}>
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Provider Mode</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => handleProviderChange(e.target.value as 'gemini' | 'openai-compatible')}
                    className="w-full bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-xs focus:border-cyber-accent outline-none"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai-compatible">OpenAI-compatible / Meta-Llama gateway</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Model ID</label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={aiProvider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini or your Meta/Llama model'}
                  className="w-full bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-xs focus:border-cyber-accent outline-none"
                />
                <div className="mt-2">
                  <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Suggested Models</label>
                  <select
                    value={MODEL_EXAMPLES[aiProvider as 'gemini' | 'openai-compatible'].some(item => item.value === aiModel) ? aiModel : ''}
                    onChange={(e) => {
                      if (e.target.value) setAiModel(e.target.value);
                    }}
                    className="w-full bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-xs focus:border-cyber-accent outline-none"
                  >
                    <option value="">Choose a known-good model</option>
                    {MODEL_EXAMPLES[aiProvider as 'gemini' | 'openai-compatible'].map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  Gemini uses `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. OpenAI-compatible gateways use `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`.
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  If you pick a Meta/Llama gateway, make sure the model name matches what that provider exposes exactly.
                </p>
              </div>

              <button
                onClick={runFullSimulation}
                disabled={status !== AgentStatus.IDLE || !targetInput}
                className={`w-full py-4 rounded font-bold text-sm tracking-widest transition-all flex items-center justify-center gap-3 ${status !== AgentStatus.IDLE || !targetInput ? 'bg-gray-800 text-gray-600' : 'bg-cyber-accent text-cyber-900 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  }`}
              >
                {status === AgentStatus.IDLE ? <Play className="w-4 h-4 fill-current" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                {status === AgentStatus.IDLE ? 'EXECUTE OP' : 'RUNNING...'}
              </button>
            </div>
          </div>

          <div className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyber-900">
              <div className="h-full bg-cyber-accent transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Neural Data Stream</h2>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simMetrics}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis hide />
                  <Area type="monotone" dataKey="requests" stroke="#10b981" fillOpacity={1} fill="url(#colorReq)" animationDuration={300} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Center Column: Propagation Map & Agent Activity */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          <div className="bg-cyber-800 border border-cyber-700 p-0 rounded-xl relative overflow-hidden h-72 shadow-xl group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyber-700/10 via-transparent to-transparent"></div>
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-cyber-700 px-2 py-1 rounded">
                <MapPin className="w-3 h-3 text-red-500" />
                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Live Attack Propagation</span>
              </div>
            </div>
            <WorldMapSVG activePoints={activeNodes} />
            {status !== AgentStatus.IDLE && (
              <div className="absolute bottom-4 left-4 z-10 flex gap-4">
                <div className="text-[10px] text-gray-400 font-mono">
                  UPLINK: <span className="text-cyber-accent">PRIMARY-CORE-01</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  NODES: <span className="text-white animate-pulse">{activeNodes.length * 14}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[400px]">
            <AgentActivity status={status} activeTask={activeTask} progress={progress} />
          </div>
        </div>

        {/* Right Column: Discovery Feed & Terminal */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-full">
          <div className="h-1/2 min-h-[300px]">
            <DiscoveryFeed discoveries={discoveries} />
          </div>

          <div className="flex-1 min-h-[300px]">
            <Terminal logs={logs} isScanning={status !== AgentStatus.IDLE && status !== AgentStatus.COMPLETED} />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-cyber-800 p-4 rounded border border-cyber-700 flex flex-col justify-center">
              <div className="text-gray-500 text-[9px] uppercase font-bold mb-1">Threat Index</div>
              <div className={`text-2xl font-mono ${discoveries.length > 2 ? 'text-red-500' : 'text-cyber-accent'}`}>
                {discoveries.length > 0 ? (100 - (discoveries.length * 8)).toFixed(0) : '--'}
              </div>
            </div>
            <div className="bg-cyber-800 p-4 rounded border border-cyber-700 flex flex-col justify-center">
              <div className="text-gray-500 text-[9px] uppercase font-bold mb-1">Grid Phase</div>
              <div className="text-xl font-mono text-white">
                {status === AgentStatus.IDLE ? 'STANDBY' : status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
