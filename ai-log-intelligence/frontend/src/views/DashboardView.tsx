import { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardStats {
  totalLogs: number;
  levelCounts: {
    DEBUG: number;
    INFO: number;
    WARN: number;
    ERROR: number;
    FATAL: number;
  };
  errorRate: string;
  activeAnomaliesCount: number;
  serviceCounts: Array<{ service: string; count: number }>;
  chartData: Array<{ time: string; INFO: number; WARN: number; ERROR: number; total: number }>;
}

interface LogEntry {
  _id: string;
  service: string;
  level: string;
  message: string;
  type: string;
  timestamp: string;
  meta?: any;
}

interface DashboardViewProps {
  apiKey: string;
}

export default function DashboardView({ apiKey }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboardData = async () => {
    if (!apiKey) return;
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`/api/stats?apiKey=${encodeURIComponent(apiKey)}`);
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: HTTP ${statsRes.status}`);
      }
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Fetch Recent Logs
      const logsRes = await fetch(`/api/logs?page=1&limit=30`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setRecentLogs(logsData.logs || []);
      }
      
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (pollingActive) {
      pollTimerRef.current = setInterval(fetchDashboardData, 3000); // Poll every 3s
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [apiKey, pollingActive]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  if (!apiKey) {
    return (
      <div className="card text-center" style={{ padding: '60px 40px', marginTop: '20px' }}>
        <Shield className="nav-icon" style={{ width: '48px', height: '48px', color: 'var(--color-ai)', margin: '0 auto 16px', filter: 'drop-shadow(0 0 8px var(--color-ai-glow))' }} />
        <h2 style={{ marginBottom: '8px' }}>API Key Required</h2>
        <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
          Please configure or generate an API Key in the **API Key Manager** tab to view your log streams and analytics.
        </p>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '16px' }}>
        <RefreshCw style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-ai)' }} size={32} />
        <p className="text-muted">Fetching telemetry metrics...</p>
      </div>
    );
  }

  // Helper for custom SVG Area Chart calculations
  const renderSvgChart = () => {
    if (!stats || !stats.chartData || stats.chartData.length === 0) return null;

    const data = stats.chartData;
    const width = 800;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 25;

    const maxVal = Math.max(...data.map(d => d.total), 10); // Minimum max of 10 to scale nicely

    const getX = (index: number) => {
      return paddingLeft + (index / (data.length - 1)) * (width - paddingLeft - paddingRight);
    };

    const getY = (val: number) => {
      return height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);
    };

    // Construct SVG path strings
    let totalPath = '';
    let errorPath = '';
    let totalArea = '';
    let errorArea = '';

    data.forEach((d, i) => {
      const x = getX(i);
      const yTotal = getY(d.total);
      const yError = getY(d.ERROR);

      if (i === 0) {
        totalPath = `M ${x} ${yTotal}`;
        errorPath = `M ${x} ${yError}`;
        totalArea = `M ${x} ${height - paddingBottom} L ${x} ${yTotal}`;
        errorArea = `M ${x} ${height - paddingBottom} L ${x} ${yError}`;
      } else {
        totalPath += ` L ${x} ${yTotal}`;
        errorPath += ` L ${x} ${yError}`;
        totalArea += ` L ${x} ${yTotal}`;
        errorArea += ` L ${x} ${yError}`;
      }

      if (i === data.length - 1) {
        totalArea += ` L ${x} ${height - paddingBottom} Z`;
        errorArea += ` L ${x} ${height - paddingBottom} Z`;
      }
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-ai)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-ai)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-error)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-error)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = getY(maxVal * ratio);
          return (
            <g key={index}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <text x={paddingLeft - 8} y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                {Math.round(maxVal * ratio)}
              </text>
            </g>
          );
        })}

        {/* Chart Lines/Areas */}
        {totalPath && (
          <>
            <path d={totalArea} fill="url(#totalGrad)" />
            <path d={totalPath} fill="none" stroke="var(--color-ai)" strokeWidth="2.5" />
          </>
        )}
        
        {errorPath && (
          <>
            <path d={errorArea} fill="url(#errorGrad)" />
            <path d={errorPath} fill="none" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="3 3" />
          </>
        )}

        {/* X Axis Labels */}
        {data.filter((_, i) => i % 3 === 0 || i === data.length - 1).map((d, i) => {
          const origIdx = data.indexOf(d);
          return (
            <text key={i} x={getX(origIdx)} y={height - 6} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
              {d.time}
            </text>
          );
        })}
      </svg>
    );
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="page-subtitle">Real-time log ingestion metrics and operational status</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn btn-secondary ${pollingActive ? 'active' : ''}`} 
            onClick={() => setPollingActive(!pollingActive)}
            style={{ fontSize: '0.8rem', padding: '8px 12px', borderLeft: pollingActive ? '3px solid var(--color-info)' : undefined }}
          >
            {pollingActive ? 'Live Polling ON' : 'Live Polling OFF'}
          </button>
          <button className="btn btn-secondary" onClick={handleManualRefresh}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error)', background: 'rgba(239,68,68,0.03)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid-cols-4">
        <div className="card stat-card">
          <span className="stat-label">Total Volume</span>
          <span className="stat-value">{stats?.totalLogs.toLocaleString() ?? 0}</span>
          <div className="stat-change text-muted">Ingested logs since key generation</div>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Active Anomalies</span>
          <span className="stat-value" style={{ color: (stats?.activeAnomaliesCount ?? 0) > 0 ? 'var(--color-error)' : 'var(--color-info)' }}>
            {stats?.activeAnomaliesCount ?? 0}
          </span>
          <div className="stat-change">
            {(stats?.activeAnomaliesCount ?? 0) > 0 ? (
              <span className="change-down" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> Action Required
              </span>
            ) : (
              <span className="change-up">System Healthy</span>
            )}
          </div>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Error Rate</span>
          <span className="stat-value" style={{ color: Number(stats?.errorRate) > 5 ? 'var(--color-warn)' : 'var(--text-main)' }}>
            {stats?.errorRate ?? '0.00'}%
          </span>
          <div className="stat-change text-muted">ERROR + FATAL logs ratio</div>
        </div>

        <div className="card stat-card">
          <span className="stat-label">System Services</span>
          <span className="stat-value">{stats?.serviceCounts.length ?? 0}</span>
          <div className="stat-change text-muted">Active reporting SDK nodes</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: '2.3fr 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Log Frequency (Last 24 Hours)</h3>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-ai)' }}></span>
                Total Ingress
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-error)' }}></span>
                Errors
              </span>
            </div>
          </div>
          <div className="chart-container">
            {renderSvgChart()}
          </div>
        </div>

        {/* Services Ingress share */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>Active Services</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats && stats.serviceCounts.length > 0 ? (
              stats.serviceCounts.map((s, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span className="text-muted" style={{ fontFamily: 'var(--font-mono)' }}>{s.service}</span>
                    <span style={{ fontWeight: 600 }}>{s.count.toLocaleString()}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min((s.count / (stats?.totalLogs || 1)) * 100, 100)}%`, 
                        height: '100%', 
                        background: 'var(--color-ai)',
                        borderRadius: '3px'
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '20px' }}>No reporting services.</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Stream Terminal */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Ingestion Stream</h3>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-info)' }}>
            <span className="logo-dot" style={{ width: '6px', height: '6px' }}></span> Real-time listening
          </span>
        </div>
        <div className="terminal">
          <div className="terminal-header">
            <span className="terminal-dot terminal-red"></span>
            <span className="terminal-dot terminal-yellow"></span>
            <span className="terminal-dot terminal-green"></span>
            <span className="terminal-title">bash - log_agent_stream.sh</span>
          </div>
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => {
              let levelColor = 'var(--text-muted)';
              if (log.level === 'WARN') levelColor = 'var(--color-warn)';
              else if (log.level === 'ERROR') levelColor = 'var(--color-error)';
              else if (log.level === 'FATAL') levelColor = 'var(--color-fatal)';
              else if (log.level === 'INFO') levelColor = 'var(--color-info)';

              return (
                <div key={log._id} className="terminal-line">
                  <span style={{ color: 'var(--text-muted)' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span style={{ color: levelColor, fontWeight: 600 }}>[{log.level}]</span>{' '}
                  <span style={{ color: 'var(--color-ai)', fontFamily: 'var(--font-mono)' }}>[{log.service}]</span>{' '}
                  <span>{log.message}</span>
                </div>
              );
            })
          ) : (
            <div className="terminal-line text-muted" style={{ textAlign: 'center', padding: '20px' }}>
              No incoming traffic detected. Fire up the simulator script to populate telemetry data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
