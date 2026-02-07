import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import { User } from '../types';

interface AuthPageProps {
    onAuth: (data: { token: string; user: User }) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuth }) => {
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

export default AuthPage;
