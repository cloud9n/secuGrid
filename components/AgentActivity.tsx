
import React from 'react';
import { SECURITY_AGENTS } from '../constants';
import { AgentStatus } from '../types';
import { Cpu, Zap, Search, Shield, Database, Loader2 } from 'lucide-react';

interface AgentActivityProps {
  status: AgentStatus;
  activeTask?: string;
  progress: number;
}

const getAgentIcon = (id: string) => {
  switch (id) {
    case 'recon-01': return <Search className="w-4 h-4" />;
    case 'sql-buster': return <Database className="w-4 h-4" />;
    case 'net-storm': return <Zap className="w-4 h-4" />;
    case 'code-audit': return <Cpu className="w-4 h-4" />;
    case 'auth-guard': return <Shield className="w-4 h-4" />;
    default: return <Cpu className="w-4 h-4" />;
  }
};

const AgentActivity: React.FC<AgentActivityProps> = ({ status, activeTask, progress }) => {
  const isIdle = status === AgentStatus.IDLE || status === AgentStatus.COMPLETED || status === AgentStatus.FAILED;

  return (
    <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-5 shadow-lg relative overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-4">
        {!isIdle && <Loader2 className="w-5 h-5 text-cyber-accent animate-spin" />}
      </div>
      
      <h2 className="text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyber-accent" />
        Agent Mesh Activity
      </h2>

      <div className="space-y-6">
        {SECURITY_AGENTS.map((agent) => {
          const isActive = !isIdle && (
            (status === AgentStatus.RECONNAISSANCE && agent.id === 'recon-01') ||
            (status === AgentStatus.FUZZING && (agent.id === 'sql-buster' || agent.id === 'net-storm')) ||
            (status === AgentStatus.ANALYSIS && agent.id === 'code-audit')
          );

          return (
            <div key={agent.id} className={`transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-cyber-900 border ${isActive ? 'border-cyber-accent text-cyber-accent shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse' : 'border-cyber-700 text-gray-500'}`}>
                    {getAgentIcon(agent.id)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{agent.name}</div>
                    <div className="text-[10px] text-gray-500 uppercase">{agent.role}</div>
                  </div>
                </div>
                {isActive && (
                  <div className="text-[10px] font-mono text-cyber-accent animate-pulse">EXECUTING...</div>
                )}
              </div>
              
              <div className="h-1.5 w-full bg-cyber-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isActive ? 'bg-cyber-accent' : 'bg-cyber-700'}`}
                  style={{ width: isActive ? `${progress}%` : isIdle && status === AgentStatus.COMPLETED ? '100%' : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!isIdle && activeTask && (
        <div className="mt-8 pt-4 border-t border-cyber-700">
          <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Sub-Process Trace</div>
          <div className="bg-cyber-900 border border-cyber-700 p-2 rounded font-mono text-[10px] text-cyber-accent">
            <span className="opacity-50 mr-2">{'>'}</span>
            {activeTask}
            <span className="animate-pulse ml-1">_</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentActivity;
