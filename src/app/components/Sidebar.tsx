import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon from './Icon';
import Sigil from './Sigil';
import { useWorlds } from '../stores/useWorlds';
import { useSettings } from '../stores/useSettings';
import { CATEGORIES, GROUPS } from '../lib/categories';

export default function Sidebar() {
  const { worldId } = useParams();
  const navigate = useNavigate();
  const worlds = useWorlds(s => s.worlds);
  const world = worlds.find(w => w.id === worldId);
  const theme = useSettings(s => s.settings.theme);
  const setTheme = useSettings(s => s.setTheme);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof CATEGORIES> = {};
    for (const c of CATEGORIES) {
      groups[c.group] = groups[c.group] ?? [];
      groups[c.group].push(c);
    }
    return groups;
  }, []);

  function toggle(group: string) {
    setCollapsed(c => ({ ...c, [group]: !c[group] }));
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
          <div className="sidebar-section">
            <NavLink to={`/w/${worldId}`} end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="home" size={15} /> World Home
            </NavLink>
            <NavLink to={`/w/${worldId}/articles`} end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="codex" size={15} /> All Articles
            </NavLink>
            <NavLink to={`/w/${worldId}/scratchpad`} className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="feather" size={15} /> Scratchpad
            </NavLink>
            <NavLink to={`/w/${worldId}/prompts`} className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
              <Icon name="sparkles" size={15} /> Writing Prompts
            </NavLink>
          </div>

          {GROUPS.map(g => {
            const cats = groupedCategories[g.key] ?? [];
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
                    {cats.map(c => (
                      <NavLink
                        key={c.key}
                        to={`/w/${worldId}/category/${c.key}`}
                        className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                      >
                        <Icon name={c.icon as any} size={15} /> {c.plural}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div className="sidebar-section" style={{ padding: '8px 18px' }}>
          <div className="text-mute" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Select or create a world to begin filling its archive.
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
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
    </aside>
  );
}
