import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { buildTree, computeOrder, isAncestor, type TreeNode } from '../lib/tree';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { CATEGORY_MAP } from '../lib/categories';
import Icon from './Icon';
import ConfirmDialog from './ConfirmDialog';
import type { Article, ArticleCategory } from '../types';

interface Props {
  articles: Article[];
}

const STORAGE_KEY = (worldId: string) => `stormforge.tree.expanded.${worldId}`;

export default function SidebarTree({ articles }: Props) {
  const { worldId = '', articleId } = useParams();
  const navigate = useNavigate();
  const updateArticle = useArticles(s => s.update);
  const reparent = useArticles(s => s.reparent);
  const removeArticle = useArticles(s => s.remove);
  const removeRecursive = useArticles(s => s.removeRecursive);
  const push = useToast(s => s.push);

  // Delete confirm state — track the article being deleted
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  // Persisted expand state — folders default to expanded
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY(worldId));
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY(worldId), JSON.stringify([...expanded])); } catch {}
  }, [expanded, worldId]);

  // DnD state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string | 'root'; position: 'before' | 'after' | 'inside' } | null>(null);

  const tree = useMemo(() => buildTree(articles), [articles]);

  function toggle(id: string) {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Build a flat siblings list for ordering calculations
  function siblingsOf(parentId: string | undefined): Article[] {
    return articles.filter(a => (a.meta?.parentId as string | undefined) === parentId);
  }

  async function onDrop(targetId: string | 'root', position: 'before' | 'after' | 'inside') {
    setDropTarget(null);
    if (!dragId) return;
    const setDragNull = () => setDragId(null);
    try {
      if (dragId === targetId) return;
      // Prevent dropping a folder into its own descendant
      if (targetId !== 'root' && isAncestor(dragId, targetId, articles)) return;

      let newParentId: string | undefined;
      let order: number;

      if (targetId === 'root') {
        newParentId = undefined;
        const sibs = siblingsOf(undefined);
        order = computeOrder(sibs, sibs.length, dragId);
      } else {
        const targetArticle = articles.find(a => a.id === targetId);
        if (!targetArticle) return;
        if (position === 'inside') {
          // Make targetArticle the parent
          newParentId = targetArticle.id;
          const sibs = siblingsOf(targetArticle.id);
          order = computeOrder(sibs, sibs.length, dragId);
          // auto-expand the parent so you can see the moved item
          setExpanded(prev => new Set([...prev, targetArticle.id]));
        } else {
          // Reorder among target's siblings
          newParentId = targetArticle.meta?.parentId as string | undefined;
          const sibs = siblingsOf(newParentId);
          const sortedSibs = [...sibs].sort((a, b) => ((a.meta?.order as number) ?? 0) - ((b.meta?.order as number) ?? 0));
          let targetIdx = sortedSibs.findIndex(a => a.id === targetArticle.id);
          if (targetIdx < 0) targetIdx = sortedSibs.length;
          const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
          order = computeOrder(sibs, insertAt, dragId);
        }
      }

      await reparent(dragId, newParentId, order);
    } finally {
      setDragNull();
    }
  }

  if (tree.length === 0) {
    return (
      <div style={{ padding: '8px 18px' }}>
        <div className="text-mute" style={{ fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' }}>
          No articles yet. Click <strong style={{ color: 'var(--accent)' }}>+ New Article</strong> above to begin.
        </div>
      </div>
    );
  }

  // Counts for the delete confirm dialog
  const deleteTargetChildren = useMemo(() => {
    if (!deleteTarget) return 0;
    // BFS for descendants
    const childrenByParent = new Map<string, string[]>();
    for (const a of articles) {
      const pid = a.meta?.parentId as string | undefined;
      if (pid) {
        const arr = childrenByParent.get(pid) ?? [];
        arr.push(a.id);
        childrenByParent.set(pid, arr);
      }
    }
    let count = 0;
    const queue = [deleteTarget.id];
    while (queue.length) {
      const cur = queue.shift()!;
      const kids = childrenByParent.get(cur) ?? [];
      count += kids.length;
      queue.push(...kids);
    }
    return count;
  }, [deleteTarget, articles]);

  async function handleOrphanAndDelete() {
    if (!deleteTarget) return;
    const t = deleteTarget;
    setDeleteTarget(null);
    // useArticles.remove already orphans children to root
    if (articleId === t.id) navigate(`/w/${worldId}`);
    await removeArticle(t.id);
    push(t.category === 'folder' ? 'Folder removed (contents moved to root).' : 'Article removed.', 'success');
  }

  async function handleCascadeDelete() {
    if (!deleteTarget) return;
    const t = deleteTarget;
    const count = deleteTargetChildren + 1;
    setDeleteTarget(null);
    if (articleId === t.id) navigate(`/w/${worldId}`);
    // Best-effort: if we're viewing one of the descendants, navigate away too
    await removeRecursive(t.id);
    push(`Removed ${count} item${count === 1 ? '' : 's'}.`, 'success');
  }

  return (
    <div>
      {tree.map(node => (
        <TreeRow
          key={node.article.id}
          node={node}
          expanded={expanded}
          onToggle={toggle}
          activeId={articleId}
          dragId={dragId}
          dropTarget={dropTarget}
          setDragId={setDragId}
          setDropTarget={setDropTarget}
          onDrop={onDrop}
          worldId={worldId}
          onRename={async (id, title) => { await updateArticle(id, { title }); }}
          onRequestDelete={(a) => setDeleteTarget(a)}
        />
      ))}
      {/* Root drop zone at the bottom — drop here to move to root */}
      <div
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setDropTarget({ id: 'root', position: 'after' });
        }}
        onDragLeave={() => {
          if (dropTarget?.id === 'root') setDropTarget(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop('root', 'after');
        }}
        style={{
          height: 18,
          margin: '4px 14px 8px',
          borderRadius: 6,
          border: dropTarget?.id === 'root' && dragId ? '1px dashed var(--accent)' : '1px dashed transparent',
          transition: 'border-color .12s',
          color: 'var(--text-dim)',
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {dragId ? 'Drop here to move to root' : ''}
      </div>

      {deleteTarget && (
        deleteTarget.category === 'folder' && deleteTargetChildren > 0 ? (
          <FolderDeleteDialog
            folder={deleteTarget}
            childCount={deleteTargetChildren}
            onOrphan={handleOrphanAndDelete}
            onCascade={handleCascadeDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        ) : (
          <ConfirmDialog
            title={deleteTarget.category === 'folder' ? 'Delete empty folder?' : `Delete "${deleteTarget.title}"?`}
            description={
              deleteTarget.category === 'folder'
                ? 'This folder has no contents. It will be removed.'
                : 'This cannot be undone (use Export first if you might want it back).'
            }
            confirmLabel="Delete"
            danger
            onConfirm={handleOrphanAndDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )
      )}
    </div>
  );
}

/** Two-option dialog for deleting a folder that still has children. */
function FolderDeleteDialog({
  folder, childCount, onOrphan, onCascade, onCancel,
}: {
  folder: Article;
  childCount: number;
  onOrphan: () => void;
  onCascade: () => void;
  onCancel: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 96vw)' }}>
        <div className="text-eyebrow">Folder</div>
        <h2 className="text-display" style={{ fontSize: 19, margin: '6px 0 8px' }}>
          Delete “{folder.title}”?
        </h2>
        <p className="text-mute" style={{ fontSize: 13.5, lineHeight: 1.55, margin: '0 0 14px' }}>
          This folder contains <strong style={{ color: 'var(--text)' }}>{childCount} item{childCount === 1 ? '' : 's'}</strong> (articles and/or nested folders). Pick what should happen to them:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="sf-card hoverable"
            onClick={onOrphan}
            style={{
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="arrow-left" size={14} className="text-accent" />
              <strong style={{ fontSize: 13.5 }}>Move contents to root</strong>
            </div>
            <div className="text-mute" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              The folder is removed but its {childCount} item{childCount === 1 ? '' : 's'} stay safe — they become root-level entries you can reorganize later. <strong>Recommended.</strong>
            </div>
          </button>

          <button
            className="sf-card hoverable"
            onClick={() => { if (armed) onCascade(); else setArmed(true); }}
            style={{
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              border: armed ? '1px solid var(--danger)' : '1px solid rgba(217,122,122,0.3)',
              background: armed ? 'rgba(217,122,122,0.08)' : undefined,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trash" size={13} className="" style={{ color: 'var(--danger)' }} />
              <strong style={{ fontSize: 13.5, color: 'var(--danger)' }}>
                {armed ? `Click again to confirm — delete folder AND all ${childCount} items` : 'Delete folder AND everything inside it'}
              </strong>
            </div>
            <div className="text-mute" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>
              Cascade — every article in this folder (and inside its subfolders) is erased. This cannot be undone.
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  node,
  expanded,
  onToggle,
  activeId,
  dragId,
  dropTarget,
  setDragId,
  setDropTarget,
  onDrop,
  worldId,
  onRename,
  onRequestDelete,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  activeId: string | undefined;
  dragId: string | null;
  dropTarget: { id: string | 'root'; position: 'before' | 'after' | 'inside' } | null;
  setDragId: (id: string | null) => void;
  setDropTarget: (t: { id: string | 'root'; position: 'before' | 'after' | 'inside' } | null) => void;
  onDrop: (targetId: string | 'root', position: 'before' | 'after' | 'inside') => void;
  worldId: string;
  onRename: (id: string, title: string) => Promise<void>;
  onRequestDelete: (a: Article) => void;
}) {
  const a = node.article;
  const isFolder = a.category === 'folder';
  const isExpanded = expanded.has(a.id);
  const hasChildren = node.children.length > 0;
  const isActive = activeId === a.id;
  const isDragging = dragId === a.id;
  const isDropTarget = dropTarget?.id === a.id;
  const customIcon = a.meta?.icon as string | undefined;
  const cat = CATEGORY_MAP[a.category] ?? CATEGORY_MAP['note'];

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(a.title);
  useEffect(() => { setDraftTitle(a.title); }, [a.title]);

  function handleDragStart(e: React.DragEvent) {
    setDragId(a.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', a.id);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!dragId || dragId === a.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    // Inside-zone: middle 40% (for folders) — articles too can host children, but folders are primary
    let position: 'before' | 'after' | 'inside';
    if (isFolder) {
      if (y < h * 0.3) position = 'before';
      else if (y > h * 0.7) position = 'after';
      else position = 'inside';
    } else {
      // articles get top/bottom for reorder, with a small middle-inside zone
      if (y < h * 0.35) position = 'before';
      else if (y > h * 0.65) position = 'after';
      else position = 'inside';
    }
    setDropTarget({ id: a.id, position });
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if we're leaving to a non-descendant
    const related = e.relatedTarget as HTMLElement | null;
    const container = e.currentTarget as HTMLElement;
    if (related && container.contains(related)) return;
    if (dropTarget?.id === a.id) setDropTarget(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!dropTarget || dropTarget.id !== a.id) return;
    onDrop(a.id, dropTarget.position);
  }

  function handleDragEnd() {
    setDragId(null);
    setDropTarget(null);
  }

  const indent = 8 + node.depth * 14;

  // Drop visualization
  const showBefore = isDropTarget && dropTarget.position === 'before';
  const showAfter = isDropTarget && dropTarget.position === 'after';
  const showInside = isDropTarget && dropTarget.position === 'inside';

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    paddingLeft: indent,
    borderRadius: 6,
    fontSize: 12.5,
    cursor: 'pointer',
    transition: 'background .12s, opacity .12s',
    opacity: isDragging ? 0.4 : 1,
    background: showInside ? 'rgba(67,199,199,0.18)' : (isActive ? 'rgba(67,199,199,0.14)' : 'transparent'),
    color: isActive ? 'var(--accent)' : 'var(--text-mute)',
    border: showInside ? '1px solid var(--accent)' : '1px solid transparent',
    position: 'relative',
  };

  function commitRename() {
    if (draftTitle.trim() && draftTitle !== a.title) {
      onRename(a.id, draftTitle.trim());
    }
    setEditing(false);
  }

  const rowContent = (
    <div
      className="tree-row"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={(e) => { e.preventDefault(); setEditing(true); }}
      title={isFolder ? a.title : `${a.title} (${cat.label})`}
      style={rowStyle}
    >
      {/* Before-drop indicator */}
      {showBefore && <span style={{ position: 'absolute', left: 4, right: 4, top: -1, height: 2, background: 'var(--accent)', borderRadius: 2 }} />}
      {/* After-drop indicator */}
      {showAfter && <span style={{ position: 'absolute', left: 4, right: 4, bottom: -1, height: 2, background: 'var(--accent)', borderRadius: 2 }} />}

      {/* Chevron for folders, spacer for articles */}
      {(isFolder || hasChildren) ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(a.id); }}
          style={{
            width: 14, height: 14, padding: 0,
            background: 'transparent', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={10} />
        </button>
      ) : (
        <span style={{ width: 14, height: 14 }} />
      )}

      {/* Icon: custom > folder/book emoji > category icon */}
      <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.accent, flexShrink: 0 }}>
        {customIcon ? (
          <span style={{ fontSize: 13 }}>{customIcon}</span>
        ) : isFolder ? (
          <span style={{ fontSize: 12 }}>{isExpanded ? '📂' : '📁'}</span>
        ) : (
          <Icon name={cat.icon as any} size={12} />
        )}
      </span>

      {/* Title — clickable for articles, inline editable */}
      {editing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={e => setDraftTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setDraftTitle(a.title); setEditing(false); }
          }}
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text)', fontSize: 12.5, padding: 0, minWidth: 0,
          }}
        />
      ) : isFolder ? (
        <span
          onClick={() => onToggle(a.id)}
          style={{
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--text)', fontWeight: 500,
          }}
        >
          {a.title}
        </span>
      ) : (
        <NavLink
          to={`/w/${worldId}/articles/${a.id}`}
          className={isActive ? 'active' : ''}
          style={{
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'inherit', textDecoration: 'none',
          }}
        >
          {a.title}
        </NavLink>
      )}

      {/* Child count for folders */}
      {isFolder && hasChildren && (
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{node.children.length}</span>
      )}

      {/* Row actions — visible on hover */}
      {!editing && (
        <span className="tree-row-actions" onClick={e => e.stopPropagation()}>
          <button
            title={isFolder ? 'Rename folder' : 'Rename article'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
            onMouseDown={e => e.stopPropagation()}
            draggable={false}
            className="tree-row-btn"
          >
            <Icon name="edit" size={11} />
          </button>
          <button
            title={isFolder ? 'Delete folder…' : 'Delete article…'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRequestDelete(a); }}
            onMouseDown={e => e.stopPropagation()}
            draggable={false}
            className="tree-row-btn danger"
          >
            <Icon name="trash" size={11} />
          </button>
        </span>
      )}
    </div>
  );

  return (
    <div>
      {rowContent}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeRow
              key={child.article.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              activeId={activeId}
              dragId={dragId}
              dropTarget={dropTarget}
              setDragId={setDragId}
              setDropTarget={setDropTarget}
              onDrop={onDrop}
              worldId={worldId}
              onRename={onRename}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
