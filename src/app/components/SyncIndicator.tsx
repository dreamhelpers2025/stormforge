import React from 'react';
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
  );
}
