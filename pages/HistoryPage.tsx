import React, { useEffect, useState } from 'react';
import { ScanReport } from '../types';
import { scanApi } from '../services/api'; // Import scanApi
import { ShieldCheck, ChevronRight, Clock, Calendar, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

interface HistoryPageProps {
    onBack: () => void;
    onViewReport: (report: ScanReport) => void;
}

const mapScanToReport = (scan: any): ScanReport => ({
    targetUrl: scan.targetUrl,
    timestamp: scan.timestamp,
    vulnerabilities: scan.vulnerabilities, // Already parsed by backend if using modified route, but let's double check. Yes, route parses it.
    summary: scan.summary,
    stats: {
        duration: scan.duration,
        endpointsScanned: scan.endpointsScanned,
        threatsIdentified: scan.threatsIdentified,
        securityScore: scan.securityScore
    }
});

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, onViewReport }) => {
    const [scans, setScans] = useState<ScanReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await scanApi.getHistory();
                // Determine if response.data is array or object { scans: [] }? Route returns array.
                // Also check if vulnerabilities are parsed. Route does parsing.
                setScans(response.data.map(mapScanToReport));
            } catch (error) {
                console.error('Failed to fetch scan history', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <button
                onClick={onBack}
                className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </button>

            <div className="flex items-center gap-3 mb-8">
                <Clock className="w-8 h-8 text-cyber-accent" />
                <h1 className="text-3xl font-bold text-white">Scan History</h1>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-cyber-accent animate-spin" />
                </div>
            ) : scans.length === 0 ? (
                <div className="text-center py-16 bg-cyber-800 rounded-xl border border-cyber-700 border-dashed">
                    <ShieldCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-400 mb-2">No Scan History</h3>
                    <p className="text-gray-500">Run your first security audit to populate this log.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {scans.map((scan, index) => (
                        <div
                            key={index}
                            onClick={() => onViewReport(scan)}
                            className="bg-cyber-800 border border-cyber-700 p-6 rounded-xl hover:border-cyber-accent hover:bg-cyber-800/80 transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${scan.stats.securityScore > 80 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            scan.stats.securityScore > 50 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        Score: {scan.stats.securityScore}
                                    </span>
                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(scan.timestamp).toLocaleDateString()}
                                    </span>
                                    <span className="text-gray-500 text-xs flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(scan.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyber-accent transition-colors">{scan.targetUrl}</h3>
                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span>Duration: {scan.stats.duration}s</span>
                                    <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        {scan.stats.threatsIdentified} Threats Found
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-cyber-accent font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                View Report
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
