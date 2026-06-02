import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Copy, AlertTriangle, HelpCircle } from 'lucide-react';

interface ApiKeyRecord {
  _id: string;
  name: string;
  services: string[];
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
}

interface KeysViewProps {
  onSelectKey: (key: string) => void;
}

export default function KeysView({ onSelectKey }: KeysViewProps) {
  const [keysList, setKeysList] = useState<ApiKeyRecord[]>([]);
  const [keyName, setKeyName] = useState('');
  const [allowedServices, setAllowedServices] = useState('gateway-service, auth-service, payment-service');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrationLang, setIntegrationLang] = useState<'ts' | 'js' | 'curl'>('ts');

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      if (res.ok) {
        const data = await res.json();
        setKeysList(data);
      }
    } catch (err) {
      console.error('Failed to load keys', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;

    try {
      const servicesArray = allowedServices
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '');

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName, services: servicesArray })
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedKey(data.apiKey);
        setKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error('Failed to generate key', err);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Services using it will be immediately blocked.')) return;
    try {
      const res = await fetch(`/api/keys/${id}/revoke`, { method: 'POST' });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error('Failed to revoke key', err);
    }
  };

  const handleCopyKey = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="header-row">
        <div>
          <h1 className="page-title">API Keys Portal</h1>
          <p className="page-subtitle">Generate client credentials and view developer documentation</p>
        </div>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
        {/* API Key Form & List */}
        <div>
          {/* Key Generation Widget */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: 'var(--color-ai)' }} /> Generate Developer Key
            </h3>
            
            <form onSubmit={handleGenerateKey}>
              <div className="input-group">
                <label className="label">Key Name / Client App</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Production Microservice Cluster" 
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label className="label">Allowed Services (Comma separated)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. gateway-service, billing-service" 
                  value={allowedServices}
                  onChange={e => setAllowedServices(e.target.value)}
                />
              </div>

              <button type="submit" className="btn" style={{ width: '100%' }}>
                Create API Credentials
              </button>
            </form>

            {createdKey && (
              <div style={{ marginTop: '20px', padding: '16px', border: '1px solid var(--color-warn)', background: 'rgba(245,158,11,0.03)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warn)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
                  <AlertTriangle size={14} />
                  <span>Important: Copy your key now. You won't be able to see it again.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input" 
                    readOnly 
                    value={createdKey} 
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', background: '#050608' }}
                  />
                  <button className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={handleCopyKey}>
                    {copied ? <Check size={16} style={{ color: 'var(--color-info)' }} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Keys Registry */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Credentials</h3>
            </div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }} className="text-muted">
                Retrieving active keys...
              </div>
            ) : keysList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center' }} className="text-muted">
                No developer keys created yet. Generate one above.
              </div>
            ) : (
              <div className="table-container" style={{ marginTop: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Allowed Services</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keysList.map(k => (
                      <tr 
                        key={k._id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => k.isActive && onSelectKey(k.name === 'Simulation Agent' ? 'Simulation Agent' : k._id /* wait, we'll store hashes so we let the user select/write key in header banner. But for simulation ease we can allow selecting simulated ones or let them paste */)}
                      >
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, display: 'block' }}>{k.name}</span>
                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                              Created: {new Date(k.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '200px' }}>
                            {k.services.map((s, idx) => (
                              <span key={idx} style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {k.isActive ? (
                            <span className="badge badge-info">Active</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>Revoked</span>
                          )}
                        </td>
                        <td>
                          {k.isActive && k.name !== 'Simulation Agent' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px', color: 'var(--color-error)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeKey(k._id);
                              }}
                              title="Revoke Key"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Integration Documentation */}
        <div className="card" style={{ height: '100%' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} style={{ color: 'var(--color-ai)' }} /> Quickstart SDK Setup
          </h3>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '20px' }}>
            Integrate our telemetry collector into your applications in 3 simple steps:
          </p>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-muted">1. INSTALL DEPENDENCY</span>
            <pre className="code-container" style={{ margin: '6px 0 16px', fontSize: '0.8rem', padding: '12px' }}>
              <code>npm install log-ai-tool</code>
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-muted">2. INITIALIZE CLIENT</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span 
                  onClick={() => setIntegrationLang('ts')}
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: integrationLang === 'ts' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  TS
                </span>
                <span 
                  onClick={() => setIntegrationLang('js')}
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: integrationLang === 'js' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  JS
                </span>
                <span 
                  onClick={() => setIntegrationLang('curl')}
                  style={{ fontSize: '0.7rem', fontWeight: 600, color: integrationLang === 'curl' ? '#fff' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  Curl
                </span>
              </div>
            </div>

            {integrationLang === 'ts' && (
              <pre className="code-container" style={{ margin: 0, fontSize: '0.75rem', padding: '12px' }}>
                <code>{`import logAI from 'log-ai-tool';

logAI.init({
  apiKey: 'logai_your_api_key_here',
  service: 'payment-service',
  baseUrl: 'http://localhost:3001'
});

// Logs are batched & sent in background
logAI.info('Payment checkout initialized', { userId: 'usr_8492' });`}</code>
              </pre>
            )}

            {integrationLang === 'js' && (
              <pre className="code-container" style={{ margin: 0, fontSize: '0.75rem', padding: '12px' }}>
                <code>{`const { logAI } = require('log-ai-tool');

logAI.init({
  apiKey: 'logai_your_api_key_here',
  service: 'auth-service',
  baseUrl: 'http://localhost:3001'
});

// Standard severity calls
logAI.warn('DB connections high', { poolUsage: 0.85 });`}</code>
              </pre>
            )}

            {integrationLang === 'curl' && (
              <pre className="code-container" style={{ margin: 0, fontSize: '0.75rem', padding: '12px', whiteSpace: 'pre-wrap' }}>
                <code>{`curl -X POST http://localhost:3001/api/logs/batch \\
  -H "X-API-Key: logai_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "logs": [
      {
        "service": "billing-service",
        "level": "ERROR",
        "message": "Gateway timeout during checkout",
        "environment": "production"
      }
    ]
  }'`}</code>
              </pre>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }} className="text-muted">3. START TELEMETRY</span>
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px', lineHeight: 1.4 }}>
              Once telemetry logs are received, the backend will process and index logs. If anomalies (e.g. error rate spikes or fatal exceptions) are caught, the system will trigger **Gemini diagnostics** automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
