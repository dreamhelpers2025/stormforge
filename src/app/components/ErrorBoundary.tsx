import React from 'react';
import Sigil from './Sigil';
import Icon from './Icon';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

/**
 * App-wide error boundary. Without this, any runtime error in the React tree
 * unmounts the whole UI and the user sees the dark body background — a
 * "black screen of death." This boundary catches the error, shows a useful
 * panel, and offers recovery options.
 */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Stormforge] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg)',
        }}
      >
        <div style={{ maxWidth: 720, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
            <Sigil size={48} className="text-accent" />
            <div>
              <div className="text-eyebrow" style={{ color: 'var(--danger)' }}>Stormforge — Crash</div>
              <h1 className="text-display" style={{ fontSize: 22, margin: '4px 0 0' }}>
                Something broke while rendering.
              </h1>
            </div>
          </div>

          <p className="text-mute" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
            Your data is safe — this only stopped the screen from rendering. Try the steps below in order;
            the first one usually fixes it. If it persists, copy the error details at the bottom and send
            them along.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                // soft reload
                location.reload();
              }}
              style={{ justifyContent: 'flex-start' }}
            >
              <Icon name="undo" size={14} /> Reload the page
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                // hard reload bypass cache
                location.replace(location.href.split('#')[0]);
              }}
              style={{ justifyContent: 'flex-start' }}
            >
              <Icon name="home" size={14} /> Reload without any hash route (start at world picker)
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                try { localStorage.removeItem('stormforge.auth'); } catch {}
                try { localStorage.removeItem('stormforge.theme'); } catch {}
                Object.keys(localStorage).forEach(k => {
                  if (k.startsWith('stormforge.')) localStorage.removeItem(k);
                });
                location.reload();
              }}
              style={{ justifyContent: 'flex-start' }}
            >
              <Icon name="settings" size={14} /> Reset interface preferences only (keeps your worlds)
            </button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm('This will erase all worlds in this browser. Are you ABSOLUTELY sure? You will lose work that hasn\'t been synced to the cloud or exported.')) return;
                if (!confirm('Last chance. This cannot be undone. Erase all local data?')) return;
                try {
                  const dbReq = indexedDB.deleteDatabase('stormforge');
                  await new Promise((resolve) => { dbReq.onsuccess = resolve; dbReq.onerror = resolve; dbReq.onblocked = resolve; });
                } catch {}
                try {
                  Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('stormforge.') || k.startsWith('sb-')) localStorage.removeItem(k);
                  });
                } catch {}
                location.reload();
              }}
              style={{ justifyContent: 'flex-start' }}
            >
              <Icon name="trash" size={14} /> Nuclear option: erase ALL local data (cloud-synced worlds re-download on next sign-in)
            </button>
          </div>

          <details className="sf-card" style={{ padding: 14 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-mute)' }}>
              Error details (paste these to me to help debug)
            </summary>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 11.5,
                fontFamily: 'ui-monospace, Menlo, monospace',
                color: 'var(--text)',
                background: 'var(--bg-elev-2)',
                padding: 10,
                borderRadius: 6,
                marginTop: 8,
                maxHeight: 240,
                overflow: 'auto',
              }}
            >
              {error?.name}: {error?.message}
              {'\n\n'}
              {error?.stack ?? '(no stack)'}
              {errorInfo?.componentStack ? `\n\nComponent stack:${errorInfo.componentStack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
