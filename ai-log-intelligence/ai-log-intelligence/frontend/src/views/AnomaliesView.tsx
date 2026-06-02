import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Brain, Sparkles, X, ChevronRight, Check, Play, RefreshCw, Terminal as TermIcon, ToggleLeft, ToggleRight } from 'lucide-react';

interface Anomaly {
  _id: string;
  service: string;
  type: string;
  summary: string;
  logCount: number;
  errorMessages: string[];
  windowStart: string;
  windowEnd: string;
  insightGenerated: boolean;
  insightId?: string;
  resolved: boolean;
  createdAt: string;
  remediationStatus: 'NONE' | 'PENDING_APPROVAL' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
  remediationScript?: string;
  remediationLogs?: string[];
  autoHealEnabled: boolean;
}

interface AIInsight {
  _id: string;
  rootCause: string;
  fix: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  logsAnalyzed: string[];
  model: string;
}

interface AnomaliesViewProps {
  apiKey: string;
}

function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          const codeLines = code.split('\n');

          return (
            <div key={index} style={{ margin: '14px 0' }}>
              <div className="code-header">{lang.toUpperCase() || 'CODE RECOMMENDATION'}</div>
              <pre className="code-container" style={{ margin: 0 }}>
                <code>
                  {codeLines.map((line, idx) => {
                    let className = '';
                    if (line.startsWith('+')) className = 'diff-add';
                    else if (line.startsWith('-')) className = 'diff-del';
                    return (
                      <div key={idx} className={className} style={{ padding: '2px 4px', borderRadius: '2px' }}>
                        {line}
                      </div>
                    );
                  })}
                </code>
              </pre>
            </div>
          );
        } else {
          return (
            <div key={index}>
              {part.split('\n').map((line, lineIdx) => {
                if (line.startsWith('### ')) {
                  return <h4 key={lineIdx} style={{ fontSize: '0.95rem', fontWeight: 600, margin: '16px 0 8px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>{line.slice(4)}</h4>;
                }
                if (line.startsWith('## ')) {
                  return <h3 key={lineIdx} style={{ fontSize: '1.05rem', fontWeight: 600, margin: '20px 0 10px', color: '#fff' }}>{line.slice(3)}</h3>;
                }
                if (line.startsWith('- ') || line.startsWith('* ')) {
                  return <li key={lineIdx} style={{ marginLeft: '16px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{line.slice(2)}</li>;
                }
                if (line.trim().match(/^\d+\.\s/)) {
                  const match = line.trim().match(/^(\d+)\.\s(.*)/);
                  return (
                    <div key={lineIdx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', paddingLeft: '8px', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--color-ai)', fontWeight: 600 }}>{match?.[1]}.</span>
                      <span>{match?.[2]}</span>
                    </div>
                  );
                }
                if (line.trim() === '') {
                  return <div key={lineIdx} style={{ height: '8px' }} />;
                }
                return <p key={lineIdx} style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '8px', color: 'var(--text-muted)' }}>{line}</p>;
              })}
            </div>
          );
        }
      })}
    </div>
  );
}

export default function AnomaliesView({ apiKey }: AnomaliesViewProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [insight, setInsight] = useState<AIInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [remediating, setRemediating] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the SRE terminal logs when they update
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedAnomaly?.remediationLogs]);

  const fetchAnomalies = async () => {
    if (!apiKey) return;
    try {
      const res = await fetch('/api/anomalies', {
        headers: { 'X-API-Key': apiKey }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnomalies(data.anomalies || []);

      // If the selected anomaly is currently open, update its state dynamically
      if (selectedAnomaly) {
        const updated = data.anomalies.find((a: Anomaly) => a._id === selectedAnomaly._id);
        if (updated) {
          setSelectedAnomaly(updated);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch anomalies.');
    } finally {
      setLoading(false);
    }
  };

  // Poll list every 4s, but poll much faster (every 1s) if a selected anomaly is executing a fix
  useEffect(() => {
    fetchAnomalies();
    
    const isExecuting = selectedAnomaly?.remediationStatus === 'EXECUTING';
    const intervalTime = isExecuting ? 1000 : 4000;
    
    const interval = setInterval(fetchAnomalies, intervalTime);
    return () => clearInterval(interval);
  }, [apiKey, selectedAnomaly?.remediationStatus, selectedAnomaly?._id]);

  const handleSelectAnomaly = async (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
    setInsight(null);
    setInsightLoading(true);

    try {
      const res = await fetch(`/api/anomalies/${anomaly._id}/insight`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        setInsight(data);
      } else {
        setInsight(null);
      }
    } catch (err) {
      console.error('Failed to load AI Insight', err);
      setInsight(null);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleResolveAnomaly = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    if (e) e.stopPropagation();
    setResolvingId(id);
    try {
      const res = await fetch(`/api/anomalies/${id}/resolve`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      });
      if (res.ok) {
        setAnomalies(prev => prev.map(a => a._id === id ? { ...a, resolved: true } : a));
        if (selectedAnomaly && selectedAnomaly._id === id) {
          setSelectedAnomaly(prev => prev ? { ...prev, resolved: true } : null);
        }
      }
    } catch (err) {
      console.error('Failed to resolve anomaly', err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleExecuteRemediation = async () => {
    if (!selectedAnomaly) return;
    setRemediating(true);
    try {
      const res = await fetch(`/api/anomalies/${selectedAnomaly._id}/remediate`, {
        method: 'POST',
        headers: { 'X-API-Key': apiKey }
      });
      if (res.ok) {
        setSelectedAnomaly(prev => prev ? { ...prev, remediationStatus: 'EXECUTING' } : null);
        fetchAnomalies();
      }
    } catch (err) {
      console.error('Failed to trigger remediation', err);
    } finally {
      setRemediating(false);
    }
  };

  const handleToggleAutoHeal = async () => {
    if (!selectedAnomaly) return;
    setUpdatingSettings(true);
    const targetState = !selectedAnomaly.autoHealEnabled;
    try {
      const res = await fetch(`/api/anomalies/${selectedAnomaly._id}/remediation-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ autoHealEnabled: targetState })
      });
      if (res.ok) {
        setSelectedAnomaly(prev => prev ? { ...prev, autoHealEnabled: targetState } : null);
        fetchAnomalies();
      }
    } catch (err) {
      console.error('Failed to update remediation settings', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="card text-center" style={{ padding: '60px 40px', marginTop: '20px' }}>
        <AlertTriangle className="nav-icon" style={{ width: '48px', height: '48px', color: 'var(--color-warn)', margin: '0 auto 16px', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.2))' }} />
        <h2 style={{ marginBottom: '8px' }}>API Key Required</h2>
        <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
          Please configure or generate an API Key in the **API Key Manager** tab to view flagged anomalies.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 className="page-title">Flagged Anomalies</h1>
          <p className="page-subtitle">AI-diagnosed service disruptions and auto-remediation logs</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'var(--color-error)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-error)' }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <span className="text-muted">Loading anomalies registry...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="card text-center" style={{ padding: '40px', borderStyle: 'dashed' }}>
          <CheckCircle size={32} style={{ color: 'var(--color-info)', marginBottom: '12px' }} />
          <h4 style={{ marginBottom: '4px' }}>All Systems Operational</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>No anomalies detected in your reporting nodes.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Service</th>
                  <th>Anomaly Type</th>
                  <th>Summary</th>
                  <th>Self-Healing</th>
                  <th>Impact</th>
                  <th>Detected At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr 
                    key={a._id} 
                    onClick={() => handleSelectAnomaly(a)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      {a.resolved ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <Check size={10} /> Resolved
                        </span>
                      ) : (
                        <span className="badge badge-error" style={{ animation: 'logo-pulse 2s infinite' }}>
                          Critical
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {a.service}
                      </span>
                    </td>
                    <td>
                      <span className={a.type === 'FATAL_ERROR' ? 'badge badge-fatal' : 'badge badge-warn'}>
                        {a.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.summary}
                      </span>
                    </td>
                    <td>
                      {a.remediationStatus === 'SUCCESS' && (
                        <span className="badge badge-info" style={{ textTransform: 'none', background: 'rgba(16,185,129,0.1)', color: 'var(--color-info)', fontSize: '0.7rem' }}>
                          Healed (Success)
                        </span>
                      )}
                      {a.remediationStatus === 'EXECUTING' && (
                        <span className="badge badge-warn" style={{ textTransform: 'none', animation: 'logo-pulse 1.5s infinite', fontSize: '0.7rem' }}>
                          Executing...
                        </span>
                      )}
                      {a.remediationStatus === 'PENDING_APPROVAL' && (
                        <span className="badge badge-warn" style={{ textTransform: 'none', background: 'rgba(245,158,11,0.08)', color: 'var(--color-warn)', fontSize: '0.7rem' }}>
                          Fix Ready
                        </span>
                      )}
                      {a.remediationStatus === 'FAILED' && (
                        <span className="badge badge-error" style={{ textTransform: 'none', fontSize: '0.7rem' }}>
                          Fix Failed
                        </span>
                      )}
                      {a.remediationStatus === 'NONE' && (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>No scripts</span>
                      )}
                    </td>
                    <td>
                      <span className="text-muted">{a.logCount} logs</span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {!a.resolved && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={(e) => handleResolveAnomaly(e, a._id)}
                            disabled={resolvingId === a._id}
                          >
                            Resolve
                          </button>
                        )}
                        <ChevronRight size={16} className="text-muted" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Diagnostic Drawer */}
      {selectedAnomaly && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedAnomaly(null)} />
          <div className="drawer" style={{ width: '640px' }}>
            <div className="drawer-header">
              <div>
                <span className="badge badge-error" style={{ marginBottom: '8px' }}>
                  {selectedAnomaly.type.replace('_', ' ')}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Diagnostic Analyzer
                </h2>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  Service: {selectedAnomaly.service}
                </p>
              </div>
              <button className="drawer-close" onClick={() => setSelectedAnomaly(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Auto-Heal Setup Toggle */}
            <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'var(--color-ai-glow)' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-Heal Engine</h4>
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                  Execute fixes immediately on anomaly detection without manual confirmation.
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleToggleAutoHeal} 
                disabled={updatingSettings}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedAnomaly.autoHealEnabled ? 'var(--color-info)' : 'var(--text-muted)' }}
              >
                {selectedAnomaly.autoHealEnabled ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
              </button>
            </div>

            {/* Self-Healing Pipeline Execution Console */}
            {selectedAnomaly.remediationStatus !== 'NONE' && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <TermIcon size={18} style={{ color: 'var(--color-ai)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>SRE Auto-Remediation Execution</h3>
                  <span className="badge" style={{ 
                    marginLeft: 'auto',
                    background: 
                      selectedAnomaly.remediationStatus === 'SUCCESS' ? 'rgba(16,185,129,0.1)' :
                      selectedAnomaly.remediationStatus === 'FAILED' ? 'rgba(239,68,68,0.1)' :
                      selectedAnomaly.remediationStatus === 'EXECUTING' ? 'rgba(245,158,11,0.1)' :
                      'rgba(255,255,255,0.05)',
                    color: 
                      selectedAnomaly.remediationStatus === 'SUCCESS' ? 'var(--color-info)' :
                      selectedAnomaly.remediationStatus === 'FAILED' ? 'var(--color-error)' :
                      selectedAnomaly.remediationStatus === 'EXECUTING' ? 'var(--color-warn)' :
                      'var(--text-muted)',
                    textTransform: 'none'
                  }}>
                    {selectedAnomaly.remediationStatus}
                  </span>
                </div>

                {/* SRE Terminal stdout Feed */}
                <div className="terminal" style={{ fontSize: '0.75rem', maxHeight: '200px', marginBottom: '12px', background: '#030304' }}>
                  <div className="terminal-header">
                    <span className="terminal-dot terminal-red"></span>
                    <span className="terminal-dot terminal-yellow"></span>
                    <span className="terminal-dot terminal-green"></span>
                    <span className="terminal-title">remediation_agent.sh</span>
                  </div>
                  {selectedAnomaly.remediationLogs && selectedAnomaly.remediationLogs.length > 0 ? (
                    selectedAnomaly.remediationLogs.map((log, idx) => (
                      <div key={idx} className="terminal-line" style={{ color: log.startsWith('[ERROR]') ? 'var(--color-error)' : log.startsWith('[SRE Terminal]') ? 'var(--color-ai)' : '#a3e635' }}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="terminal-line text-muted">Initialising shell process...</div>
                  )}
                  <div ref={terminalEndRef} />
                </div>

                {/* Remediation Approval Action Button */}
                {selectedAnomaly.remediationStatus === 'PENDING_APPROVAL' && (
                  <button 
                    className="btn" 
                    style={{ width: '100%', fontSize: '0.85rem' }} 
                    onClick={handleExecuteRemediation}
                    disabled={remediating}
                  >
                    <Play size={14} /> Approve & Execute Self-Healing Script
                  </button>
                )}
                {selectedAnomaly.remediationStatus === 'EXECUTING' && (
                  <div className="card text-center" style={{ padding: '12px', background: 'rgba(245,158,11,0.03)', borderColor: 'var(--color-warn)' }}>
                    <RefreshCw style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-warn)', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} size={16} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-warn)' }}>Remediation script is running. Patching mock configs...</span>
                  </div>
                )}
                {selectedAnomaly.remediationStatus === 'SUCCESS' && (
                  <div className="card" style={{ padding: '12px', background: 'rgba(16,185,129,0.03)', borderColor: 'var(--color-info)', color: 'var(--color-info)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> Auto-heal complete. Target sandbox file corrected. Anomaly resolved.
                  </div>
                )}
                {selectedAnomaly.remediationStatus === 'FAILED' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-danger" 
                      style={{ flex: 1, fontSize: '0.85rem' }} 
                      onClick={handleExecuteRemediation}
                      disabled={remediating}
                    >
                      Retry Execution
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={(e) => handleResolveAnomaly(e, selectedAnomaly._id)}
                    >
                      Force Resolve Manually
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Overview Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Anomaly Summary
              </h4>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                {selectedAnomaly.summary}
              </p>
            </div>

            {/* General Resolve Button if no remediation script is available */}
            {selectedAnomaly.remediationStatus === 'NONE' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                {selectedAnomaly.resolved ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-info)', fontSize: '0.875rem', fontWeight: 600 }}>
                    <CheckCircle size={16} /> Anomaly resolved.
                  </div>
                ) : (
                  <button 
                    className="btn" 
                    style={{ fontSize: '0.85rem', width: '100%' }}
                    onClick={(e) => handleResolveAnomaly(e, selectedAnomaly._id)}
                    disabled={resolvingId === selectedAnomaly._id}
                  >
                    Mark Anomaly as Resolved
                  </button>
                )}
              </div>
            )}

            {/* AI Diagnosis Area */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Brain style={{ color: 'var(--color-ai)', filter: 'drop-shadow(0 0 4px var(--color-ai-glow))' }} size={20} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Gemini Diagnostics</h3>
                <span className="badge badge-info" style={{ textTransform: 'none', background: 'var(--color-ai-bg)', color: 'var(--color-ai)', marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Sparkles size={10} /> AI Agent Ingress
                </span>
              </div>

              {insightLoading ? (
                <div className="card text-center ai-glow-card" style={{ padding: '40px' }}>
                  <RefreshCw style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-ai)', margin: '0 auto 12px' }} size={24} />
                  <h4>Generating AI Insight...</h4>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Gemini is processing logs context, correlating historical stack traces, and formulating suggested code fixes.
                  </p>
                </div>
              ) : insight ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Meta Stats Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="card" style={{ padding: '12px 16px' }}>
                      <span className="stat-label" style={{ fontSize: '0.65rem' }}>AI Severity</span>
                      <span 
                        style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 700, 
                          color: 
                            insight.severity === 'CRITICAL' ? 'var(--color-fatal)' : 
                            insight.severity === 'HIGH' ? 'var(--color-error)' : 
                            insight.severity === 'MEDIUM' ? 'var(--color-warn)' : 
                            'var(--color-info)'
                        }}
                      >
                        {insight.severity}
                      </span>
                    </div>

                    <div className="card" style={{ padding: '12px 16px' }}>
                      <span className="stat-label" style={{ fontSize: '0.65rem' }}>Model Confidence</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          {Math.round(insight.confidence * 100)}%
                        </span>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${insight.confidence * 100}%`, 
                              height: '100%', 
                              background: 'var(--color-ai)' 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="card ai-glow-card" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>
                      Root Cause Analysis
                    </h4>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                      {insight.rootCause}
                    </p>
                  </div>

                  {/* Suggested Fix */}
                  <div className="card" style={{ padding: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginBottom: '12px' }}>
                      Recommended Action / Resolution Code
                    </h4>
                    <MarkdownRenderer text={insight.fix} />
                  </div>

                  {/* Logs Context Analyzed */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      Logs Context Fed to Model
                    </h4>
                    <div className="terminal" style={{ fontSize: '0.75rem', maxHeight: '180px' }}>
                      {insight.logsAnalyzed.map((line, idx) => (
                        <div key={idx} className="terminal-line" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {line}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      Processed by {insight.model}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="card text-center" style={{ padding: '30px' }}>
                  <AlertCircle size={24} style={{ color: 'var(--color-warn)', margin: '0 auto 8px' }} />
                  <h4>No Diagnostics Generated</h4>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    Could not query analysis report from the service. Verify that the SDK or background thread was able to invoke Gemini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
