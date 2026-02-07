import React, { useState } from 'react';
import { ScanReport, Severity } from '../types';
import VulnerabilityCard from '../components/VulnerabilityCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Download, ChevronLeft, ShieldCheck, Share2, X, Lock, Link as LinkIcon, Copy, Check } from 'lucide-react';

interface ReportPageProps {
  report: ScanReport;
  onBack: () => void;
}

const ReportPage: React.FC<ReportPageProps> = ({ report, onBack }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Process data for chart
  const severityCounts = report.vulnerabilities.reduce((acc, curr) => {
    acc[curr.severity] = (acc[curr.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(severityCounts).map(key => ({
    name: key,
    value: severityCounts[key]
  }));

  const COLORS = {
    [Severity.CRITICAL]: '#ef4444', // Red
    [Severity.HIGH]: '#f97316', // Orange
    [Severity.MEDIUM]: '#eab308', // Yellow
    [Severity.LOW]: '#3b82f6', // Blue
    [Severity.INFO]: '#9ca3af', // Gray
  };

  const generateLink = () => {
    // Simulate link generation
    const id = Math.random().toString(36).substring(7);
    const link = `https://secugrid.ai/share/${id}${isPasswordProtected ? '?locked=true' : ''}`;
    setGeneratedLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const ShareModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 print:hidden">
      <div className="bg-cyber-800 border border-cyber-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button 
          onClick={() => { setShowShareModal(false); setGeneratedLink(''); setPassword(''); }}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-cyber-accent" />
          Secure Share Gateway
        </h2>
        <p className="text-gray-400 text-sm mb-6">Generate a secure link to share this audit report.</p>

        {!generatedLink ? (
          <div className="space-y-4">
            <div className="bg-cyber-900 border border-cyber-700 p-4 rounded-lg">
              <label className="flex items-center space-x-3 cursor-pointer mb-2">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isPasswordProtected}
                    onChange={(e) => setIsPasswordProtected(e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isPasswordProtected ? 'bg-cyber-accent' : 'bg-gray-600'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPasswordProtected ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-gray-200 font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gray-400" />
                  Password Protection
                </span>
              </label>
              <p className="text-xs text-gray-500 pl-14">Encrypt access to this report with a custom key.</p>
              
              {isPasswordProtected && (
                <div className="mt-4 pl-1">
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter access password"
                    className="w-full bg-cyber-800 border border-cyber-600 rounded px-3 py-2 text-white text-sm focus:border-cyber-accent outline-none"
                  />
                </div>
              )}
            </div>

            <button 
              onClick={generateLink}
              disabled={isPasswordProtected && !password}
              className={`w-full py-2 rounded font-bold transition-all flex items-center justify-center gap-2 ${
                isPasswordProtected && !password 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-cyber-accent text-cyber-900 hover:bg-emerald-400'
              }`}
            >
              Generate Link
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-2">
            <div className="bg-green-500/10 border border-green-500/30 p-3 rounded flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Secure link generated successfully.
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Shareable Link</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-cyber-900 border border-cyber-700 rounded px-3 py-2 text-gray-300 font-mono text-sm truncate">
                  {generatedLink}
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="bg-cyber-700 hover:bg-cyber-600 text-white p-2 rounded border border-cyber-600 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="text-center pt-2">
              <button 
                onClick={() => { setGeneratedLink(''); setShowShareModal(false); }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      <style>{`
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          nav { display: none; }
          .bg-cyber-900, .bg-cyber-800 { background: white !important; border: 1px solid #ddd !important; }
          .text-white { color: black !important; }
          .text-gray-400, .text-gray-300, .text-gray-500 { color: #555 !important; }
        }
      `}</style>

      {showShareModal && <ShareModal />}

      <button 
        onClick={onBack}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors print:hidden"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="text-cyber-accent w-8 h-8" />
            Security Audit Report
          </h1>
          <p className="text-gray-400 font-mono text-sm mt-1">Target: {report.targetUrl}</p>
          <p className="text-gray-500 text-xs">Generated: {new Date(report.timestamp).toLocaleString()}</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center bg-cyber-800 hover:bg-cyber-700 border border-cyber-600 text-white px-4 py-2 rounded transition-all"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center bg-cyber-accent text-cyber-900 font-bold px-4 py-2 rounded hover:bg-emerald-400 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-cyber-800 border border-cyber-700 p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Executive Summary</h2>
          <p className="text-gray-300 leading-relaxed mb-4">{report.summary}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-cyber-900 p-3 rounded">
              <div className="text-xs text-gray-500 uppercase">Security Score</div>
              <div className={`text-2xl font-bold ${
                report.stats.securityScore > 80 ? 'text-green-500' : 
                report.stats.securityScore > 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {report.stats.securityScore}/100
              </div>
            </div>
            <div className="bg-cyber-900 p-3 rounded">
              <div className="text-xs text-gray-500 uppercase">Threats Found</div>
              <div className="text-2xl font-bold text-white">{report.stats.threatsIdentified}</div>
            </div>
            <div className="bg-cyber-900 p-3 rounded">
              <div className="text-xs text-gray-500 uppercase">Endpoints</div>
              <div className="text-2xl font-bold text-white">{report.stats.endpointsScanned}</div>
            </div>
            <div className="bg-cyber-900 p-3 rounded">
              <div className="text-xs text-gray-500 uppercase">Duration</div>
              <div className="text-2xl font-bold text-white">{report.stats.duration}s</div>
            </div>
          </div>
        </div>

        <div className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Vulnerability Distribution</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as Severity] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {chartData.map(d => (
              <div key={d.name} className="flex items-center text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[d.name as Severity] }}></span>
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vulnerabilities List */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Detailed Findings</h2>
        <div className="space-y-4">
          {report.vulnerabilities.length > 0 ? (
            report.vulnerabilities.map((vuln) => (
              <VulnerabilityCard key={vuln.id} vuln={vuln} />
            ))
          ) : (
            <div className="text-center py-12 bg-cyber-800 rounded border border-cyber-700 border-dashed">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white">No Vulnerabilities Detected</h3>
              <p className="text-gray-500">The automated agents did not identify significant threats.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPage;