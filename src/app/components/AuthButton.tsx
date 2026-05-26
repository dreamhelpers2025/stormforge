import React, { useState } from 'react';
import { useAuth } from '../stores/useAuth';
import { useToast } from '../stores/useToast';
import Icon from './Icon';

export default function AuthButton() {
  const user = useAuth(s => s.user);
  const signOut = useAuth(s => s.signOut);
  const signIn = useAuth(s => s.signInWithEmail);
  const signingIn = useAuth(s => s.signingIn);
  const push = useToast(s => s.push);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSignIn() {
    if (!email.trim()) return;
    const { error } = await signIn(email);
    if (error) {
      push(error, 'error');
      return;
    }
    setSent(true);
  }

  if (user) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12 }}
          onClick={() => setOpen(o => !o)}
          title="Account"
        >
          <span style={{
            width: 24, height: 24, borderRadius: 99, background: 'var(--accent-2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontSize: 11, fontFamily: 'Cinzel, serif',
          }}>
            {(user.email?.[0] ?? 'U').toUpperCase()}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
            {user.email}
          </span>
          <Icon name="chevron-down" size={12} />
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <div className="sf-card" style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 41, padding: 6 }}>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={async () => { await signOut(); setOpen(false); push('Signed out. Your local copy is still here.', 'info'); }}
              >
                <Icon name="x" size={13} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        className="btn btn-primary"
        style={{ width: '100%', fontSize: 12 }}
        onClick={() => { setOpen(true); setSent(false); }}
        title="Sign in to sync across devices"
      >
        <Icon name="upload" size={13} /> Sign in to sync
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="text-eyebrow">Stormforge</div>
            <h2 className="text-display" style={{ fontSize: 20, margin: '6px 0 10px' }}>
              {sent ? 'Check your inbox' : 'Sign in to sync your worlds'}
            </h2>

            {sent ? (
              <>
                <p className="text-mute" style={{ fontSize: 14, lineHeight: 1.55 }}>
                  A magic link was sent to <strong>{email}</strong>. Open it on this device to sign in. The link expires in an hour.
                </p>
                <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>
                  If you don't see it, check spam.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-mute" style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 10 }}>
                  We'll email you a magic link — no password. Signing in uploads your existing worlds to the cloud and keeps them in sync across devices. Your data stays private to you.
                </p>
                <input
                  className="input"
                  type="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); if (e.key === 'Escape') setOpen(false); }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSignIn} disabled={signingIn || !email.trim()}>
                    {signingIn ? 'Sending…' : 'Send magic link'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
