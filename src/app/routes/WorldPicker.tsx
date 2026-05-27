import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorlds } from '../stores/useWorlds';
import { useSettings } from '../stores/useSettings';
import { useAuth } from '../stores/useAuth';
import { useMembers } from '../stores/useMembers';
import { useToast } from '../stores/useToast';
import { db } from '../db';
import { importWorld, exportWorld, downloadJSON } from '../lib/export';
import Sigil from '../components/Sigil';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

export default function WorldPicker() {
  const navigate = useNavigate();
  const worlds = useWorlds(s => s.worlds);
  const loaded = useWorlds(s => s.loaded);
  const createWorld = useWorlds(s => s.create);
  const removeWorld = useWorlds(s => s.remove);
  const setActiveWorld = useSettings(s => s.setActiveWorld);
  const push = useToast(s => s.push);
  const currentUserId = useAuth(s => s.user?.id ?? null);
  const myMemberRoles = useMembers(s => s.myMemberRoles);

  const ownedWorlds = useMemo(
    () => worlds.filter(w => !w.ownerUserId || !currentUserId || w.ownerUserId === currentUserId),
    [worlds, currentUserId]
  );
  const sharedWorlds = useMemo(
    () => worlds.filter(w => w.ownerUserId && currentUserId && w.ownerUserId !== currentUserId),
    [worlds, currentUserId]
  );

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    const w = await createWorld(name.trim());
    await setActiveWorld(w.id);
    setCreating(false);
    setName('');
    push('Realm forged.', 'success');
    navigate(`/w/${w.id}`);
  }

  async function handleExport(id: string) {
    try {
      const data = await exportWorld(id);
      downloadJSON(`${data.world.name.replace(/[^a-z0-9]+/gi, '_')}.stormforge.json`, data);
      push('World exported.', 'success');
    } catch (e: any) {
      push('Export failed: ' + e.message, 'error');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const id = await importWorld(data, { newId: true });
      await useWorlds.getState().hydrate();
      push('World imported.', 'success');
      navigate(`/w/${id}`);
    } catch (err: any) {
      push('Import failed: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  }

  if (!loaded) {
    return <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-mute)' }}>Loading archive…</div>;
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 28px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <Sigil size={64} className="text-accent" />
        </div>
        <div className="text-eyebrow">VOL. I — The Living Codex</div>
        <h1 className="text-display" style={{ fontSize: 36, margin: '8px 0' }}>Your Realms</h1>
        <p className="text-mute" style={{ maxWidth: 480, margin: '0 auto', fontSize: 14.5, lineHeight: 1.6 }}>
          Each world is a separate archive. Forge a new one or step back into one you've already begun.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-display" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} /> Forge New World
        </button>
        <button className="btn btn-ghost" onClick={() => importInputRef.current?.click()}>
          <Icon name="upload" size={14} /> Import World
        </button>
        <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      {worlds.length === 0 ? (
        <EmptyState
          icon="globe"
          title="No realms yet"
          description="Stormforge holds nothing until you place the first stone. Begin by naming a world — you can change anything later."
          action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={14} /> Forge your first world</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Worlds you own */}
          <section>
            {sharedWorlds.length > 0 && (
              <div className="text-eyebrow" style={{ marginBottom: 10 }}>Owned by you · {ownedWorlds.length}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {ownedWorlds.map(w => (
                <WorldCard
                  key={w.id}
                  world={w}
                  role={'owner'}
                  onOpen={() => { setActiveWorld(w.id); navigate(`/w/${w.id}`); }}
                  onExport={() => handleExport(w.id)}
                  onDelete={() => setConfirmDelete(w.id)}
                />
              ))}
            </div>
          </section>

          {/* Worlds shared with you */}
          {sharedWorlds.length > 0 && (
            <section>
              <div className="text-eyebrow" style={{ marginBottom: 10, color: 'var(--ember)' }}>Shared with you · {sharedWorlds.length}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {sharedWorlds.map(w => (
                  <WorldCard
                    key={w.id}
                    world={w}
                    role={myMemberRoles[w.id] ?? 'viewer'}
                    onOpen={() => { setActiveWorld(w.id); navigate(`/w/${w.id}`); }}
                    onExport={() => handleExport(w.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="text-eyebrow">Begin</div>
            <h2 className="text-display" style={{ fontSize: 22, margin: '6px 0 14px' }}>Name your realm</h2>
            <input
              autoFocus
              className="input"
              placeholder="e.g. The Sundered Sky"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Forge</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Erase this realm?"
          description="All articles, scratchpad notes, and species within will be lost. Export first if you might want it back."
          confirmLabel="Erase forever"
          danger
          onConfirm={async () => {
            await removeWorld(confirmDelete);
            setConfirmDelete(null);
            push('Realm erased.', 'info');
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

/** A single world card. Owned cards get export + delete; shared cards get export only. */
function WorldCard({
  world,
  role,
  onOpen,
  onExport,
  onDelete,
}: {
  world: { id: string; name: string; tagline: string; description: string; coverGradient: string; bannerEmoji: string; updatedAt: number };
  role: 'owner' | 'editor' | 'viewer';
  onOpen: () => void;
  onExport: () => void;
  onDelete?: () => void;
}) {
  const badgeText =
    role === 'owner' ? null :
    role === 'editor' ? 'Shared · Editor' :
    'Shared · Viewer';
  const badgeColor =
    role === 'editor' ? 'rgba(67,199,199,0.85)' :
    'rgba(184,138,59,0.85)';

  return (
    <div
      className="sf-card hoverable fade-in"
      onClick={onOpen}
      style={{ minHeight: 200, display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      <div style={{ height: 110, background: world.coverGradient, display: 'flex', alignItems: 'flex-end', padding: 12, position: 'relative' }}>
        <div style={{ fontSize: 28, position: 'absolute', top: 10, right: 12 }}>{world.bannerEmoji}</div>
        {badgeText && (
          <div
            style={{
              position: 'absolute', top: 10, left: 12,
              padding: '2px 8px', borderRadius: 99,
              background: 'rgba(0,0,0,0.45)',
              border: '1px solid ' + badgeColor,
              color: '#fff',
              fontFamily: 'Cinzel, serif',
              fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase',
              backdropFilter: 'blur(6px)',
            }}
          >
            {badgeText}
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div className="text-display" style={{ fontSize: 16, letterSpacing: '0.06em' }}>{world.name}</div>
        {world.tagline && <div className="text-serif" style={{ color: 'var(--ember)', fontStyle: 'italic', fontSize: 13 }}>{world.tagline}</div>}
        <div className="text-mute" style={{ fontSize: 12.5, lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
          {world.description || 'A realm waiting to be filled.'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div className="text-dim" style={{ fontSize: 11 }}>
            Updated {new Date(world.updatedAt).toLocaleDateString()}
          </div>
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-icon" title="Export" onClick={onExport}>
              <Icon name="download" size={13} />
            </button>
            {onDelete && (
              <button className="btn btn-ghost btn-icon" title="Delete" onClick={onDelete}>
                <Icon name="trash" size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
