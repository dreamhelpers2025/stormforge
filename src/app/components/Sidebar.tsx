import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon';
import Sigil from './Sigil';
import AuthButton from './AuthButton';
import SyncIndicator from './SyncIndicator';
import NewArticleGallery from './NewArticleGallery';
import { useWorlds } from '../stores/useWorlds';
import { useSettings } from '../stores/useSettings';
import { useArticles, EMPTY_ARTICLES } from '../stores/useArticles';
import { CATEGORIES, CATEGORY_MAP, GROUPS } from '../lib/categories';
import type { Article } from '../types';

export default function Sidebar() {
  const { worldId, articleId } = useParams();
  const navigate = useNavigate();
  const worlds = useWorlds(s => s.worlds);
  const world = worlds.find(w => w.id === worldId);
  const theme = useSettings(s => s.settings.theme);
  const setTheme = useSettings(s => s.setTheme);
  const articles = useArticles(s => (worldId ? (s.byWorld[worldId] ?? EMPTY_ARTICLES) : EMPTY_ARTICLES)) as unknown as Article[];
  const loadArticles = useArticles(s => s.loadWorld);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (worldId) loadArticles(worldId); }, [worldId, loadArticles]);

  // Group articles by category, only include categories that have articles
  const articlesByCat = useMemo(() => {
    const out: Record<string, Article[]> = {};
    for (const a of articles) {
      (out[a.category] = out[a.category] ?? []).push(a);
    }
    // Sort articles within each category alphabetically
    for (const k in out) out[k] = out[k].sort((a, b) => a.title.localeCompare(b.title));
    return out;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(a => a.title.toLowerCase().includes(q));
  }, [articles, search]);

  const filteredByCat = useMemo(() => {
    const out: Record<string, Article[]> = {};
    for (const a of filteredArticles) {
      (out[a.category] = out[a.category] ?? []).push(a);
    }
    for (const k in out) out[k] = out[k].sort((a, b) => a.title.localeCompare(b.title));
    return out;
  }, [filteredArticles]);

  function toggle(group: string) {
    setCollapsed(c => ({ ...c, [group]: !c[group] }));
  }

  function articleIcon(a: Article): string | null {
    return a.meta?.icon || null;
  }

  return (
    <aside className="sidebar scrollbar-thin" style={{ overflowY: 'auto' }}>
      <div style={{ padding: '18px 16px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => navigate('/worlds')}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
          title="All worlds"
        >
          <Sigil size={36} />
        </button>
        <div style={{ lineHeight: 1.1, minWidth: 0, flex: 1 }}>
          <div className="text-display" style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text)' }}>STORMFORGE</div>
          <div className="text-serif" style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--ember)', letterSpacing: '0.2em' }}>— ARCHIVE —</div>
        </div>
      </div>

      {/* World switcher */}
      <div style={{ padding: '8px 14px 12px' }}>
        <button
          className="sf-card hoverable"
          onClick={() => navigate('/worlds')}
          style={{
            width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
            background: world ? world.coverGradient : 'var(--panel-2)',
            border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', color: '#fff',
            textAlign: 'left', minHeight: 56,
          }}
          title="Switch world"
        >
          <div style={{ fontSize: 22 }}>{world?.bannerEmoji ?? '🜂'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="text-display" style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {world ? world.name : 'Choose a world'}
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>Click to switch</div>
          </div>
          <Icon name="chevron-down" size={14} />
        </button>
      </div>

      {worldId ? (
        <>
          {/* Prominent new article button */}
          <div style={{ padding: '0 14px 10px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setNewArticleOpen(true)}
              style={{ width: '100%', fontSize: 12 }}
              title="Create a new article from a template or scratch"
            >
              <Icon name="plus" size={13} /> New Article
            </button>
          </div>

          <div className="sidebar-section">
            <NavLink to={`/w/${worldId}`} end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="home" size={15} /> World Home
            </NavLink>
            <NavLink to={`/w/${worldId}/articles`} end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="codex" size={15} /> All Articles
            </NavLink>
            <NavLink to={`/w/${worldId}/maps`} className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="map" size={15} /> Maps
            </NavLink>
            <NavLink to={`/w/${worldId}/scratchpad`} className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="feather" size={15} /> Scratchpad
            </NavLink>
          </div>

          {/* My articles section */}
          <div className="sidebar-group" style={{ marginTop: 14 }}>
            <span>My Articles</span>
            {articles.length > 0 && (
              <span style={{ color: 'var(--text-dim)', letterSpacing: 0, textTransform: 'none' }}>
                {articles.length}
              </span>
            )}
          </div>

          {/* Quick filter input */}
          {articles.length > 5 && (
            <div style={{ padding: '0 14px 6px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                  <Icon name="search" size={12} />
                </div>
                <input
                  className="input"
                  placeholder="Filter…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 26, fontSize: 12, padding: '5px 8px 5px 26px' }}
                />
              </div>
            </div>
          )}

          {articles.length === 0 ? (
            <div style={{ padding: '4px 18px 12px' }}>
              <div className="text-mute" style={{ fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
                No articles yet. Click <strong style={{ color: 'var(--accent)' }}>+ New Article</strong> above to begin.
              </div>
            </div>
          ) : (
            GROUPS.map(g => {
              const catsInGroup = CATEGORIES.filter(c => c.group === g.key);
              const visibleCats = catsInGroup.filter(c => (filteredByCat[c.key]?.length ?? 0) > 0);
              if (visibleCats.length === 0) return null;
              const isCollapsed = collapsed[g.key];
              return (
                <div key={g.key} style={{ paddingBottom: 4 }}>
                  <div
                    className="sidebar-group"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    onClick={() => toggle(g.key)}
                  >
                    <span>{g.label}</span>
                    <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={11} />
                  </div>
                  {!isCollapsed && (
                    <div className="sidebar-section">
                      {visibleCats.map(c => {
                        const arts = filteredByCat[c.key] ?? [];
                        const catCollapseKey = `cat:${c.key}`;
                        const catCollapsed = collapsed[catCollapseKey];
                        return (
                          <div key={c.key} style={{ marginBottom: 2 }}>
                            <div
                              className="sidebar-link"
                              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', paddingRight: 6 }}
                              onClick={() => toggle(catCollapseKey)}
                            >
                              <Icon name={c.icon as any} size={14} style={{ color: c.accent } as any} />
                              <span style={{ flex: 1, fontSize: 12.5 }}>{c.label}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{arts.length}</span>
                              <Icon name={catCollapsed ? 'chevron-right' : 'chevron-down'} size={10} />
                            </div>
                            {!catCollapsed && (
                              <div style={{ paddingLeft: 22 }}>
                                {arts.map(a => {
                                  const customIcon = articleIcon(a);
                                  const isActive = articleId === a.id;
                                  return (
                                    <NavLink
                                      key={a.id}
                                      to={`/w/${worldId}/articles/${a.id}`}
                                      className={'sidebar-link' + (isActive ? ' active' : '')}
                                      title={a.title}
                                      style={{ fontSize: 12, padding: '4px 10px' }}
                                    >
                                      {customIcon ? (
                                        <span style={{ fontSize: 12, marginRight: 2 }}>{customIcon}</span>
                                      ) : (
                                        <span style={{ width: 12, color: 'var(--text-dim)' }}>·</span>
                                      )}
                                      <span style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                      }}>
                                        {a.title}
                                      </span>
                                    </NavLink>
                                  );
                                })}
                                <NavLink
                                  to={`/w/${worldId}/category/${c.key}`}
                                  className="sidebar-link"
                                  style={{ fontSize: 11, color: 'var(--text-dim)', padding: '3px 10px' }}
                                >
                                  Open all {c.plural.toLowerCase()} →
                                </NavLink>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      ) : (
        <div className="sidebar-section" style={{ padding: '8px 18px' }}>
          <div className="text-mute" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Select or create a world to begin filling its archive.
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AuthButton />
        <SyncIndicator />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'parchment' : 'tempest'} theme`}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          </button>
          <NavLink to="/settings" className={({ isActive }) => 'btn btn-ghost btn-icon' + (isActive ? ' active' : '')} title="Settings">
            <Icon name="settings" size={15} />
          </NavLink>
          <div style={{ flex: 1, textAlign: 'right', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
            VOL · I
          </div>
        </div>
      </div>

      <NewArticleGallery open={newArticleOpen} onClose={() => setNewArticleOpen(false)} />
    </aside>
  );
}
