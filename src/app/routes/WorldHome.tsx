import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorlds, WORLD_GRADIENTS } from '../stores/useWorlds';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { CATEGORIES, CATEGORY_MAP, GROUPS } from '../lib/categories';
import { randomPrompt } from '../lib/prompts';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';

export default function WorldHome() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const worlds = useWorlds(s => s.worlds);
  const updateWorld = useWorlds(s => s.update);
  const articles = useArticles(s => s.byWorld[worldId] ?? []);
  const createArticle = useArticles(s => s.create);
  const push = useToast(s => s.push);

  const world = worlds.find(w => w.id === worldId);
  const [editingMeta, setEditingMeta] = useState(false);
  const [meta, setMeta] = useState({ name: '', tagline: '', description: '', bannerEmoji: '', coverGradient: '' });
  const [prompt] = useState(() => randomPrompt());

  useEffect(() => {
    if (world) setMeta({
      name: world.name,
      tagline: world.tagline,
      description: world.description,
      bannerEmoji: world.bannerEmoji,
      coverGradient: world.coverGradient,
    });
  }, [worldId, world]);

  const stats = useMemo(() => {
    const out: { key: string; label: string; n: number; icon: any }[] = [];
    for (const c of CATEGORIES) {
      const n = articles.filter(a => a.category === c.key).length;
      if (n > 0) out.push({ key: c.key, label: c.plural, n, icon: c.icon });
    }
    return out;
  }, [articles]);

  if (!world) {
    return <EmptyState title="World not found" description="It may have been erased. Return to the world list." />;
  }

  const recent = [...articles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const pinned = articles.filter(a => a.pinned);

  async function saveMeta() {
    await updateWorld(worldId, meta);
    setEditingMeta(false);
    push('Realm updated.', 'success');
  }

  async function quickCreate(cat: string) {
    const a = await createArticle(worldId, cat as any);
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 80px' }}>
      {/* Cover banner */}
      <div className="world-cover" style={{ background: world.coverGradient, marginBottom: 24 }}>
        <div style={{ position: 'absolute', top: 14, right: 18, fontSize: 36 }}>{world.bannerEmoji}</div>
        <div className="world-cover-body">
          <div className="text-eyebrow" style={{ color: '#ffffffb0' }}>Realm of</div>
          <h1 className="text-display" style={{ fontSize: 38, color: '#fff', margin: '4px 0 6px', letterSpacing: '0.05em' }}>{world.name}</h1>
          {world.tagline && <div className="text-serif" style={{ fontStyle: 'italic', fontSize: 17, color: '#ffffffd0' }}>{world.tagline}</div>}
        </div>
        <button className="btn btn-ghost btn-icon" style={{ position: 'absolute', bottom: 14, right: 18, background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => setEditingMeta(true)} title="Edit world">
          <Icon name="edit" size={14} />
        </button>
      </div>

      {/* Description */}
      <div className="sf-card" style={{ padding: 22, marginBottom: 22 }}>
        {world.description ? (
          <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.65, fontSize: 15, color: 'var(--text-mute)' }}>{world.description}</p>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div className="text-mute" style={{ fontSize: 14, fontStyle: 'italic' }}>No description yet. What is this realm? A wounded empire? A new earth?</div>
            <button className="btn btn-ghost" onClick={() => setEditingMeta(true)}><Icon name="edit" size={13} /> Describe it</button>
          </div>
        )}
      </div>

      {/* Stats / quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 22 }}>
        {stats.length === 0 ? (
          <div className="sf-card" style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center' }}>
            <div className="text-mute" style={{ fontSize: 13 }}>No entries yet. Use the sidebar or the quick actions below to begin.</div>
          </div>
        ) : stats.map(s => (
          <div key={s.key} className="sf-card hoverable" onClick={() => navigate(`/w/${worldId}/category/${s.key}`)} style={{ padding: 14, textAlign: 'center' }}>
            <div className="text-accent" style={{ display: 'inline-flex', marginBottom: 4 }}><Icon name={s.icon} size={20} /></div>
            <div className="text-display" style={{ fontSize: 24 }}>{s.n}</div>
            <div className="text-mute" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div className="text-eyebrow" style={{ marginBottom: 10 }}>Pinned</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {pinned.map(a => (
              <div key={a.id} className="sf-card hoverable" style={{ padding: 14 }} onClick={() => navigate(`/w/${worldId}/articles/${a.id}`)}>
                <div className="text-eyebrow" style={{ color: 'var(--text-mute)' }}>{CATEGORY_MAP[a.category].label}</div>
                <div className="text-display" style={{ fontSize: 15, margin: '4px 0' }}>{a.title}</div>
                {a.summary && <div className="text-mute" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{a.summary}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Two columns: recent + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'flex-start' }}>
        <section className="sf-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.18em' }}>RECENT ENTRIES</div>
            <button className="btn btn-ghost" onClick={() => navigate(`/w/${worldId}/articles`)}>View all <Icon name="arrow-right" size={12} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="text-mute" style={{ fontSize: 13, padding: '12px 0' }}>Nothing forged yet.</div>
          ) : (
            <div>
              {recent.map(a => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/w/${worldId}/articles/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(67,199,199,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <Icon name={CATEGORY_MAP[a.category].icon as any} size={15} className="text-accent" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{CATEGORY_MAP[a.category].label} · {new Date(a.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sf-card" style={{ padding: 16 }}>
            <div className="text-display" style={{ fontSize: 13, letterSpacing: '0.2em', marginBottom: 10 }}>QUICK FORGE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {['species', 'character', 'place', 'magic_system', 'language', 'item', 'conflict', 'history'].map(k => {
                const c = CATEGORY_MAP[k as any];
                return (
                  <button key={k} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => quickCreate(k)}>
                    <Icon name={c.icon as any} size={13} /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sf-card" style={{ padding: 16 }}>
            <div className="text-eyebrow">Writing prompt</div>
            <div className="text-serif" style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.55, color: 'var(--text)', margin: '8px 0 10px' }}>
              "{prompt}"
            </div>
            <button className="btn btn-ghost" onClick={() => navigate(`/w/${worldId}/prompts`)}>More prompts <Icon name="arrow-right" size={11} /></button>
          </div>
        </section>
      </div>

      {/* Edit modal */}
      {editingMeta && (
        <div className="modal-backdrop" onClick={() => setEditingMeta(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 95vw)' }}>
            <div className="text-eyebrow">Edit realm</div>
            <h2 className="text-display" style={{ fontSize: 20, margin: '6px 0 16px' }}>{world.name}</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label className="label">Name</label>
                <input className="input" value={meta.name} onChange={e => setMeta(m => ({ ...m, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Tagline</label>
                <input className="input" value={meta.tagline} placeholder="e.g. A world where the sky has a memory" onChange={e => setMeta(m => ({ ...m, tagline: e.target.value }))} />
              </div>
              <div>
                <label className="label">Banner Emoji</label>
                <input className="input" maxLength={4} value={meta.bannerEmoji} onChange={e => setMeta(m => ({ ...m, bannerEmoji: e.target.value }))} style={{ maxWidth: 100, fontSize: 22, textAlign: 'center' }} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="textarea" rows={5} value={meta.description} placeholder="Tell us about this realm. Tone, era, what makes it different." onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Cover</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {WORLD_GRADIENTS.map(g => (
                    <button
                      key={g}
                      onClick={() => setMeta(m => ({ ...m, coverGradient: g }))}
                      style={{
                        width: 64, height: 38, borderRadius: 8, background: g,
                        border: meta.coverGradient === g ? '2px solid var(--accent)' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setEditingMeta(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveMeta}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
