import React from 'react';
import { User } from '../types';
import { Activity, Github, BookOpen, LayoutDashboard, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

interface NavbarProps {
  user: User | null;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b border-cyber-700 bg-cyber-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center cursor-pointer">
            <Logo size={32} />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/docs"
              className={`${isActive('/docs') ? 'text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </Link>

            {user ? (
              <>
                <div className="h-4 w-px bg-cyber-800 mx-2" />
                <Link
                  to="/dashboard"
                  className={`${isActive('/dashboard') ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/github"
                  className={`${isActive('/github') ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Link>
                <Link
                  to="/status"
                  className={`${isActive('/status') ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Activity className="w-4 h-4" />
                  Grid Status
                </Link>
                <Link
                  to="/settings"
                  className={`${isActive('/settings') ? 'bg-cyber-800 text-white' : 'text-gray-400 hover:text-white'} flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  <Settings className="w-4 h-4" />
                  {user.credits} CR
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-cyber-800 text-white px-4 py-2 rounded-lg text-sm font-medium border border-cyber-700 hover:bg-cyber-700 transition-all"
              >
                Agent Access
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
