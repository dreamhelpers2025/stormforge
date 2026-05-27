import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES, GROUPS, CATEGORY_MAP } from '../lib/categories';
import { useArticles } from '../stores/useArticles';
import Icon from './Icon';
import type { ArticleCategory } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NewArticleGallery({ open, onClose }: Props) {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const createArticle = useArticles(s => s.create);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return CATEGORIES;
    return CATEGORIES.filter(c =>
      c.label.toLowerCase().includes(query) ||
      c.plural.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    );
  }, [q]);

  if (!open) return null;

  async function pick(category: ArticleCategory) {
    const a = await createArticle(worldId, category);
    onClose();
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  async function blank() {
    // "Note" category is the closest to start-from-scratch; create empty
    const a = await createArticle(worldId, 'note', 'Untitled');
    onClose();
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(960px, 96vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div className="text-eyebrow">Forge</div>
            <h2 className="text-display" style={{ fontSize: 22, margin: '4px 0 0' }}>Begin a new article</h2>
            <p className="text-mute" style={{ fontSize: 13, marginTop: 4 }}>
              Choose a template — each one comes with a curated set of prompt questions you can pick from. Or start blank.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
            <Icon name="search" size={14} />
          </div>
          <input
            className="input"
            autoFocus
            placeholder="Filter templates… (e.g. species, language, magic)"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
          {/* Start from scratch — always at top, ignores filter */}
          {!q && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={blank}
                className="sf-card hoverable"
                style={{
                  width: '100%', padding: 16, textAlign: 'left',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(67,199,199,0.10), rgba(184,138,59,0.06))',
                  border: '1px dashed var(--border-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'var(--panel-2)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent)',
                  }}>
                    <Icon name="feather" size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="text-display" style={{ fontSize: 15 }}>Start from scratch</div>
                    <div className="text-mute" style={{ fontSize: 12.5, marginTop: 2 }}>
                      Blank article — no template, no prompts. Pure writing.
                    </div>
                  </div>
                  <Icon name="arrow-right" size={14} className="text-accent" />
                </div>
              </button>
            </div>
          )}

          {GROUPS.map(g => {
            const groupCats = filtered.filter(c => c.group === g.key);
            if (groupCats.length === 0) return null;
            return (
              <section key={g.key} style={{ marginBottom: 18 }}>
                <div className="text-eyebrow" style={{ marginBottom: 8 }}>{g.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                  {groupCats.map(c => (
                    <button
                      key={c.key}
                      onClick={() => pick(c.key)}
                      className="sf-card hoverable"
                      style={{
                        padding: 12, textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: 'var(--panel-2)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: c.accent,
                        flexShrink: 0,
                      }}>
                        <Icon name={c.icon as any} size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-display" style={{ fontSize: 13.5, letterSpacing: '0.08em' }}>{c.label}</div>
                        <div className="text-mute" style={{ fontSize: 11.5, lineHeight: 1.45, marginTop: 2 }}>
                          {c.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-mute" style={{ padding: 40, textAlign: 'center', fontStyle: 'italic' }}>
              No matching templates.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
