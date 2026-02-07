
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
  isScanning: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ logs, isScanning }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="w-full h-80 bg-cyber-950 border border-cyber-700 rounded-lg overflow-hidden flex flex-col shadow-2xl font-mono text-xs">
      {/* Terminal Header */}
      <div className="bg-cyber-800 px-4 py-2 flex items-center justify-between border-b border-cyber-700">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        <div className="text-cyber-500/50 text-[10px] font-bold tracking-widest uppercase">SEC_OPS_TERMINAL_v4.2</div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-cyber-700">
        {logs.length === 0 && !isScanning && (
          <div className="text-gray-600">
            <p>SecuGrid [Version 4.2.19045.1889]</p>
            <p>(c) SecuGrid Corporation. All neural rights reserved.</p>
            <p className="mt-4">Type 'help' for a list of available commands or initialize simulation from deployment panel.</p>
          </div>
        )}
        
        {logs.map((log, index) => (
          <div key={index} className="mb-1.5 flex animate-in fade-in slide-in-from-left-2 duration-200">
            <span className="text-gray-600 mr-2 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
            <span className={`mr-2 font-bold shrink-0 ${
              log.agent === 'SYSTEM' ? 'text-purple-400' : 'text-cyber-accent'
            }`}>
              {log.agent.toLowerCase()}@secugrid:~$
            </span>
            <span className={`${
              log.type === 'error' ? 'text-red-400' :
              log.type === 'warning' ? 'text-yellow-400 font-bold' :
              log.type === 'success' ? 'text-cyber-accent font-bold' :
              'text-gray-300'
            } break-words`}>
              {log.message}
            </span>
          </div>
        ))}
        
        {isScanning && (
          <div className="mt-2 text-cyber-accent flex items-center gap-2">
            <span className="animate-pulse">|</span>
            <span className="text-[10px] text-gray-500 italic">Processing neural response...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default Terminal;
