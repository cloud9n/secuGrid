
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import AgentStatusPage from './pages/AgentStatusPage';
import GithubConnectPage from './pages/GithubConnectPage';
import DocsPage from './pages/DocsPage';
import { Loader2, Key, Trash2, Copy, Check, Clock, Plus, Eye, EyeOff, ShieldCheck, Zap } from 'lucide-react';
import { authApi, userApi, scanApi, paymentApi } from './services/api';

declare const PaystackPop: any;

const AuthView: React.FC<{ onAuth: (data: { token: string; user: User }) => void }> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = isLogin
        ? await authApi.login({ email, password })
        : await authApi.register({ email, password });

      localStorage.setItem('token', response.data.token);
      onAuth(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-cyber-800 border border-cyber-700 p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Secure Access Terminal' : 'Agent Commissioning'}
        </h2>
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Agent Identity</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@secugrid.ai"
              className="w-full bg-cyber-900 border border-cyber-700 rounded p-2 text-white focus:border-cyber-accent outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Access Token</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-cyber-900 border border-cyber-700 rounded p-2 text-white focus:border-cyber-accent outline-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-cyber-accent hover:bg-emerald-600 disabled:opacity-50 text-cyber-900 font-bold py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? 'Authenticate Agent' : 'Register New Agent'}
          </button>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-gray-400 text-sm hover:text-white transition-colors"
          >
            {isLogin ? "New agent? Request access" : "Already registered? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsView: React.FC<{
  user: User,
  onAddCredits: (amount: number) => void,
  onGenerateKey: () => void,
  onDeleteKey: (id: string) => void
}> = ({ user, onAddCredits, onGenerateKey, onDeleteKey }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-12">
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
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">API Infrastructure</h2>
            <p className="text-gray-400 max-w-lg">
              Manage cryptographic keys for IDE integration, CI/CD pipelines, and Model Context Protocol (MCP) servers.
            </p>
          </div>
          <button
            onClick={onGenerateKey}
            className="flex items-center justify-center gap-2 bg-cyber-accent text-cyber-900 font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Provision New Key
          </button>
        </div>

        <div className="space-y-4">
          {!user.apiKeys || user.apiKeys.length === 0 ? (
            <div className="bg-cyber-800 border border-cyber-700 border-dashed rounded-xl p-16 text-center">
              <Key className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <div className="text-gray-500 font-bold mb-1 uppercase tracking-widest">No Active Credentials</div>
              <p className="text-gray-600 text-sm">Initialize a new key to begin integrating SecuGrid into your local development workflow.</p>
            </div>
          ) : (
            user.apiKeys.map(apiKey => (
              <div key={apiKey.id} className="bg-cyber-800 border border-cyber-700 rounded-xl p-5 flex items-center justify-between group hover:border-cyber-500 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-cyber-900 rounded-xl flex items-center justify-center text-cyber-500 border border-cyber-700">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-white tracking-widest bg-black/30 px-3 py-1 rounded border border-cyber-700">
                        {visibleKeys[apiKey.id] ? apiKey.key : `${apiKey.key.substring(0, 12)}••••••••••••••••`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleVisibility(apiKey.id)}
                          className="text-gray-500 hover:text-white p-1 transition-colors"
                          title={visibleKeys[apiKey.id] ? "Hide Key" : "Show Key"}
                        >
                          {visibleKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyKey(apiKey.key)}
                          className="text-gray-500 hover:text-cyber-accent p-1 transition-colors"
                          title="Copy to Clipboard"
                        >
                          {copiedKey === apiKey.key ? <Check className="w-4 h-4 text-cyber-accent" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1.5 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        Issued: {new Date(apiKey.createdAt).toLocaleString()}
                      </span>
                      {apiKey.lastUsed && (
                        <span className="text-[10px] text-cyber-accent uppercase flex items-center gap-1.5 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          Validated: {new Date(apiKey.lastUsed).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to revoke this credential? All connected MCP servers will lose access immediately.')) {
                        onDeleteKey(apiKey.id);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    REVOKE ACCESS
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default function App() {
  const [page, setPage] = useState<string>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [currentReport, setCurrentReport] = useState<ScanReport | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await userApi.getProfile();
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('token');
        }
      }
    };
    fetchProfile();
  }, []);

  const handleAuth = (data: { token: string; user: User }) => {
    setUser(data.user);
    setPage('dashboard');
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const handleGenerateKey = async () => {
    if (!user) return;
    const newKeyString = `sk_secugrid_${Math.random().toString(36).substring(2)}`;
    try {
      const response = await userApi.addApiKey(newKeyString);
      setUser({ ...user, apiKeys: [response.data, ...user.apiKeys] });
    } catch (err) {
      console.error('Failed to generate key', err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!user) return;
    try {
      await userApi.deleteApiKey(id);
      setUser({ ...user, apiKeys: user.apiKeys.filter(k => k.id !== id) });
    } catch (err) {
      console.error('Failed to delete key', err);
    }
  };

  const handleScanComplete = async (report: ScanReport) => {
    setCurrentReport(report);
    if (user) {
      try {
        await scanApi.saveScan({
          targetUrl: report.targetUrl,
          duration: report.stats.duration,
          endpointsScanned: report.stats.endpointsScanned,
          threatsIdentified: report.stats.threatsIdentified,
          securityScore: report.stats.securityScore,
          summary: report.summary,
          vulnerabilities: report.vulnerabilities
        });
        const profileResponse = await userApi.getProfile();
        setUser(profileResponse.data);
      } catch (err) {
        console.error('Failed to save scan', err);
      }
    }
    setPage('report');
  };

  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setPage('dashboard');
  };

  const handleAddCredits = async (amount: number) => {
    if (!user) return;

    // Simple pricing: $10 for 10 credits, $40 for 50, $70 for 100
    const priceMap: Record<number, number> = { 10: 10, 50: 40, 100: 70 };
    const price = priceMap[amount] || amount;

    try {
      const initResponse = await paymentApi.initialize(price, amount);
      const { reference } = initResponse.data;

      const handler = PaystackPop.setup({
        key: 'pk_test_your_public_key', // Replace with your actual public key
        email: user.email,
        amount: price * 100 * 1500, // Assuming NGN and 1500 rate for demo
        currency: 'NGN',
        ref: reference,
        callback: async (response: any) => {
          try {
            const verifyResponse = await paymentApi.verify(response.reference);
            if (verifyResponse.data.status === 'success') {
              const profileResponse = await userApi.getProfile();
              setUser(profileResponse.data);
              alert(`${amount} credits successfully added to your account!`);
            }
          } catch (err) {
            console.error('Verification failed', err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        onClose: () => {
          console.log('Payment window closed');
        }
      });
      handler.openIframe();
    } catch (err) {
      console.error('Payment initialization failed', err);
      alert('Could not initialize payment. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-cyber-900 text-gray-200 font-sans selection:bg-cyber-accent selection:text-cyber-900">
      <Navbar user={user} onNavigate={setPage} currentPage={page} />

      <main className="animate-in fade-in duration-500">
        {page === 'landing' && <LandingPage onStart={() => setPage(user ? 'dashboard' : 'login')} />}
        {page === 'login' && <AuthView onAuth={handleAuth} />}
        {page === 'docs' && <DocsPage />}
        {page === 'dashboard' && user && (
          <DashboardPage
            user={user}
            onScanComplete={handleScanComplete}
            prefilledRepo={selectedRepo}
            onClearRepo={() => setSelectedRepo(null)}
          />
        )}
        {page === 'github' && user && (
          <GithubConnectPage
            user={user}
            onUpdateUser={handleUpdateUser}
            onSelectRepo={handleSelectRepo}
          />
        )}
        {page === 'report' && currentReport && (
          <ReportPage
            report={currentReport}
            onBack={() => setPage('dashboard')}
          />
        )}
        {page === 'status' && user && <AgentStatusPage />}
        {page === 'settings' && user && (
          <SettingsView
            user={user}
            onAddCredits={handleAddCredits}
            onGenerateKey={handleGenerateKey}
            onDeleteKey={handleDeleteKey}
          />
        )}
      </main>
    </div>
  );
}
