
import React from 'react';
import { Severity, Vulnerability } from '../types';
import { AlertTriangle, ShieldAlert, Info, Skull } from 'lucide-react';

interface DiscoveryFeedProps {
  discoveries: Vulnerability[];
}

const SeverityIcon: React.FC<{ severity: Severity }> = ({ severity }) => {
  switch (severity) {
    case Severity.CRITICAL: return <Skull className="w-4 h-4 text-red-500" />;
    case Severity.HIGH: return <ShieldAlert className="w-4 h-4 text-orange-500" />;
    case Severity.MEDIUM: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default: return <Info className="w-4 h-4 text-blue-400" />;
  }
};

const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({ discoveries }) => {
  return (
    <div className="bg-cyber-900/80 border border-cyber-700 rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
        Live Discovery Feed
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
        {discoveries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic text-xs">
            Scanning for attack vectors...
          </div>
        ) : (
          discoveries.map((vuln, idx) => (
            <div 
              key={vuln.id || idx} 
              className="bg-cyber-800 border-l-2 border-cyber-700 p-2 rounded animate-in slide-in-from-right-4 fade-in duration-300"
              style={{ borderLeftColor: vuln.severity === Severity.CRITICAL ? '#ef4444' : vuln.severity === Severity.HIGH ? '#f97316' : '#eab308' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <SeverityIcon severity={vuln.severity} />
                <span className="text-[10px] font-bold text-white uppercase truncate">{vuln.title}</span>
              </div>
              <div className="text-[9px] text-gray-400 font-mono truncate">{vuln.affectedPath}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DiscoveryFeed;
