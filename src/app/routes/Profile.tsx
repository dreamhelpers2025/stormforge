import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/useAuth';
import { useProfile, usernameFromEmail } from '../stores/useProfile';
import { useToast } from '../stores/useToast';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';

const ACCENTS = ['#43C7C7', '#B88A3B', '#6ed099', '#c084fc', '#93c5fd', '#d97a7a', '#f0b450', '#D8E0E5'];
const DEFAULT_BG = 'linear-gradient(135deg, #0B1E2D 0%, #1E7C86 50%, #43C7C7 100%)';

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const profile = useProfile(s => s.profile);
  const loaded = useProfile(s => s.loaded);
  const saving = useProfile(s => s.saving);
  const hydrate = useProfile(s => s.hydrate);
  const update = useProfile(s => s.update);
  const uploadImage = useProfile(s => s.uploadImage);
  const removeImage = useProfile(s => s.removeImage);
  const push = useToast(s => s.push);

  // Draft holds the unsaved text/accent fields. Image uploads commit
  // immediately to Storage and reflect in `profile` directly — they bypass
  // the draft/save flow.
  const [draft, setDraft] = useState({
    displayName: profile.displayName,
    bio: profile.bio,
    accent: profile.accent,
  });
  const [dirty, setDirty] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loaded) hydrate(); }, [loaded, hydrate]);
  useEffect(() => {
    setDraft({
      displayName: profile.displayName,
      bio: profile.bio,
      accent: profile.accent,
    });
    setDirty(false);
  }, [profile.displayName, profile.bio, profile.accent]);

  if (!user) {
    return (
      <div style={{ padding: 60 }}>
        <EmptyState
          icon="user"
          title="Sign in first"
          description="Profiles live with your account — sign in to set yours up."
          action={<button className="btn btn-primary" onClick={() => navigate('/worlds')}>Back to worlds</button>}
        />
      </div>
    );
  }

  if (!loaded) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-mute)' }}>Loading…</div>;
  }

  const username = usernameFromEmail(user.email);
  const displayName = draft.displayName || username;

  function patch<K extends keyof typeof draft>(key: K, value: typeof draft[K]) {
    setDraft(d => ({ ...d, [key]: value }));
    setDirty(true);
  }

  async function handleUpload(kind: 'avatar' | 'background', file: File) {
    try {
      await uploadImage(kind, file);
      push(`${kind === 'avatar' ? 'Avatar' : 'Background'} updated.`, 'success');
    } catch (e: any) {
      push(`Upload failed: ${e?.message ?? 'unknown'}`, 'error');
    }
  }
  async function handleRemove(kind: 'avatar' | 'background') {
    try {
      await removeImage(kind);
      push(`${kind === 'avatar' ? 'Avatar' : 'Background'} removed.`, 'info');
    } catch (e: any) {
      push(`Remove failed: ${e?.message ?? 'unknown'}`, 'error');
    }
  }

  async function save() {
    try {
      await update(draft);
      setDirty(false);
      push('Profile saved.', 'success');
    } catch (e: any) {
      push('Save failed: ' + (e?.message ?? 'unknown'), 'error');
    }
  }

  const initial = (displayName[0] ?? username[0] ?? '?').toUpperCase();

  return (
    <div className="fade-in" style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Background banner */}
      <div style={{
        position: 'relative',
        height: 220,
        background: profile.backgroundUrl ? `url(${profile.backgroundUrl}) center/cover` : DEFAULT_BG,
        borderRadius: '0 0 0 0',
        marginBottom: 70,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
        <div style={{ position: 'absolute', top: 14, right: 18, display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-icon"
            style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            onClick={() => bgInput.current?.click()}
            title="Upload background image"
            disabled={saving}
          >
            <Icon name="image" size={14} />
          </button>
          {profile.backgroundPath && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              onClick={() => handleRemove('background')}
              title="Remove background image"
              disabled={saving}
            >
              <Icon name="x" size={14} />
            </button>
          )}
          <input
            ref={bgInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload('background', f); e.target.value = ''; }}
          />
        </div>

        {/* Avatar — overlaps banner */}
        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: -56,
            width: 112,
            height: 112,
            borderRadius: '50%',
            background: profile.avatarUrl ? `url(${profile.avatarUrl}) center/cover` : (draft.accent || 'var(--accent-2)'),
            border: '4px solid var(--bg-elev)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 44,
            fontFamily: 'Cinzel, serif',
          }}
        >
          {!profile.avatarUrl && initial}
          <button
            className="btn btn-ghost btn-icon"
            style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'var(--accent)', color: '#fff',
              borderColor: 'transparent',
              borderRadius: '50%', width: 34, height: 34,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
            onClick={() => avatarInput.current?.click()}
            title="Upload avatar"
            disabled={saving}
          >
            <Icon name="image" size={15} />
          </button>
          {profile.avatarPath && (
            <button
              className="btn btn-ghost btn-icon"
              style={{
                position: 'absolute', top: 0, right: 0,
                background: 'rgba(0,0,0,0.5)', color: '#fff',
                borderColor: 'rgba(255,255,255,0.3)',
                borderRadius: '50%', width: 26, height: 26,
              }}
              onClick={() => handleRemove('avatar')}
              title="Remove avatar"
              disabled={saving}
            >
              <Icon name="x" size={11} />
            </button>
          )}
          <input
            ref={avatarInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload('avatar', f); e.target.value = ''; }}
          />
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* Identity block */}
        <div style={{ marginBottom: 24 }}>
          <div className="text-eyebrow">Identity</div>
          <h1 className="text-display" style={{ fontSize: 32, margin: '4px 0 2px' }}>{displayName}</h1>
          <div className="text-mute" style={{ fontSize: 14 }}>
            @{username} · <span className="text-dim">{user.email}</span>
          </div>
        </div>

        {/* Edit form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              placeholder={username}
              value={draft.displayName}
              onChange={e => patch('displayName', e.target.value)}
            />
            <div className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>
              This is what others see. Your username (@{username}) is derived from your email and stays the same.
            </div>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Tell the world who you are, what you build, what you love."
              value={draft.bio}
              onChange={e => patch('bio', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Personal accent</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ACCENTS.map(c => (
                <button
                  key={c}
                  onClick={() => patch('accent', c)}
                  style={{
                    width: 32, height: 32, borderRadius: 99, background: c,
                    border: draft.accent === c ? '2px solid var(--text)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  title={c}
                />
              ))}
              <button
                onClick={() => patch('accent', undefined)}
                className="chip"
                style={{ borderStyle: 'dashed' }}
              >
                <Icon name="x" size={10} /> Clear
              </button>
            </div>
            <div className="text-dim" style={{ fontSize: 11, marginTop: 4 }}>
              Used for your avatar background and small UI flourishes (more uses coming).
            </div>
          </div>
        </div>

        <div className="rune-divider-app" style={{ margin: '22px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-dim" style={{ fontSize: 12 }}>
            {dirty ? 'You have unsaved changes' : 'Saved'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setDraft(profile); setDirty(false); }}
              disabled={!dirty}
            >
              Discard
            </button>
            <button className="btn btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
