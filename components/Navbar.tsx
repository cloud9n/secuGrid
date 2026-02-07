import React from 'react';
import { User } from '../types';
import { Activity, Github, BookOpen, LayoutDashboard, Settings } from 'lucide-react';
import Logo from './Logo';

interface NavbarProps {
  user: User | null;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, onNavigate, currentPage }) => {
  return (
    <nav className="border-b border-cyber-700 bg-cyber-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('landing')}>
            <Logo size={32} />
          </div>

          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('docs')}
              className={`${currentPage === 'docs' ? 'text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </button>

            {user ? (
              <>
                <div className="h-4 w-px bg-cyber-800 mx-2" />
                <button
                  onClick={() => onNavigate('dashboard')}
                  className={`${currentPage === 'dashboard' ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate('github')}
                  className={`${currentPage === 'github' ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </button>
                <button
                  onClick={() => onNavigate('status')}
                  className={`${currentPage === 'status' ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Activity className="w-4 h-4" />
                  Grid Status
                </button>
                <button
                  onClick={() => onNavigate('settings')}
                  className={`${currentPage === 'settings' ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Settings className="w-4 h-4" />
                  {user.credits} CR
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="bg-cyber-800 text-white px-4 py-2 rounded-lg text-sm font-medium border border-cyber-700 hover:bg-cyber-700 transition-all"
              >
                Agent Access
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
