import React, { useState } from 'react';
import { useMembers } from '../stores/useMembers';
import { useToast } from '../stores/useToast';
import type { WorldMember } from '../types';
import Icon from './Icon';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  worldId: string;
  worldName: string;
  isOwner: boolean;
}

export default function MembersPanel({ worldId, worldName, isOwner }: Props) {
  const members = useMembers(s => s.byWorld[worldId] ?? []);
  const invite = useMembers(s => s.invite);
  const changeRole = useMembers(s => s.changeRole);
  const removeMember = useMembers(s => s.removeMember);
  const push = useToast(s => s.push);

  const [open, setOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('editor');
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<WorldMember | null>(null);

  if (!isOwner) return null; // Only owners manage members

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setInviting(true);
    try {
      await invite(worldId, value, role);
      push(`Invited ${value} as ${role}. They’ll get access on next sign-in.`, 'success');
      setEmail('');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setInviting(false);
    }
  }

  async function doRemove(m: WorldMember) {
    try {
      await removeMember(m.id);
      push('Removed.', 'info');
    } catch (e: any) {
      push('Remove failed: ' + (e?.message ?? String(e)), 'error');
    } finally {
      setConfirmRemove(null);
    }
  }

  async function doChangeRole(m: WorldMember, next: 'viewer' | 'editor') {
    if (m.role === next) return;
    try {
      await changeRole(m.id, next);
    } catch (e: any) {
      push('Role change failed: ' + (e?.message ?? String(e)), 'error');
    }
  }

  return (
    <div className="sf-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div className="text-eyebrow">Sharing</div>
          <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.18em', marginTop: 4 }}>
            COLLABORATORS · {members.length}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(o => !o)}>
          <Icon name={open ? 'chevron-down' : 'plus'} size={13} />
          {open ? 'Done' : 'Invite'}
        </button>
      </div>

      {open && (
        <form onSubmit={handleInvite} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              className="input"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
              autoFocus
              required
            />
            <select
              className="select"
              value={role}
              onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
              style={{ width: 'auto' }}
            >
              <option value="viewer">Viewer — read only</option>
              <option value="editor">Editor — can edit</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={inviting}>
              {inviting ? 'Inviting…' : 'Send invite'}
            </button>
          </div>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>
              {error}
            </div>
          )}
          <div className="text-dim" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
            Your collaborator gets access the moment they sign into Stormforge with that email.
            Send them the URL: <strong>stormforgebuilder.com/app</strong> and tell them to sign in
            with this email — they&apos;ll see <strong>{worldName}</strong> in their world picker.
          </div>
        </form>
      )}

      {members.length === 0 ? (
        <div className="text-mute" style={{ fontSize: 12.5, fontStyle: 'italic', padding: '6px 0' }}>
          No one else has access yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => {
            const status = m.acceptedAt != null ? 'Joined' : 'Pending';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: m.acceptedAt ? 'var(--accent-2)' : 'rgba(184,138,59,0.4)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontFamily: 'Cinzel, serif',
                  }}
                >
                  {(m.email[0] ?? '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email}
                  </div>
                  <div style={{ fontSize: 11, color: m.acceptedAt ? 'var(--text-dim)' : 'var(--ember)' }}>
                    {status}
                    {m.acceptedAt ? ` · ${new Date(m.acceptedAt).toLocaleDateString()}` : ' · invited ' + new Date(m.invitedAt).toLocaleDateString()}
                  </div>
                </div>
                <select
                  className="select"
                  value={m.role}
                  onChange={e => doChangeRole(m, e.target.value as 'viewer' | 'editor')}
                  style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                  title="Change role"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  className="btn btn-ghost btn-icon"
                  title="Remove collaborator"
                  onClick={() => setConfirmRemove(m)}
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title={`Remove ${confirmRemove.email}?`}
          description="They lose access immediately. Their personal scratchpad notes (if any) stay with them."
          confirmLabel="Remove"
          danger
          onConfirm={() => doRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
