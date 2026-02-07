
import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Eye, Server, Shield, Wifi, Zap, Filter, ChevronDown, ChevronUp, Clock, Lock, Grid, BarChart3, TrendingUp, Info } from 'lucide-react';
import { SECURITY_AGENTS } from '../constants';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AgentHistoryPoint {
  time: string;
  cpu: number;
  memory: number;
  efficiency: number;
}

interface AgentMetric {
  id: string;
  name: string;
  role: string;
  cpuLoad: number;
  memoryUsage: number;
  task: string;
  status: 'IDLE' | 'ACTIVE' | 'ANALYZING' | 'OPTIMIZING';
  uptime: number;
  efficiency: number;
  history: AgentHistoryPoint[];
  startTime: number;
}

interface SystemMetricPoint {
  time: string;
  load: number;
  throughput: number;
  threatDensity: number;
}

// Heatmap node representation
interface NodeStatus {
  id: number;
  load: number;
}

const TASKS = {
  'recon-01': [
    'Querying Google Search Index for site map',
    'Analyzing public WHOIS records',
    'Reviewing SSL/TLS Certificate Transparency logs',
    'Checking HTTP Security Headers (CSP, HSTS)',
    'Fingerprinting server technology via headers',
    'Identifying WAF presence (Passive)',
    'Validating SPF/DMARC public records',
    'Checking for exposed robots.txt',
    'Idle - Awaiting target'
  ],
  'sql-buster': [
    'Cross-referencing tech stack with CVE-Database',
    'Checking for public reports of SQLi in CMS version',
    'Analyzing URL structure for query parameters',
    'Reviewing public error logs (Google Dorking)',
    'Checking for known plugin vulnerabilities',
    'Correlating database version with exploit-db',
    'Analyzing API documentation for input schemas',
    'Idle - Standby'
  ],
  'auth-guard': [
    'Checking for exposed login panels (OSINT)',
    'Verifying public OAuth2 configuration',
    'Reviewing breach databases for domain emails',
    'Checking for default CMS admin paths',
    'Analyzing JWT public key exposure',
    'Validating password policy (if public)',
    'Idle - Monitoring'
  ],
  'net-storm': [
    'Measuring response latency from multiple regions',
    'Checking CDN configuration (Cloudflare/Akamai)',
    'Analyzing HTTP/2 and HTTP/3 support',
    'Reviewing public uptime history',
    'Verifying DNS redundancy',
    'Idle - Network Stable'
  ],
  'code-audit': [
    'Parsing Abstract Syntax Tree (AST)',
    'Scanning for Hardcoded Secrets',
    'Analyzing Dependency Tree (npm)',
    'Checking for Known CVEs',
    'Static Analysis of JS bundles',
    'Heuristic Malware Detection',
    'Verifying License Compliance',
    'Auditing third-party scripts',
    'Idle - Repository Clean'
  ]
};

const generateHistory = (points: number): AgentHistoryPoint[] => {
  const data: AgentHistoryPoint[] = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly
    data.push({
      time: `${t.getHours()}:00`,
      cpu: Math.floor(Math.random() * 40) + 10,
      memory: Math.floor(Math.random() * 50) + 20,
      efficiency: Math.floor(Math.random() * 20) + 80,
    });
  }
  return data;
};

const formatUptime = (startTime: number) => {
  const diff = Date.now() - startTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
};

const LoadHeatmap: React.FC<{ nodes: NodeStatus[] }> = ({ nodes }) => {
  return (
    <div className="grid grid-cols-10 gap-1 w-full max-w-md mx-auto aspect-square">
      {nodes.map(node => {
        const opacity = node.load / 100;
        const color = node.load > 80 ? 'bg-red-500' : node.load > 50 ? 'bg-amber-500' : 'bg-cyber-500';
        return (
          <div 
            key={node.id} 
            className={`w-full h-full rounded-sm transition-all duration-1000 ${color}`}
            style={{ opacity: 0.2 + (opacity * 0.8) }}
            title={`Node ${node.id}: ${node.load.toFixed(1)}% Load`}
          />
        );
      })}
    </div>
  );
};

const AgentStatusPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentMetric[]>([]);
  const [systemLoad, setSystemLoad] = useState(42);
  const [networkThroughput, setNetworkThroughput] = useState(128);
  const [threatDensity, setThreatDensity] = useState(12);
  const [systemHistory, setSystemHistory] = useState<SystemMetricPoint[]>([]);
  const [heatmapNodes, setHeatmapNodes] = useState<NodeStatus[]>([]);
  
  // Customization
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['load', 'throughput']);
  const [viewMode, setViewMode] = useState<'chart' | 'heatmap'>('chart');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // Expanded card state
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Initialize agents and system history
  useEffect(() => {
    const initialAgents = SECURITY_AGENTS.map(agent => {
      const taskList = TASKS[agent.id as keyof typeof TASKS];
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        cpuLoad: Math.floor(Math.random() * 40) + 10,
        memoryUsage: Math.floor(Math.random() * 60) + 20,
        task: taskList ? taskList[taskList.length - 1] : 'System Init',
        status: 'IDLE' as const,
        uptime: 99.9,
        efficiency: 98,
        history: generateHistory(24),
        startTime: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000) - 1000000 
      };
    });
    setAgents(initialAgents);

    // Initial heatmap nodes
    const initialNodes: NodeStatus[] = [];
    for(let i=0; i<100; i++) {
      initialNodes.push({ id: i, load: Math.random() * 60 + 10 });
    }
    setHeatmapNodes(initialNodes);

    // Initial system history
    const initialSysHist: SystemMetricPoint[] = [];
    for(let i=20; i>=0; i--) {
      initialSysHist.push({
        time: new Date(Date.now() - i * 2000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
        load: 30 + Math.random() * 20,
        throughput: 100 + Math.random() * 50,
        threatDensity: 5 + Math.random() * 10
      });
    }
    setSystemHistory(initialSysHist);

    // Simulation interval
    const interval = setInterval(() => {
      const newLoad = Math.min(100, Math.max(20, systemLoad + (Math.random() * 10 - 5)));
      const newThroughput = Math.max(0, networkThroughput + (Math.random() * 50 - 25));
      const newThreat = Math.max(0, Math.min(100, threatDensity + (Math.random() * 4 - 2)));
      const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

      setSystemLoad(newLoad);
      setNetworkThroughput(newThroughput);
      setThreatDensity(newThreat);
      
      setSystemHistory(prev => {
        const newHist = [...prev.slice(1), { time: timeStr, load: newLoad, throughput: newThroughput, threatDensity: newThreat }];
        return newHist;
      });

      setHeatmapNodes(prev => prev.map(node => ({
        ...node,
        load: Math.max(5, Math.min(100, node.load + (Math.random() * 10 - 5)))
      })));

      setAgents(prevAgents => prevAgents.map(agent => {
        const isWorking = Math.random() > 0.25; 
        const tasks = TASKS[agent.id as keyof typeof TASKS];
        
        const newCpu = isWorking ? Math.min(99, agent.cpuLoad + Math.random() * 15 - 5) : Math.max(5, agent.cpuLoad - 10);
        const newMem = Math.min(100, Math.max(20, agent.memoryUsage + (Math.random() * 8 - 4)));
        const newEff = Math.min(100, Math.max(90, agent.efficiency + (Math.random() * 2 - 1)));

        let newTask = agent.task;
        if (tasks) {
          if (isWorking) {
             const taskIndex = Math.floor(Math.random() * (tasks.length - 1));
             newTask = tasks[taskIndex];
          } else {
             newTask = tasks[tasks.length - 1];
          }
        }

        return {
          ...agent,
          cpuLoad: newCpu,
          memoryUsage: newMem,
          status: isWorking ? (Math.random() > 0.6 ? 'ANALYZING' : 'ACTIVE') : 'IDLE',
          task: newTask,
          efficiency: newEff
        };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'text-green-400 bg-green-400/10 border-green-400/50';
      case 'ANALYZING': return 'text-purple-400 bg-purple-400/10 border-purple-400/50';
      case 'OPTIMIZING': return 'text-blue-400 bg-blue-400/10 border-blue-400/50';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/50';
    }
  };

  const getIcon = (id: string) => {
    switch(id) {
      case 'recon-01': return <Eye className="w-6 h-6" />;
      case 'sql-buster': return <Database className="w-6 h-6" />;
      case 'net-storm': return <Zap className="w-6 h-6" />;
      case 'code-audit': return <Shield className="w-6 h-6" />;
      case 'auth-guard': return <Lock className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  // Filtering Logic
  const uniqueRoles = ['ALL', ...Array.from(new Set(SECURITY_AGENTS.map(a => a.role)))];
  const uniqueStatuses = ['ALL', 'IDLE', 'ACTIVE', 'ANALYZING', 'OPTIMIZING'];

  const filteredAgents = agents.filter(agent => {
    const statusMatch = statusFilter === 'ALL' || agent.status === statusFilter;
    const roleMatch = roleFilter === 'ALL' || agent.role === roleFilter;
    return statusMatch && roleMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Stats */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Activity className="text-cyber-accent" />
          Neural Grid Status
        </h1>
        <p className="text-gray-400 mb-6">Real-time monitoring of autonomous security agents.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-cyber-800 border border-cyber-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><Server className="w-6 h-6" /></div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">System Load</div>
              <div className="text-2xl font-bold text-white font-mono">{systemLoad.toFixed(1)}%</div>
            </div>
          </div>
          <div className="bg-cyber-800 border border-cyber-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-400"><Wifi className="w-6 h-6" /></div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Net Throughput</div>
              <div className="text-2xl font-bold text-white font-mono">{Math.floor(networkThroughput)} Mb/s</div>
            </div>
          </div>
          <div className="bg-cyber-800 border border-cyber-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400"><Cpu className="w-6 h-6" /></div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Active Threads</div>
              <div className="text-2xl font-bold text-white font-mono">1,024</div>
            </div>
          </div>
          <div className="bg-cyber-800 border border-cyber-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400"><Shield className="w-6 h-6" /></div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-mono">Threat Density</div>
              <div className="text-2xl font-bold text-white font-mono">{threatDensity.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Enhanced System Visualizations */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Main Visualization Controller */}
          <div className="lg:col-span-2 bg-cyber-800 border border-cyber-700 rounded-xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyber-accent" />
                Live Performance Matrix
              </h2>
              <div className="flex bg-cyber-900 rounded p-1 border border-cyber-700">
                <button 
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'chart' ? 'bg-cyber-accent text-cyber-900' : 'text-gray-400 hover:text-white'}`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('heatmap')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'heatmap' ? 'bg-cyber-accent text-cyber-900' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewMode === 'chart' ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={systemHistory}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{fontSize: 10}} />
                    <YAxis stroke="#64748b" tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    {selectedMetrics.includes('load') && (
                      <Area type="monotone" dataKey="load" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLoad)" name="Sys Load %" />
                    )}
                    {selectedMetrics.includes('throughput') && (
                      <Area type="monotone" dataKey="throughput" stroke="#10b981" fillOpacity={1} fill="url(#colorNet)" name="Net (Mbps)" />
                    )}
                    {selectedMetrics.includes('threat') && (
                      <Area type="monotone" dataKey="threatDensity" stroke="#ef4444" fillOpacity={1} fill="url(#colorThreat)" name="Threat Index" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center py-4">
                <LoadHeatmap nodes={heatmapNodes} />
              </div>
            )}

            {/* Metric Selectors */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button 
                onClick={() => toggleMetric('load')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedMetrics.includes('load') ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-cyber-900 text-gray-500 border-cyber-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedMetrics.includes('load') ? 'bg-blue-400' : 'bg-gray-700'}`} />
                System Load
              </button>
              <button 
                onClick={() => toggleMetric('throughput')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedMetrics.includes('throughput') ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-cyber-900 text-gray-500 border-cyber-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedMetrics.includes('throughput') ? 'bg-green-400' : 'bg-gray-700'}`} />
                Network Traffic
              </button>
              <button 
                onClick={() => toggleMetric('threat')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedMetrics.includes('threat') ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-cyber-900 text-gray-500 border-cyber-700'}`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedMetrics.includes('threat') ? 'bg-red-400' : 'bg-gray-700'}`} />
                Threat Density
              </button>
            </div>
          </div>

          {/* System Info Sidebar */}
          <div className="bg-cyber-800 border border-cyber-700 rounded-xl p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-cyber-500" />
              Node Health
            </h2>
            <div className="space-y-4 flex-1">
               <div className="bg-cyber-900 p-3 rounded border border-cyber-700 flex justify-between items-center">
                 <span className="text-gray-400 text-xs font-mono">Nodes Online</span>
                 <span className="text-white font-bold font-mono text-sm">100 / 100</span>
               </div>
               <div className="bg-cyber-900 p-3 rounded border border-cyber-700 flex justify-between items-center">
                 <span className="text-gray-400 text-xs font-mono">Response Time</span>
                 <span className="text-cyber-accent font-bold font-mono text-sm">24ms (Avg)</span>
               </div>
               <div className="bg-cyber-900 p-3 rounded border border-cyber-700 flex justify-between items-center">
                 <span className="text-gray-400 text-xs font-mono">Error Rate</span>
                 <span className="text-red-400 font-bold font-mono text-sm">0.002%</span>
               </div>
               
               <div className="pt-2">
                 <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Load Distribution</div>
                 <div className="flex gap-1 h-3 mb-2">
                   <div className="h-full bg-cyber-500 rounded-l" style={{ width: '70%' }}></div>
                   <div className="h-full bg-amber-500" style={{ width: '20%' }}></div>
                   <div className="h-full bg-red-500 rounded-r" style={{ width: '10%' }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] text-gray-500">
                   <span>Normal</span>
                   <span>Critical</span>
                 </div>
               </div>
            </div>
            <button className="w-full mt-6 py-2 rounded bg-cyber-900 border border-cyber-700 text-xs font-bold text-gray-400 hover:text-white hover:border-cyber-500 transition-all">
              REINITIALIZE GRID
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-cyber-900/50 p-4 rounded-lg border border-cyber-800">
          <div className="flex items-center gap-2 text-gray-300">
            <Filter className="w-5 h-5 text-cyber-accent" />
            <span className="font-semibold">Filter Agents:</span>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-cyber-800 border border-cyber-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-cyber-accent w-full md:w-48"
            >
              <option value="ALL">All Statuses</option>
              {uniqueStatuses.filter(s => s !== 'ALL').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-cyber-800 border border-cyber-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-cyber-accent w-full md:w-48"
            >
              <option value="ALL">All Roles</option>
              {uniqueRoles.filter(r => r !== 'ALL').map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="bg-cyber-800 border border-cyber-700 rounded-xl overflow-hidden relative group hover:border-cyber-500 transition-all duration-300">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            
            <div className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-cyber-900 border border-cyber-600 text-cyber-400 group-hover:text-cyber-accent group-hover:border-cyber-accent transition-colors`}>
                    {getIcon(agent.id)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{agent.name}</h3>
                    <p className="text-xs text-gray-500 font-mono uppercase">{agent.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-mono font-bold border ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="flex justify-between text-gray-400 mb-1 text-xs">
                    <span>Current Task</span>
                  </div>
                  <div className="bg-cyber-900 border border-cyber-700 p-2 rounded text-cyber-accent truncate flex items-center justify-between">
                    <span>{'>'} {agent.task}</span>
                    <span className="animate-pulse">_</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-gray-500 mb-1 text-xs">
                      <span>Neural Load</span>
                      <span>{agent.cpuLoad.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-cyber-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyber-500 transition-all duration-500" 
                        style={{ width: `${agent.cpuLoad}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-gray-500 mb-1 text-xs">
                      <span>Memory Alloc</span>
                      <span>{agent.memoryUsage.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-cyber-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-500" 
                        style={{ width: `${agent.memoryUsage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-cyber-700 flex justify-between text-xs text-gray-500 items-center">
                  <div className="flex gap-4">
                    <span>Eff: <span className="text-green-400">{agent.efficiency.toFixed(0)}%</span></span>
                    <span>Up: <span className="text-white">{formatUptime(agent.startTime)}</span></span>
                  </div>
                  <button 
                    onClick={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                    className="flex items-center gap-1 text-cyber-400 hover:text-white transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    {expandedAgentId === agent.id ? 'Hide' : '24h'}
                    {expandedAgentId === agent.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Expanded History Charts */}
                {expandedAgentId === agent.id && (
                  <div className="mt-4 pt-4 border-t border-cyber-700 animate-in slide-in-from-top-2 fade-in duration-300">
                    <h4 className="text-xs text-gray-400 uppercase mb-2">24h Performance Trend</h4>
                    <div className="h-32 w-full bg-cyber-900/50 rounded p-2">
                       <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={agent.history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', fontSize: '12px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            labelStyle={{ color: '#94a3b8' }}
                          />
                          <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU %" />
                          <Line type="monotone" dataKey="memory" stroke="#a855f7" strokeWidth={2} dot={false} name="Mem %" />
                          <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} dot={false} name="Eff %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 justify-center mt-2 text-xs">
                      <span className="flex items-center text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>CPU</span>
                      <span className="flex items-center text-purple-400"><div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>Memory</span>
                      <span className="flex items-center text-green-400"><div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>Efficiency</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredAgents.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-cyber-800 rounded-xl border border-cyber-700 border-dashed">
            No agents found matching current filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentStatusPage;
