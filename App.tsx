
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import AgentStatusPage from './pages/AgentStatusPage';
import GithubConnectPage from './pages/GithubConnectPage';
import DocsPage from './pages/DocsPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import { Loader2, Key, Trash2, Copy, Check, Clock, Plus, Eye, EyeOff, ShieldCheck, Zap, User as UserIcon } from 'lucide-react';
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
          <SettingsPage
            user={user}
            onAddCredits={handleAddCredits}
            onGenerateKey={handleGenerateKey}
            onDeleteKey={handleDeleteKey}
            onViewHistory={() => setPage('history')}
            onViewReport={(report) => {
              setCurrentReport(report);
              setPage('report');
            }}
          />
        )}
        {page === 'history' && user && (
          <HistoryPage
            onBack={() => setPage('dashboard')}
            onViewReport={(report) => {
              setCurrentReport(report);
              setPage('report');
            }}
          />
        )}
      </main>
    </div>
  );
}
