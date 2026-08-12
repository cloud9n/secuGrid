
export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  affectedPath: string;
  remediation: string;
  cveId?: string;
}

export interface ScanStats {
  duration: number; // in seconds
  endpointsScanned: number;
  threatsIdentified: number;
  securityScore: number; // 0-100
}

export interface ScanReport {
  targetUrl: string;
  timestamp: string;
  stats: ScanStats;
  vulnerabilities: Vulnerability[];
  summary: string;
}

export enum AgentStatus {
  IDLE = 'IDLE',
  RECONNAISSANCE = 'RECONNAISSANCE',
  FUZZING = 'FUZZING',
  EXPLOITATION_SIM = 'EXPLOITATION_SIM',
  ANALYSIS = 'ANALYSIS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface User {
  id: string;
  email: string;
  credits: number;
  githubConnected: boolean;
  githubUser?: string;
  createdAt?: string;
  apiKeys: ApiKey[];
}

export interface ApiKey {
  id: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  isPrivate: boolean;
}
