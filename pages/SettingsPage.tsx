import React, { useState, useEffect, useRef } from 'react';
import { User, ScanReport } from '../types';
import { ShieldCheck, Zap, User as UserIcon, Copy, Loader2, Clock, Calendar, AlertTriangle, ChevronRight, Activity, Key, Plus, Eye, EyeOff, Check, Trash2, Cpu } from 'lucide-react';
import { scanApi, userApi } from '../services/api';

interface SettingsPageProps {
    user: User;
    onAddCredits: (amount: number) => void;
    onGenerateKey: () => void;
    onDeleteKey: (id: string) => void;
    onViewHistory: () => void;
    onViewReport: (report: ScanReport) => void;
    onUpdateUser: (updates: Partial<User>) => void;
}

const PROVIDER_PRESETS = [
    {
        id: 'gemini',
        label: 'Gemini',
        description: 'Fast default with live search support.',
        provider: 'gemini',
        model: 'gemini-3.5-flash',
    },
    {
        id: 'meta',
        label: 'Meta / Llama Gateway',
        description: 'OpenAI-compatible gateway for Meta/Llama models.',
        provider: 'openai-compatible',
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    },
    {
        id: 'custom',
        label: 'Custom',
        description: 'Bring your own provider and model name.',
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

const mapScanToReport = (scan: any): ScanReport => ({
    targetUrl: scan.targetUrl,
    timestamp: scan.timestamp,
    vulnerabilities: scan.vulnerabilities,
    summary: scan.summary,
    stats: {
        duration: scan.duration,
        endpointsScanned: scan.endpointsScanned,
        threatsIdentified: scan.threatsIdentified,
        securityScore: scan.securityScore
    }
});

const SettingsPage: React.FC<SettingsPageProps> = ({
    user,
    onAddCredits,
    onGenerateKey,
    onDeleteKey,
    onViewHistory,
    onViewReport,
    onUpdateUser
}) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [recentScans, setRecentScans] = useState<ScanReport[]>([]);
    const [loadingScans, setLoadingScans] = useState(true);
    const [aiProvider, setAiProvider] = useState(localStorage.getItem('secugrid.aiProvider') || user.aiProvider || 'gemini');
    const [aiModel, setAiModel] = useState(localStorage.getItem('secugrid.aiModel') || user.aiModel || 'gemini-3.5-flash');
    const [savingPreferences, setSavingPreferences] = useState(false);
    const hydratedPreferences = useRef(false);

    useEffect(() => {
        const fetchRecentScans = async () => {
            try {
                const response = await scanApi.getHistory(3);
                setRecentScans(response.data.map(mapScanToReport));
            } catch (error) {
                console.error('Failed to fetch recent scans', error);
            } finally {
                setLoadingScans(false);
            }
        };
        if (user) {
            fetchRecentScans();
        }
    }, [user]);

    useEffect(() => {
        if (user.aiProvider) {
            setAiProvider(user.aiProvider);
        }
        if (user.aiModel) {
            setAiModel(user.aiModel);
        }
        if (user.aiProvider || user.aiModel) {
            hydratedPreferences.current = true;
        }
    }, [user.aiProvider, user.aiModel]);

    useEffect(() => {
        localStorage.setItem('secugrid.aiProvider', aiProvider);
        localStorage.setItem('secugrid.aiModel', aiModel);

        if (!hydratedPreferences.current) return;

        const timer = window.setTimeout(async () => {
            try {
                setSavingPreferences(true);
                const response = await userApi.updatePreferences({ aiProvider, aiModel });
                onUpdateUser(response.data);
            } catch (error) {
                console.error('Failed to save AI preferences', error);
            } finally {
                setSavingPreferences(false);
            }
        }, 500);

        return () => window.clearTimeout(timer);
    }, [aiProvider, aiModel, onUpdateUser]);

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

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const toggleVisibility = (id: string) => {
        setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-12 animate-in fade-in duration-500">
            <section>
                <div className="flex items-center gap-3 mb-8">
                    <Cpu className="w-8 h-8 text-cyber-accent" />
                    <h2 className="text-3xl font-bold text-white">AI Preferences</h2>
                </div>

                <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-8 space-y-6">
                    <p className="text-gray-400 max-w-2xl">
                        Pick the model backend you want SecuGrid to use for scans and remediation. The choice is saved locally and shared with the dashboard.
                    </p>
                    <div className="text-[10px] text-gray-500">
                        {savingPreferences ? 'Saving to your account...' : 'Changes auto-save to your account after a short pause.'}
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                        {PROVIDER_PRESETS.map((preset) => {
                            const active = aiProvider === preset.provider && aiModel === preset.model;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyPreset(preset.id)}
                                    className={`text-left rounded-xl border p-4 transition-all ${active
                                        ? 'bg-cyber-accent text-cyber-900 border-cyber-accent'
                                        : 'bg-cyber-900 text-gray-300 border-cyber-700 hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider">{preset.label}</span>
                                        {active && <span className="text-[10px] font-bold">Active</span>}
                                    </div>
                                    <div className={`text-[10px] mt-2 ${active ? 'text-cyber-900/80' : 'text-gray-500'}`}>
                                        {preset.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Provider</label>
                            <select
                                value={aiProvider}
                                onChange={(e) => handleProviderChange(e.target.value as 'gemini' | 'openai-compatible')}
                                className="w-full bg-cyber-950 border border-cyber-700 rounded p-2 text-white font-mono text-xs focus:border-cyber-accent outline-none"
                            >
                                <option value="gemini">Gemini</option>
                                <option value="openai-compatible">OpenAI-compatible / Meta-Llama gateway</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Model</label>
                            <input
                                type="text"
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                placeholder={aiProvider === 'gemini' ? 'gemini-3.5-flash' : 'meta-llama/Meta-Llama-3.1-70B-Instruct'}
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
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-8">
                    <UserIcon className="w-8 h-8 text-cyber-accent" />
                    <h2 className="text-3xl font-bold text-white">User Profile</h2>
                </div>
                <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="w-24 h-24 bg-cyber-900 rounded-full flex items-center justify-center border-2 border-cyber-accent shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <UserIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left w-full">
                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Agent Identity</label>
                            <div className="text-2xl font-bold text-white font-mono">{user.email}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Agent ID</label>
                                <div className="text-sm text-gray-300 font-mono bg-cyber-900 p-2 rounded border border-cyber-700 flex items-center justify-between group">
                                    <span className="truncate">{user.id}</span>
                                    <Copy onClick={() => copyKey(user.id)} className="w-3 h-3 text-gray-500 cursor-pointer hover:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Clearance Level</label>
                                <div className="text-sm text-cyber-accent font-bold font-mono p-2">LEVEL 1 OPERATOR</div>
                            </div>
                            {user.createdAt && (
                                <div>
                                    <label className="text-xs text-gray-500 uppercase tracking-widest font-bold">Commissioned Date</label>
                                    <div className="text-sm text-gray-300 font-mono p-2">{new Date(user.createdAt).toLocaleDateString()}</div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-cyber-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-cyber-accent" />
                                    Recent Scans
                                </h3>
                                <button onClick={onViewHistory} className="text-xs text-cyber-accent hover:text-white flex items-center gap-1 transition-colors">
                                    View All History <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            {loadingScans ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
                            ) : recentScans.length === 0 ? (
                                <div className="text-xs text-gray-500 italic p-2">No scans recorded yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {recentScans.map((scan, i) => (
                                        <div
                                            key={i}
                                            onClick={() => onViewReport(scan)}
                                            className="bg-cyber-900/50 border border-cyber-700/50 rounded p-3 hover:bg-cyber-700/50 hover:border-cyber-accent/50 cursor-pointer transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white group-hover:text-cyber-accent transition-colors">{scan.targetUrl}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                    <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span className={scan.stats.securityScore > 80 ? 'text-green-500' : 'text-amber-500'}>Score: {scan.stats.securityScore}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="w-8 h-8 text-cyber-accent" />
                    <h2 className="text-3xl font-bold text-white">Resource Management</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Zap className="w-20 h-20" />
                        </div>
                        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Neural Computing Balance</h3>
                        <div className="text-5xl font-mono text-cyber-accent mb-4 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                            {user.credits} <span className="text-xl text-gray-500">CREDITS</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Credits power SecuGrid's specialized AI models for deep infrastructure simulation.
                            1 Credit = 1 Comprehensive Vulnerability Audit.
                        </p>
                    </div>
                    <div className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl">
                        <h3 className="text-gray-400 uppercase text-sm tracking-wider mb-4">Uplink Resource Allocation</h3>
                        <div className="space-y-3">
                            {[
                                { amount: 10, price: '$99', desc: 'Tactical Recon Pack' },
                                { amount: 50, price: '$399', desc: 'Professional Ops Cluster' },
                                { amount: 100, price: '$699', desc: 'Enterprise Mesh Access' },
                            ].map((pkg) => (
                                <button
                                    key={pkg.amount}
                                    onClick={() => onAddCredits(pkg.amount)}
                                    className="w-full flex justify-between items-center bg-cyber-900 hover:bg-cyber-700 border border-cyber-700 p-4 rounded-xl transition-all group"
                                >
                                    <div className="text-left">
                                        <div className="font-mono text-white group-hover:text-cyber-accent transition-colors">+{pkg.amount} Credits</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{pkg.desc}</div>
                                    </div>
                                    <span className="text-white font-bold px-3 py-1 bg-cyber-800 rounded border border-cyber-700 group-hover:border-cyber-accent transition-all">
                                        {pkg.price}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-cyber-800 rounded-lg border border-cyber-700">
                        <Key className="w-6 h-6 text-cyber-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">API Access Keys</h2>
                </div>

                <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-gray-400 max-w-xl">
                            Manage API keys for programmatic access to the SecuGrid Neural Engine.
                            <span className="text-red-400 block mt-1">Warning: Keys grant full account access. Keep them secure.</span>
                        </p>
                        <button
                            onClick={onGenerateKey}
                            className="bg-cyber-accent text-cyber-900 font-bold px-4 py-2 rounded flex items-center gap-2 hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            <Plus className="w-4 h-4" />
                            Generate New Key
                        </button>
                    </div>

                    {user.apiKeys && user.apiKeys.length > 0 ? (
                        <div className="space-y-3">
                            {user.apiKeys.map((key) => (
                                <div key={key.id} className="bg-cyber-900 border border-cyber-700 rounded-lg p-4 flex items-center justify-between group hover:border-cyber-500 transition-all">
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="p-2 bg-cyber-800 rounded">
                                            <Key className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 font-mono text-sm text-white">
                                                {visibleKeys[key.id] ? key.key : 'sk_secugrid_••••••••••••••••'}
                                                <button onClick={() => toggleVisibility(key.id)} className="text-gray-500 hover:text-white ml-2">
                                                    {visibleKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1">Created: {new Date(key.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyKey(key.key)}
                                            className="p-2 hover:bg-cyber-800 rounded text-gray-400 hover:text-white transition-colors"
                                            title="Copy Key"
                                        >
                                            {copiedKey === key.key ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => onDeleteKey(key.id)}
                                            className="p-2 hover:bg-red-500/10 rounded text-gray-400 hover:text-red-500 transition-colors"
                                            title="Revoke Key"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border border-cyber-700 border-dashed rounded-lg">
                            <Key className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No active API keys found.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default SettingsPage;
