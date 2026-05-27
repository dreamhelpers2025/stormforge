import React, { useState } from 'react';
import { useSync } from '../stores/useSync';
import { useAuth } from '../stores/useAuth';
import { resync } from '../lib/cloudSync';
import Icon from './Icon';

export default function SyncIndicator() {
  const state = useSync(s => s.state);
  const pending = useSync(s => s.pending);
  const lastSync = useSync(s => s.lastSync);
  const lastError = useSync(s => s.lastError);
  const user = useAuth(s => s.user);
  const [showDetails, setShowDetails] = useState(false);

  if (!user) {
    return (
      <div className="text-dim" style={{ fontSize: 10.5, padding: '2px 8px', textAlign: 'center' }}>
        Local only — sign in to sync
      </div>
    );
  }

  let label = 'Synced';
  let color = 'var(--success)';
  let icon: any = 'check';
  let title = lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Synced';

  if (state === 'syncing') { label = pending > 0 ? `Saving (${pending})…` : 'Syncing…'; color = 'var(--accent)'; icon = 'sparkles'; title = 'Sync in progress'; }
  else if (state === 'offline') { label = 'Offline'; color = 'var(--ember)'; icon = 'eye-off'; title = 'No network — changes will sync when reconnected'; }
  else if (state === 'error') { label = 'Sync error — retry'; color = 'var(--danger)'; icon = 'x'; title = lastError ?? 'Sync error'; }
  else if (state === 'signed-out') return null;

  const clickable = state === 'error' || state === 'offline' || state === 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <button
        className="btn btn-ghost"
        style={{ width: '100%', padding: '4px 8px', fontSize: 11, gap: 6, color, justifyContent: 'flex-start' }}
        title={title}
        onClick={() => { if (clickable) resync(); }}
      >
        <Icon name={icon} size={11} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {state === 'idle' && lastSync != null && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </button>

      {state === 'error' && lastError && (
        <div
          style={{
            padding: '6px 8px',
            background: 'rgba(217,122,122,0.08)',
            border: '1px solid rgba(217,122,122,0.3)',
            borderRadius: 6,
            fontSize: 10.5,
            lineHeight: 1.4,
            color: 'var(--danger)',
            wordBreak: 'break-word',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
            <strong style={{ fontSize: 9.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Error details</strong>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(lastError ?? ''); } catch {}
                }}
                title="Copy error to clipboard"
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontSize: 10 }}
              >
                <Icon name="link" size={10} />
              </button>
              <button
                onClick={() => setShowDetails(s => !s)}
                title={showDetails ? 'Hide' : 'Show full'}
                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0, fontSize: 10 }}
              >
                <Icon name={showDetails ? 'eye-off' : 'eye'} size={10} />
              </button>
            </div>
          </div>
          <div
            style={{
              maxHeight: showDetails ? 320 : 60,
              overflow: 'auto',
              fontFamily: showDetails ? 'ui-monospace, Menlo, monospace' : 'inherit',
              fontSize: showDetails ? 10 : 10.5,
              whiteSpace: showDetails ? 'pre-wrap' : 'normal',
            }}
          >
            {lastError}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
            Full payload also logged to browser DevTools console.
          </div>
        </div>
      )}
    </div>
  );
}
