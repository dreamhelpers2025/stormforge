import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon';
import Sigil from './Sigil';
import AuthButton from './AuthButton';
import SyncIndicator from './SyncIndicator';
import NewArticleGallery from './NewArticleGallery';
import SidebarTree from './SidebarTree';
import { useWorlds } from '../stores/useWorlds';
import { useSettings } from '../stores/useSettings';
import { useArticles, EMPTY_ARTICLES } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { useAuth } from '../stores/useAuth';
import { useMembers } from '../stores/useMembers';
import type { Article } from '../types';

export default function Sidebar() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const worlds = useWorlds(s => s.worlds);
  const world = worlds.find(w => w.id === worldId);
  const theme = useSettings(s => s.settings.theme);
  const setTheme = useSettings(s => s.setTheme);
  const articles = useArticles(s => (worldId ? (s.byWorld[worldId] ?? EMPTY_ARTICLES) : EMPTY_ARTICLES)) as unknown as Article[];
  const loadArticles = useArticles(s => s.loadWorld);
  const createFolder = useArticles(s => s.createFolder);
  const push = useToast(s => s.push);

  // Role gating for non-owners
  const currentUserId = useAuth(s => s.user?.id ?? null);
  const myMemberRoles = useMembers(s => s.myMemberRoles);
  const currentWorld = worlds.find(w => w.id === worldId);
  const isOwner = !!currentWorld && (!currentWorld.ownerUserId || currentWorld.ownerUserId === currentUserId);
  const canEdit = isOwner || (worldId ? myMemberRoles[worldId] === 'editor' : false);

  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');

  useEffect(() => { if (worldId) loadArticles(worldId); }, [worldId, loadArticles]);

  const filteredArticles = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    // When searching, return matching articles + their ancestor folders so the tree still makes sense
    const matches = new Set(articles.filter(a => a.title.toLowerCase().includes(q)).map(a => a.id));
    if (matches.size === 0) return [];
    const byId = new Map<string, Article>();
    for (const a of articles) byId.set(a.id, a);
    const include = new Set(matches);
    for (const id of matches) {
      let cur = byId.get(id)?.meta?.parentId as string | undefined;
      while (cur) {
        include.add(cur);
        cur = byId.get(cur)?.meta?.parentId as string | undefined;
      }
    }
    return articles.filter(a => include.has(a.id));
  })();

  async function handleCreateFolder() {
    if (!worldId || !folderName.trim()) return;
    await createFolder(worldId, folderName.trim());
    setCreatingFolder(false);
    setFolderName('');
    push('Folder created.', 'success');
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
          {/* New article + new folder — editors only */}
          {canEdit && (
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6 }}>
              <button
                className="btn btn-primary"
                onClick={() => setNewArticleOpen(true)}
                style={{ flex: 1, fontSize: 12 }}
                title="Create a new article from a template or scratch"
              >
                <Icon name="plus" size={13} /> New Article
              </button>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => { setCreatingFolder(true); setFolderName(''); }}
                title="Create a folder"
              >
                📁
              </button>
            </div>
          )}

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

          {/* My articles section header */}
          <div className="sidebar-group" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>My Articles</span>
            {articles.length > 0 && (
              <span style={{ color: 'var(--text-dim)', letterSpacing: 0, textTransform: 'none' }}>
                {articles.filter(a => a.category !== 'folder').length}
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

          {/* The tree */}
          <SidebarTree articles={filteredArticles} />
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

      {/* New folder modal */}
      {creatingFolder && (
        <div className="modal-backdrop" onClick={() => setCreatingFolder(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="text-eyebrow">Folder</div>
            <h2 className="text-display" style={{ fontSize: 18, margin: '6px 0 12px' }}>Name your folder</h2>
            <input
              autoFocus
              className="input"
              placeholder="e.g. House Vorelith, Northern Reaches…"
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
            />
            <p className="text-mute" style={{ fontSize: 12, marginTop: 8 }}>
              You can drag articles into the folder. Folders can contain other folders.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setCreatingFolder(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!folderName.trim()} onClick={handleCreateFolder}>Create folder</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
