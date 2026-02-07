import { Severity, Vulnerability } from './types';

export const MOCK_PRICING_PLANS = [
  {
    name: 'Starter',
    price: 49,
    credits: 5,
    features: ['Basic SQLi Scan', 'XSS Detection', 'PDF Report']
  },
  {
    name: 'Professional',
    price: 199,
    credits: 25,
    features: ['Full OWASP Top 10', 'API Fuzzing', 'Priority Agents', 'Remediation Consultation']
  },
  {
    name: 'Enterprise',
    price: 999,
    credits: 150,
    features: ['DDoS Simulation', 'Custom Exploits', '24/7 Support', 'Dedicated Infrastructure']
  }
];

export const SECURITY_AGENTS = [
  { id: 'recon-01', name: 'ReconAI', role: 'Discovery & Config' },
  { id: 'sql-buster', name: 'SQLBuster', role: 'Injection Attacks' },
  { id: 'auth-guard', name: 'AuthGuard', role: 'Identity & Access' },
  { id: 'net-storm', name: 'NetStorm', role: 'DoS & Stress' },
  { id: 'code-audit', name: 'CodeAudit', role: 'Vuln & Supply Chain' },
];