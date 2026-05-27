import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticles, EMPTY_ARTICLES } from '../stores/useArticles';
import { CATEGORIES, CATEGORY_MAP } from '../lib/categories';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import type { ArticleCategory } from '../types';

interface Props {
  category?: ArticleCategory;
}

export default function ArticlesList({ category }: Props) {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const articles = useArticles(s => s.byWorld[worldId] ?? EMPTY_ARTICLES) as any;
  const createArticle = useArticles(s => s.create);

  const [q, setQ] = useState('');
  const [filterCat, setFilterCat] = useState<ArticleCategory | null>(category ?? null);
  const [sort, setSort] = useState<'updated' | 'created' | 'alpha'>('updated');

  const filtered = useMemo(() => {
    // Folders are tree-only containers; never list them as articles.
    let list = articles.filter((a: any) => a.category !== 'folder');
    const cat = category ?? filterCat;
    if (cat) list = list.filter((a: any) => a.category === cat);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((a: any) =>
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.contentText.toLowerCase().includes(query) ||
        a.tags.some((t: string) => t.toLowerCase().includes(query))
      );
    }
    list = [...list];
    if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'created') list.sort((a, b) => b.createdAt - a.createdAt);
    else list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }, [articles, q, filterCat, sort, category]);

  async function quickCreate(cat: ArticleCategory) {
    const a = await createArticle(worldId, cat);
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  const heading = category ? CATEGORY_MAP[category].plural : 'All Articles';
  const headingDescription = category ? CATEGORY_MAP[category].description : 'Every entry in this archive';

  return (
    <div className="fade-in" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="text-eyebrow">Archive</div>
          <h1 className="text-display" style={{ fontSize: 28, margin: '4px 0' }}>{heading}</h1>
          <div className="text-mute" style={{ fontSize: 13 }}>{headingDescription}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {category ? (
            <button className="btn btn-primary" onClick={() => quickCreate(category)}>
              <Icon name="plus" size={13} /> New {CATEGORY_MAP[category].label}
            </button>
          ) : (
            <NewArticleMenu onPick={quickCreate} />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
            <Icon name="search" size={14} />
          </div>
          <input
            className="input"
            placeholder="Search this archive…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        {!category && (
          <select className="select" style={{ width: 'auto' }} value={filterCat ?? ''} onChange={e => setFilterCat((e.target.value || null) as any)}>
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.plural}</option>)}
          </select>
        )}
        <select className="select" style={{ width: 'auto' }} value={sort} onChange={e => setSort(e.target.value as any)}>
          <option value="updated">Recently updated</option>
          <option value="created">Recently created</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={category ? CATEGORY_MAP[category].icon as any : 'codex'}
          title={q ? 'No matches' : 'Nothing here yet'}
          description={q ? 'Try a different search term.' : (category ? `Forge your first ${CATEGORY_MAP[category].label.toLowerCase()}.` : 'Use the New button to begin.')}
          action={!q && category && <button className="btn btn-primary" onClick={() => quickCreate(category)}><Icon name="plus" size={13} /> New {CATEGORY_MAP[category].label}</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map(a => {
            const c = CATEGORY_MAP[a.category];
            return (
              <div key={a.id} className="sf-card hoverable" style={{ padding: 14 }} onClick={() => navigate(`/w/${worldId}/articles/${a.id}`)}>
                {a.imageDataUrl && (
                  <div style={{ height: 100, marginBottom: 10, borderRadius: 8, background: `url(${a.imageDataUrl}) center/cover`, border: '1px solid var(--border)' }} />
                )}
                <div className="text-eyebrow" style={{ color: c.accent }}>{c.label}</div>
                <div className="text-display" style={{ fontSize: 16, margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {a.meta?.icon && <span style={{ fontSize: 18 }}>{a.meta.icon}</span>}
                  <span>{a.title}</span>
                </div>
                <div className="text-mute" style={{ fontSize: 12.5, lineHeight: 1.5, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>
                  {a.summary || a.contentText.slice(0, 160) || <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>No content yet</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                  {a.pinned && <span title="Pinned"><Icon name="star" size={11} /></span>}
                  <span>Updated {new Date(a.updatedAt).toLocaleDateString()}</span>
                  {a.tags.slice(0, 3).map(t => <span key={t} className="chip" style={{ padding: '1px 6px', fontSize: 10 }}>{t}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewArticleMenu({ onPick }: { onPick: (c: ArticleCategory) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-primary" onClick={() => setOpen(o => !o)}>
        <Icon name="plus" size={13} /> New Article <Icon name="chevron-down" size={11} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div className="sf-card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 31, width: 280, padding: 8, maxHeight: 400, overflowY: 'auto' }}>
            {CATEGORIES.map(c => (
              <div
                key={c.key}
                onClick={() => { onPick(c.key); setOpen(false); }}
                style={{ padding: '7px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(67,199,199,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <Icon name={c.icon as any} size={14} className="text-accent" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
