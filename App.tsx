import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ReportPage from './pages/ReportPage';
import AgentStatusPage from './pages/AgentStatusPage';
import GithubConnectPage from './pages/GithubConnectPage';
import DocsPage from './pages/DocsPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import AuthPage from './pages/AuthPage';
import { Loader2 } from 'lucide-react';
import { userApi, scanApi, paymentApi } from './services/api';
import { User, ScanReport, Repository } from './types';

// Stripe integration will use direct redirects or @stripe/stripe-js if needed

// Protected Route Wrapper
const ProtectedRoute = ({ user, children }: { user: User | null; children: JSX.Element }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Report Page Wrapper to handle location state
const ReportWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report as ScanReport | undefined;

  if (!report) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ReportPage
      report={report}
      onBack={() => navigate('/dashboard')}
    />
  );
};

// Dashboard Wrapper to handle location state
const DashboardWrapper = ({
  user,
  onScanComplete
}: {
  user: User;
  onScanComplete: (report: ScanReport) => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const repo = location.state?.repo as Repository | undefined;

  return (
    <DashboardPage
      user={user}
      onScanComplete={onScanComplete}
      prefilledRepo={repo}
      onClearRepo={() => navigate('/dashboard', { replace: true, state: {} })}
    />
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Handle Stripe Session Verification
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    const canceled = params.get('canceled');

    if (sessionId && user) {
      const verifySession = async () => {
        try {
          const response = await paymentApi.verify(sessionId);
          if (response.data.status === 'success') {
            const profile = await userApi.getProfile();
            setUser(profile.data);
            alert('Credits successfully added to your account!');
            // Clean up URL
            navigate('/settings', { replace: true });
          }
        } catch (err) {
          console.error('Session verification failed', err);
        }
      };
      verifySession();
    } else if (canceled) {
      alert('Payment was canceled.');
      navigate('/settings', { replace: true });
    }
  }, [location, user, navigate]);

  const handleAuth = (data: { token: string; user: User }) => {
    setUser(data.user);
    navigate('/dashboard');
  };

  const handleUpdateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const handleScanComplete = async (report: ScanReport) => {
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
    navigate('/report', { state: { report } });
  };

  const handleSelectRepo = (repo: Repository) => {
    navigate('/dashboard', { state: { repo } });
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

  const handleAddCredits = async (amount: number) => {
    if (!user) return;

    const priceMap: Record<number, number> = { 10: 10, 50: 40, 100: 70 };
    const price = priceMap[amount] || amount;

    try {
      const response = await paymentApi.createCheckoutSession(price, amount);
      if (response.data.url) {
        window.location.href = response.data.url; // Redirect to Stripe Checkout
      }
    } catch (err) {
      console.error('Stripe initialization failed', err);
      alert('Could not initialize payment. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyber-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-900 text-gray-200 font-sans selection:bg-cyber-accent selection:text-cyber-900">
      <Navbar user={user} />

      <main className="animate-in fade-in duration-500">
        <Routes>
          <Route path="/" element={<LandingPage onStart={() => navigate(user ? '/dashboard' : '/login')} />} />
          <Route path="/login" element={<AuthPage onAuth={handleAuth} />} />
          <Route path="/docs" element={<DocsPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <DashboardWrapper user={user!} onScanComplete={handleScanComplete} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/github"
            element={
              <ProtectedRoute user={user}>
                <GithubConnectPage
                  user={user!}
                  onUpdateUser={handleUpdateUser}
                  onSelectRepo={handleSelectRepo}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/status"
            element={
              <ProtectedRoute user={user}>
                <AgentStatusPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute user={user}>
                <SettingsPage
                  user={user!}
                  onAddCredits={handleAddCredits}
                  onGenerateKey={handleGenerateKey}
                  onDeleteKey={handleDeleteKey}
                  onViewHistory={() => navigate('/history')}
                  onViewReport={(report) => navigate('/report', { state: { report } })}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute user={user}>
                <HistoryPage
                  onBack={() => navigate('/dashboard')}
                  onViewReport={(report) => navigate('/report', { state: { report } })}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report"
            element={
              <ProtectedRoute user={user}>
                <ReportWrapper />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
