import { useState, useEffect, useRef } from 'react';
import { Activity, Brain, Sparkles, Terminal, Play, ArrowRight, CheckCircle, RefreshCw, GitBranch, Key, AlertTriangle } from 'lucide-react';

interface LandingPageViewProps {
  onLaunchConsole: () => void;
}

export default function LandingPageView({ onLaunchConsole }: LandingPageViewProps) {
  // Playground interactive state machine
  const [demoState, setDemoState] = useState<'IDLE' | 'CRASHED' | 'DIAGNOSING' | 'WAITING_APPROVAL' | 'HEALING' | 'RESOLVED'>('IDLE');
  const [demoLogs, setDemoLogs] = useState<string[]>([
    '[09:04:12] [INFO] [gateway-service] Gateway initialized: GET /api/v1/health',
    '[09:04:13] [INFO] [auth-service] JWT Token verified for user usr_4812',
    '[09:04:15] [INFO] [gateway-service] Routing request: POST /api/v1/checkout'
  ]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const appendLogsWithDelay = (newLogs: string[], delay: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setDemoLogs(prev => [...prev, ...newLogs]);
        resolve();
      }, delay);
    });
  };

  const handleTriggerCrash = async () => {
    setDemoState('CRASHED');
    setDemoLogs(prev => [...prev, '[09:04:16] [SRE Terminal] Warning: stripe connection high latency...']);
    
    await appendLogsWithDelay([
      '[09:04:17] [WARN] [payment-service] stripe-api-v3 response slow: 2800ms delay',
      '[09:04:17] [ERROR] [payment-service] Connection refused by payment gateway at stripe-api-v3.com:27018',
      '[09:04:18] [ERROR] [payment-service] Socket connection timeout during charge execution',
      '[09:04:18] [FATAL] [payment-service] MongoDB replica set connection failed. Pool size at 0/100.',
      '🚨 [SRE Worker] 12 consecutive error logs detected. Anomaly spike created.'
    ], 800);

    setDemoState('DIAGNOSING');
    await appendLogsWithDelay([
      '🧠 [Gemini Agent] Triggering telemetry context correlation...',
      '🧠 [Gemini Agent] Correlating error signatures across gateway-service and payment-service...',
      '🧠 [Gemini Agent] Severity: HIGH | Confidence: 94%',
      '🧠 [Gemini Agent] Diagnosis: STRIPE_API_PORT is misconfigured to port 27018 in sandbox/payment-service.env. Port 27017 expected.',
      '🧠 [Gemini Agent] Actionable patch script generated. Awaiting SRE approval.'
    ], 1500);

    setDemoState('WAITING_APPROVAL');
  };

  const handleExecuteFix = async () => {
    setDemoState('HEALING');
    setDemoLogs(prev => [...prev, '⚙️ [Remediator] Spawning auto-heal execution context...']);

    await appendLogsWithDelay([
      '⚙️ [Remediator] Executing: node sandbox/temp_fix_checkout.js',
      '✅ [SRE Terminal] Auto-remediated Stripe/MongoDB connection config in sandbox/payment-service.env',
      '✅ [SRE Terminal] File updated: STRIPE_API_PORT changed from 27018 to 27017',
      '✅ [SRE Terminal] File updated: STRIPE_TIMEOUT raised from 500ms to 5000ms',
      '[SRE Terminal] Auto-remediation COMPLETED successfully (exit code 0).'
    ], 1200);

    setDemoState('RESOLVED');
    await appendLogsWithDelay([
      '🎉 [System] Anomaly spike resolved. Stripe gateway status returning 200 OK.',
      '[09:04:22] [INFO] [gateway-service] Route GET /api/v1/checkout completed in 14ms'
    ], 1000);
  };

  const handleResetDemo = () => {
    setDemoState('IDLE');
    setDemoLogs([
      '[09:04:12] [INFO] [gateway-service] Gateway initialized: GET /api/v1/health',
      '[09:04:13] [INFO] [auth-service] JWT Token verified for user usr_4812',
      '[09:04:15] [INFO] [gateway-service] Routing request: POST /api/v1/checkout'
    ]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [demoLogs]);

  return (
    <div className="landing-body">
      {/* Header */}
      <header className="landing-header">
        <div className="logo-container" style={{ margin: 0 }}>
          <span className="logo-dot"></span>
          <span className="logo-text">LogIntelligence</span>
        </div>
        <div>
          <button className="btn btn-secondary glow-btn" onClick={onLaunchConsole}>
            Launch Console <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div>
          <div className="hero-badge">
            <Sparkles size={12} />
            <span>AI-Driven SRE Self-Healing Engine</span>
          </div>
          <h1 className="hero-title">
            Log Ingestion. AI Diagnostics. Auto-Healing.
          </h1>
          <p className="hero-subtitle">
            A high-performance telemetry platform that aggregates client logs, flags error spikes using sliding-window metrics, and executes automated correction scripts powered by Google Gemini.
          </p>
          <div className="hero-ctas">
            <button className="btn glow-btn" onClick={onLaunchConsole} style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Launch Console Workspace
            </button>
            <a 
              href="https://github.com/ShreyasD46/AI---Based-Log-Analysis-Tool.git" 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary" 
              style={{ padding: '14px 28px', fontSize: '0.95rem' }}
            >
              View on GitHub
            </a>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700 }}>&lt; 3KB</span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Buffered In-Memory SDK</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
            <div>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700 }}>Zero</span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Third-Party Chart Bloat</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
            <div>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700 }}>100%</span>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Offline Safe Fallbacks</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Terminal Playground */}
        <div className="hero-interactive-preview">
          <div className="pulse-indicator"></div>
          <div className="floating-glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} className="text-muted" /> Live Sandbox Simulation
              </span>
              {demoState !== 'IDLE' && (
                <button 
                  onClick={handleResetDemo}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                  Reset Demo
                </button>
              )}
            </div>

            {/* SRE Ingestion terminal */}
            <div className="terminal" style={{ fontSize: '0.75rem', height: '240px', background: '#030406', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="terminal-header">
                <span className="terminal-dot terminal-red"></span>
                <span className="terminal-dot terminal-yellow"></span>
                <span className="terminal-dot terminal-green"></span>
                <span className="terminal-title">bash - simulated_agent.sh</span>
              </div>
              {demoLogs.map((log, index) => {
                let color = 'inherit';
                if (log.startsWith('🚨') || log.includes('[ERROR]') || log.includes('[FATAL]')) color = 'var(--color-error)';
                else if (log.includes('[WARN]')) color = 'var(--color-warn)';
                else if (log.startsWith('🧠')) color = 'var(--color-ai)';
                else if (log.startsWith('⚙️')) color = '#38bdf8';
                else if (log.startsWith('✅')) color = 'var(--color-info)';
                else if (log.startsWith('🎉')) color = '#a3e635';

                return (
                  <div key={index} className="terminal-line" style={{ color }}>
                    {log}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Control panel buttons */}
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              {demoState === 'IDLE' && (
                <button className="btn" style={{ width: '100%', fontSize: '0.85rem' }} onClick={handleTriggerCrash}>
                  Trigger Simulated Database Exception
                </button>
              )}
              {demoState === 'CRASHED' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> Error Spike detected. Initiating AI diagnostics...
                </div>
              )}
              {demoState === 'DIAGNOSING' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-ai)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Gemini is reading logs history...
                </div>
              )}
              {demoState === 'WAITING_APPROVAL' && (
                <button className="btn" style={{ width: '100%', fontSize: '0.85rem', background: 'var(--color-info)' }} onClick={handleExecuteFix}>
                  <Play size={12} fill="currentColor" /> Approve & Apply Auto-Healing Fix
                </button>
              )}
              {demoState === 'HEALING' && (
                <div style={{ fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Patching config files...
                </div>
              )}
              {demoState === 'RESOLVED' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} /> Anomaly auto-remediated. System running healthy!
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Matrix Section */}
      <section className="landing-section">
        <span className="section-label">Features Grid</span>
        <h2 className="section-title">Telemetry Meets AI Self-Healing</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Activity size={20} />
            </div>
            <h3 className="feature-title">Ultra-Light Ingress SDK</h3>
            <p className="feature-description">
              A &lt; 3KB zero-dependency TS package. Collects, batches, and flushes log payloads in background worker threads, complete with jittered backoff retries on network drops.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Brain size={20} />
            </div>
            <h3 className="feature-title">Gemini SRE Diagnostics</h3>
            <p className="feature-description">
              Google Gemini parses historical log context surrounding alert spikes to identify the root cause, determine severity, and write precise mitigation scripts.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Terminal size={20} />
            </div>
            <h3 className="feature-title">Self-Healing Execution</h3>
            <p className="feature-description">
              Spawns local execution environments to apply AI-generated node patch scripts to config files in real-time, resolving alerts with no developer overhead.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Sparkles size={20} />
            </div>
            <h3 className="feature-title">Auto-Heal vs Approval Gates</h3>
            <p className="feature-description">
              Persist service settings. Choose between immediate automatic script execution (Auto-Heal) or require manual SRE clicks to execute patch scripts.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <GitBranch size={20} />
            </div>
            <h3 className="feature-title">Zero Layout Shift Analytics</h3>
            <p className="feature-description">
              Custom SVG charting lines that render metrics instantly without loading layout shifts or importing heavy charting libraries.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Key size={20} />
            </div>
            <h3 className="feature-title">Developer Security Vault</h3>
            <p className="feature-description">
              Generates API credentials and checks client connections. Keys are stored safely in MongoDB as SHA-256 hashes, matching modern enterprise security specs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 LogIntelligence. Built for SRE and DevOps telemetry portfolios. MIT Licensed.</p>
      </footer>
    </div>
  );
}
