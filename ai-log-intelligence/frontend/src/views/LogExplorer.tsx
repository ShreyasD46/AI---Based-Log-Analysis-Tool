import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Terminal, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';

interface Log {
  _id: string;
  service: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  type: string;
  meta?: any;
  environment: string;
  timestamp: string;
}

interface LogExplorerProps {
  apiKey: string;
}

export default function LogExplorer({ apiKey }: LogExplorerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [service, setService] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Selected Log for metadata detail view modal
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  const fetchLogs = async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (search) params.append('search', search);
      if (level) params.append('level', level);
      if (service) params.append('service', service);
      if (start) params.append('start', start);
      if (end) params.append('end', end);

      const res = await fetch(`/api/logs?${params.toString()}`, {
        headers: { 'X-API-Key': apiKey }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setPages(data.pagination?.pages || 1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch logs. Verify connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [apiKey, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // reset to page 1
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setLevel('');
    setService('');
    setStart('');
    setEnd('');
    setPage(1);
  };

  if (!apiKey) {
    return (
      <div className="card text-center" style={{ padding: '60px 40px', marginTop: '20px' }}>
        <Terminal className="nav-icon" style={{ width: '48px', height: '48px', color: 'var(--text-muted)', margin: '0 auto 16px', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.05))' }} />
        <h2 style={{ marginBottom: '8px' }}>API Key Required</h2>
        <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
          Please configure or generate an API Key in the **API Key Manager** tab to access the Log Explorer database.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 className="page-title">Log Explorer</h1>
          <p className="page-subtitle">Granular indexing, search queries, and trace inspections</p>
        </div>
      </div>

      {/* Filter / Search Form */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px 24px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '16px', marginBottom: '16px' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={12} /> Message Search
              </span>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. timeout, referenceerror..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={12} /> Severity
              </span>
              <select className="select" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">ALL LEVELS</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="FATAL">FATAL</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={12} /> Service
              </span>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. auth-service" 
                value={service}
                onChange={e => setService(e.target.value)}
              />
            </div>

            <div className="input-group" style={{ marginBottom: 0 }}>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} /> Timeframe (Start / End)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="datetime-local" 
                  className="input" 
                  style={{ padding: '8px 10px', fontSize: '0.8rem', flex: 1 }}
                  value={start}
                  onChange={e => setStart(e.target.value)}
                />
                <input 
                  type="datetime-local" 
                  className="input" 
                  style={{ padding: '8px 10px', fontSize: '0.8rem', flex: 1 }}
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
              Reset Filters
            </button>
            <button type="submit" className="btn">
              Query Logs
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error)', background: 'rgba(239,68,68,0.03)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', marginBottom: '24px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span className="text-muted">Querying log indices...</span>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }} className="text-muted">
            No matching log entries found. Modify your search parameters and try again.
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Severity</th>
                    <th>Service</th>
                    <th>Classifier Type</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    let badgeClass = 'badge-info';
                    if (log.level === 'DEBUG') badgeClass = 'badge-debug';
                    else if (log.level === 'WARN') badgeClass = 'badge-warn';
                    else if (log.level === 'ERROR') badgeClass = 'badge-error';
                    else if (log.level === 'FATAL') badgeClass = 'badge-fatal';

                    return (
                      <tr 
                        key={log._id} 
                        onDoubleClick={() => setSelectedLog(log)}
                        title="Double-click to view metadata payload"
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>{log.level}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          {log.service}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: log.type !== 'GENERAL' && log.type !== 'UNKNOWN' ? 'var(--color-ai)' : 'var(--text-muted)' }}>
                            {log.type || 'GENERAL'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-color)' }}>
              <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                Showing <b>{logs.length}</b> of <b>{total}</b> log entries
              </span>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px' }}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Page {page} of {pages}
                </span>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px' }}
                  onClick={() => setPage(p => Math.min(p + 1, pages))}
                  disabled={page === pages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedLog(null)} style={{ zIndex: 110 }} />
          <div 
            className="card" 
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              width: '560px', 
              zIndex: 111, 
              maxHeight: '80vh', 
              overflowY: 'auto',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Log Context & Metadata</h3>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }} className="text-muted">ID: {selectedLog._id}</span>
              </div>
              <button className="drawer-close" onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Timestamp</span>
                <span>{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Service</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedLog.service}</span>
                </div>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Environment</span>
                  <span>{selectedLog.environment}</span>
                </div>
              </div>

              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '2px' }}>Message</span>
                <span style={{ display: 'block', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', wordBreak: 'break-all' }}>
                  {selectedLog.message}
                </span>
              </div>

              <div>
                <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Meta Payload (json)</span>
                <pre className="code-container" style={{ margin: 0, fontSize: '0.75rem', padding: '12px' }}>
                  <code>{JSON.stringify(selectedLog.meta || {}, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
