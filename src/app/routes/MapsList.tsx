import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMaps, EMPTY_MAPS } from '../stores/useMaps';
import { useToast } from '../stores/useToast';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MapsList() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const maps = useMaps(s => s.byWorld[worldId] ?? EMPTY_MAPS) as any;
  const loadMaps = useMaps(s => s.loadWorld);
  const createMap = useMaps(s => s.create);
  const removeMap = useMaps(s => s.remove);
  const push = useToast(s => s.push);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { if (worldId) loadMaps(worldId); }, [worldId, loadMaps]);

  async function handleCreate() {
    if (!name.trim()) return;
    const m = await createMap(worldId, name);
    setCreating(false);
    setName('');
    push('Map created.', 'success');
    navigate(`/w/${worldId}/maps/${m.id}`);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="text-eyebrow">Cartography</div>
          <h1 className="text-display" style={{ fontSize: 28, margin: '4px 0' }}>Maps</h1>
          <div className="text-mute" style={{ fontSize: 13 }}>Every realm wants to be drawn. Pin lore, divide kingdoms, mark battles.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={13} /> New Map
        </button>
      </div>

      {maps.length === 0 ? (
        <EmptyState
          icon="map"
          title="No maps yet"
          description="Draw your first map. Add pins for places, regions for factions, hotspots for lore."
          action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={13} /> Begin a map</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {maps.map((m: any) => (
            <div key={m.id} className="sf-card hoverable" onClick={() => navigate(`/w/${worldId}/maps/${m.id}`)} style={{ overflow: 'hidden' }}>
              <div style={{
                aspectRatio: m.aspectRatio || (16 / 9),
                background: m.background?.startsWith('data:') ? `url(${m.background}) center/cover` : m.background,
                position: 'relative',
                borderBottom: '1px solid var(--border)',
              }}>
                {m.pins.slice(0, 12).map((p: any) => (
                  <span key={p.id} style={{
                    position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
                    width: 8, height: 8, transform: 'translate(-50%,-50%)',
                    borderRadius: 999, background: p.color || '#43C7C7',
                    boxShadow: '0 0 10px rgba(67,199,199,0.7)',
                  }} />
                ))}
              </div>
              <div style={{ padding: 14 }}>
                <div className="text-display" style={{ fontSize: 15, marginBottom: 2 }}>{m.name}</div>
                <div className="text-mute" style={{ fontSize: 12 }}>{m.pins.length} pins · {m.regions.length} regions</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <div className="text-dim" style={{ fontSize: 11 }}>{new Date(m.updatedAt).toLocaleDateString()}</div>
                  <button className="btn btn-ghost btn-icon" title="Delete" onClick={e => { e.stopPropagation(); setConfirmDelete(m.id); }}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="text-eyebrow">New map</div>
            <h2 className="text-display" style={{ fontSize: 20, margin: '6px 0 14px' }}>Name your map</h2>
            <input
              autoFocus className="input"
              placeholder="e.g. The Continent of Vaerithyn"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Erase this map?"
          description="The map, its pins and regions will be lost. The linked articles remain."
          confirmLabel="Erase"
          danger
          onConfirm={async () => {
            await removeMap(confirmDelete);
            setConfirmDelete(null);
            push('Map erased.', 'info');
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
