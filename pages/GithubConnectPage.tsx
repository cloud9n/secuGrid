
import React, { useState, useEffect } from 'react';
import { User, Repository } from '../types';
import { Github, Search, Lock, Globe, Star, RefreshCw, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { connectGithub, fetchRepositories } from '../services/githubService';

interface GithubConnectPageProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onSelectRepo: (repo: Repository) => void;
}

const GithubConnectPage: React.FC<GithubConnectPageProps> = ({ user, onUpdateUser, onSelectRepo }) => {
  const [pat, setPat] = useState('');
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user.githubConnected) {
      loadRepos();
    }
  }, [user.githubConnected]);

  const loadRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const fetched = await fetchRepositories();
      setRepos(fetched);
    } catch (err) {
      console.error('Failed to load repos', err);
    }
    setIsLoadingRepos(false);
  };

  const handleConnect = async () => {
    if (!pat) {
      setError('Please provide a Personal Access Token');
      return;
    }
    setIsConnecting(true);
    setError('');
    try {
      const username = await connectGithub(pat);
      onUpdateUser({ githubConnected: true, githubUser: username });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect. Verify your token.');
    }
    setIsConnecting(false);
  };

  const filteredRepos = repos.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user.githubConnected) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-cyber-800 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-cyber-700">
          <Github className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Connect Your Repositories</h1>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Integrate SecuGrid with your GitHub account by providing a **Personal Access Token (Classic)** with `repo` scopes.
        </p>

        <div className="max-w-md mx-auto mb-8">
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full bg-cyber-900 border border-cyber-700 rounded-xl py-4 px-6 text-white focus:border-cyber-accent outline-none transition-all text-center font-mono mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-white text-black font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
          >
            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Github className="w-5 h-5" />}
            {isConnecting ? 'Establishing Connection...' : 'Connect GitHub Account'}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          SecuGrid only requests read access to your repositories. No code is permanently stored.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">GitHub Repositories</h1>
          <div className="flex items-center gap-2 text-cyber-accent text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Connected as <span className="font-mono font-bold">@{user.githubUser}</span>
          </div>
        </div>
        <button
          onClick={loadRepos}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-800 border border-cyber-700 rounded-lg text-sm text-gray-300 hover:text-white transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingRepos ? 'animate-spin' : ''}`} />
          Refresh Repos
        </button>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repositories..."
          className="w-full bg-cyber-900 border border-cyber-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-cyber-accent outline-none transition-all"
        />
      </div>

      {isLoadingRepos ? (
        <div className="grid md:grid-cols-2 gap-6 opacity-50">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-cyber-800 rounded-xl animate-pulse border border-cyber-700" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredRepos.map(repo => (
            <div
              key={repo.id}
              className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 hover:border-cyber-accent transition-all group cursor-pointer"
              onClick={() => onSelectRepo(repo)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyber-900 rounded-lg">
                    {repo.isPrivate ? <Lock className="w-5 h-5 text-amber-500" /> : <Globe className="w-5 h-5 text-cyber-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-cyber-accent transition-colors">{repo.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{repo.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  {repo.stars}
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2 h-10">
                {repo.description || 'No description provided.'}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{repo.language}</span>
                <div className="flex items-center gap-1 text-cyber-accent font-bold text-sm">
                  Initialize Scan
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GithubConnectPage;
