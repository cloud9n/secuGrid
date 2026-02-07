import React from 'react';
import { Shield, Cpu, Lock, Activity, Terminal as TerminalIcon } from 'lucide-react';
import Logo from '../components/Logo';

import WorldConnectionBackground from '../components/WorldConnectionBackground';

const Feature: React.FC<{ icon: React.ReactNode, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="p-6 bg-cyber-800 border border-cyber-700 rounded-xl hover:border-cyber-500 transition-colors z-10 relative">
    <div className="w-12 h-12 bg-cyber-900 rounded-lg flex items-center justify-center text-cyber-accent mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400">{desc}</p>
  </div>
);

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Dynamic Background */}
        <div className="absolute inset-0 bg-cyber-900 z-0">
          <WorldConnectionBackground />
        </div>

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-900/40 via-cyber-900/60 to-cyber-900 z-1 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-8">
            <Logo size={80} className="flex-col items-center gap-4" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-800/50 border border-cyber-accent/30 text-cyber-accent text-sm font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-cyber-accent animate-pulse"></span>
            SYSTEM OPERATIONAL
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Automated <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-accent to-cyber-500">Security</span> Intelligence
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Deploy autonomous AI agents to simulate advanced persistent threats, stress test infrastructure, and identify critical vulnerabilities before they are exploited.
          </p>

          <button
            onClick={onStart}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-cyber-900 transition-all duration-200 bg-cyber-accent font-mono rounded-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyber-accent focus:ring-offset-cyber-900"
          >
            INITIALIZE SCAN
            <TerminalIcon className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-cyber-900 py-24 border-t border-cyber-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Feature
              icon={<Shield className="w-6 h-6" />}
              title="Full Spectrum Audit"
              desc="Comprehensive analysis covering OWASP Top 10, including SQL Injection, XSS, and broken authentication mechanisms."
            />
            <Feature
              icon={<Cpu className="w-6 h-6" />}
              title="AI-Driven Simulation"
              desc="Neural agents simulate human attacker behavior to find logic flaws that traditional scanners miss."
            />
            <Feature
              icon={<Activity className="w-6 h-6" />}
              title="DDoS Resilience"
              desc="Simulate traffic spikes and stress test your load balancers and auto-scaling groups."
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
