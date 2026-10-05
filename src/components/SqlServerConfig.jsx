import React, { useState } from 'react';
import { getApiUrl } from '../utils/api';

export default function SqlServerConfig({ config, onUpdateConfig }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);

  const handleChange = (field, value) => {
    onUpdateConfig({ ...config, [field]: value });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(getApiUrl('/api/connection/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: config.server,
          authMode: config.authMode,
          username: config.username,
          password: config.password
        })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
        } else {
          throw new Error('Server returned an empty or non-JSON response.');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Connection failed (HTTP ${response.status})`);
      }

      setTestResult({ success: true, message: 'Connection successful', info: data.serverInfo || 'SQL Server connected' });
      onUpdateConfig({ ...config, isConnected: true, serverInfo: data.serverInfo || 'SQL Server' });
    } catch (err) {
      let msg = err.message || 'Connection failed';
      if (msg === 'Failed to fetch') {
        const isHttps = window.location.protocol === 'https:';
        if (isHttps) {
          msg = 'Failed to connect to local backend (http://127.0.0.1:3001). Web browsers block http:// connections from https:// live sites (Mixed Content restriction). To fix: (1) Ensure local backend is running (cd server && node index.js), AND (2) In Chrome/Edge, click the tune/lock icon in the address bar -> Site settings -> Set "Insecure content" to "Allow". Alternatively, run the app locally at http://localhost:5173/';
        } else {
          msg = 'Failed to connect to local backend server at http://127.0.0.1:3001. Please ensure the backend Node server is running on your machine (cd server && npm run dev).';
        }
      } else if (msg.includes('Unexpected end of JSON input')) {
        msg = 'Backend server returned an invalid or empty response. Please verify Node backend is running (cd server && node index.js) and check server console for SQL connection details.';
      }
      setTestResult({ success: false, message: msg });
      onUpdateConfig({ ...config, isConnected: false, serverInfo: null });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePruneDatabases = async () => {
    if (!window.confirm("Are you sure you want to drop all temporary 'Migration_' databases from this SQL Server?")) {
      return;
    }
    setIsPruning(true);
    setPruneResult(null);
    try {
      const response = await fetch(getApiUrl('/api/connection/cleanup-all'), {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Pruning failed');
      setPruneResult({ success: true, message: data.message });
    } catch (err) {
      let msg = err.message || 'Pruning failed';
      if (msg === 'Failed to fetch') {
        msg = 'Failed to connect to local backend server at http://127.0.0.1:3001. Ensure the Node backend (server/index.js) is running locally.';
      }
      setPruneResult({ success: false, message: msg });
    } finally {
      setIsPruning(false);
    }
  };

  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className="sql-config-section">
      {!isLocalDev && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#3b82f6',
          fontSize: '0.82rem',
          lineHeight: '1.4'
        }}>
          💡 <strong>Cloud Host Notice:</strong> Direct database connection to your local SQL Server (and <code>.BAK</code> exports to <code>C:\...</code>) requires running the app locally at <code>http://localhost:5173</code>. On live cloud hosts, use <strong>Download Combined SQL</strong> or <strong>Download ZIP</strong> to execute conversion scripts on your database.
        </div>
      )}

      <div className="input-group">
        <label htmlFor="sql-server-address">Server Address</label>
        <input
          id="sql-server-address"
          type="text"
          className="input-control"
          placeholder="localhost or server name"
          value={config.server || ''}
          onChange={(e) => handleChange('server', e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Authentication Mode</label>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <input
              type="radio"
              name="authMode"
              value="windows"
              checked={config.authMode === 'windows'}
              onChange={(e) => handleChange('authMode', e.target.value)}
              style={{ accentColor: 'var(--primary)' }}
            />
            Windows Authentication
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <input
              type="radio"
              name="authMode"
              value="sql"
              checked={config.authMode === 'sql'}
              onChange={(e) => handleChange('authMode', e.target.value)}
              style={{ accentColor: 'var(--primary)' }}
            />
            SQL Server Authentication
          </label>
        </div>
      </div>

      {config.authMode === 'sql' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="input-group">
            <label htmlFor="sql-username">Username</label>
            <input
              id="sql-username"
              type="text"
              className="input-control"
              value={config.username || ''}
              onChange={(e) => handleChange('username', e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="sql-password">Password</label>
            <input
              id="sql-password"
              type="password"
              className="input-control"
              value={config.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="input-group">
          <label htmlFor="sql-db-prefix">Database Name Prefix</label>
          <input
            id="sql-db-prefix"
            type="text"
            className="input-control"
            value={config.dbPrefix || 'Migration'}
            onChange={(e) => handleChange('dbPrefix', e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="sql-target-profile">Target Profile</label>
          <select
            id="sql-target-profile"
            className="input-control"
            value={config.targetProfile || 'sql2022'}
            onChange={(e) => handleChange('targetProfile', e.target.value)}
          >
            <option value="sql2016">SQL Server 2016</option>
            <option value="sql2017">SQL Server 2017</option>
            <option value="sql2019">SQL Server 2019</option>
            <option value="sql2022">SQL Server 2022</option>
            <option value="sql2025">SQL Server 2025</option>
            <option value="azureMI">Azure SQL MI</option>
            <option value="azureDB">Azure SQL Database</option>
          </select>
        </div>
      </div>

      <div className="input-group">
        <label htmlFor="sql-backup-dir">Backup Output Directory</label>
        <input
          id="sql-backup-dir"
          type="text"
          className="input-control"
          placeholder="C:\MigrationToSQL\exports"
          value={config.backupDir || ''}
          onChange={(e) => handleChange('backupDir', e.target.value)}
        />
        <span className="helper-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Path on the SQL Server where the .BAK file will be saved.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)' }}>
        <div className="connection-status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div 
            className={`connection-dot ${config.isConnected ? 'connected' : 'disconnected'}`} 
            style={{ 
              width: '10px', height: '10px', borderRadius: '50%', 
              background: config.isConnected ? 'var(--success)' : 'var(--error)' 
            }}
          ></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
            {config.isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {config.serverInfo && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              ({config.serverInfo})
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePruneDatabases}
            disabled={isPruning}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--error)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            {isPruning ? 'Pruning...' : 'Prune Temp Databases'}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleTestConnection}
            disabled={isTesting}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {testResult && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          borderRadius: 'var(--radius-sm)', 
          fontSize: '0.85rem',
          background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: testResult.success ? '#10b981' : '#ef4444',
          border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          {testResult.message}
        </div>
      )}

      {pruneResult && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.75rem', 
          borderRadius: 'var(--radius-sm)', 
          fontSize: '0.85rem',
          background: pruneResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: pruneResult.success ? '#10b981' : '#ef4444',
          border: `1px solid ${pruneResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          {pruneResult.message}
        </div>
      )}
    </div>
  );
}
