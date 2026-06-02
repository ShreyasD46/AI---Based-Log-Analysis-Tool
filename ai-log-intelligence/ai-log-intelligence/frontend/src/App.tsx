import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Search, Key, Shield, KeyRound, Home } from 'lucide-react';
import DashboardView from './views/DashboardView';
import AnomaliesView from './views/AnomaliesView';
import LogExplorer from './views/LogExplorer';
import KeysView from './views/KeysView';
import LandingPageView from './views/LandingPageView';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'app'>('landing');
  const [activeView, setActiveView] = useState<'dashboard' | 'anomalies' | 'logs' | 'keys'>('dashboard');
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('logai_api_key') || '';
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    localStorage.setItem('logai_api_key', apiKey);
  }, [apiKey]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(apiKeyInput.trim());
    setShowKeyInput(false);
  };

  const handleQuickSelectKey = (key: string) => {
    setApiKey(key);
  };

  if (currentRoute === 'landing') {
    return <LandingPageView onLaunchConsole={() => setCurrentRoute('app')} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <span className="logo-dot"></span>
          <span className="logo-text">LogIntelligence</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <button 
                className="nav-item"
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                onClick={() => setCurrentRoute('landing')}
              >
                <Home className="nav-icon" />
                <span>Back to Home</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                onClick={() => setActiveView('dashboard')}
              >
                <Activity className="nav-icon" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeView === 'anomalies' ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                onClick={() => setActiveView('anomalies')}
              >
                <AlertTriangle className="nav-icon" />
                <span>Anomalies</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeView === 'logs' ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                onClick={() => setActiveView('logs')}
              >
                <Search className="nav-icon" />
                <span>Log Explorer</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeView === 'keys' ? 'active' : ''}`}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                onClick={() => setActiveView('keys')}
              >
                <Key className="nav-icon" />
                <span>API Key Manager</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            <Shield size={12} />
            <span>v1.0.0-production</span>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Top API Key Config Banner */}
        <div className="key-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <KeyRound size={20} style={{ color: apiKey ? 'var(--color-info)' : 'var(--color-warn)' }} />
            <div>
              <span className="key-banner-text">
                {apiKey ? (
                  <>
                    Active Key: <code className="key-banner-highlight" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {apiKey.slice(0, 10)}...{apiKey.slice(-6)}
                    </code>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-warn)', fontWeight: 600 }}>
                    ⚠️ No API Key Configured. Connect a client to begin analysis.
                  </span>
                )}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {showKeyInput ? (
              <form onSubmit={handleSaveKey} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="input" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  placeholder="Paste raw logai_... API Key"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Save</button>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowKeyInput(false)}>Cancel</button>
              </form>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => {
                  setApiKeyInput(apiKey);
                  setShowKeyInput(true);
                }}
              >
                {apiKey ? 'Change Key' : 'Configure Key'}
              </button>
            )}
          </div>
        </div>

        {/* View Switcher */}
        {activeView === 'dashboard' && <DashboardView apiKey={apiKey} />}
        {activeView === 'anomalies' && <AnomaliesView apiKey={apiKey} />}
        {activeView === 'logs' && <LogExplorer apiKey={apiKey} />}
        {activeView === 'keys' && <KeysView onSelectKey={handleQuickSelectKey} />}
      </main>
    </div>
  );
}
