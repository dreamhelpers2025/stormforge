import React, { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Editor from './Editor';
import Icon from './Icon';
import ConfirmDialog from './ConfirmDialog';
import { articleWordCount } from '../lib/wordcount';
import type { Article } from '../types';

interface Draft {
  id: string;
  name: string;
  contentJson: any;
  contentText: string;
  updatedAt: number;
}

interface BookMeta {
  drafts: Draft[];
  activeDraftId: string;
}

interface Props {
  article: Article;
  articlesIndex: Record<string, Article>;
  onPatch: (patch: Partial<Article>) => void;
  onOpenArticle: (id: string) => void;
}

function emptyDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/** Read book meta from article.meta; initialize from existing contentJson if first use. */
function readBookMeta(article: Article): BookMeta {
  const m = article.meta ?? {};
  if (m.drafts && Array.isArray(m.drafts) && m.drafts.length > 0 && m.activeDraftId) {
    return { drafts: m.drafts as Draft[], activeDraftId: m.activeDraftId as string };
  }
  // First time — migrate the article's current content into Draft 1
  const seedDraft: Draft = {
    id: nanoid(8),
    name: 'Draft 1',
    contentJson: article.contentJson ?? emptyDoc(),
    contentText: article.contentText ?? '',
    updatedAt: article.updatedAt,
  };
  return { drafts: [seedDraft], activeDraftId: seedDraft.id };
}

export default function BookBuilder({ article, articlesIndex, onPatch, onOpenArticle }: Props) {
  const bookMeta = useMemo(() => readBookMeta(article), [article.id]);
  const [drafts, setDrafts] = useState<Draft[]>(bookMeta.drafts);
  const [activeDraftId, setActiveDraftId] = useState<string>(bookMeta.activeDraftId);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // If we just initialized from article.contentJson, persist the seeded draft back so it's saved
  useEffect(() => {
    const m = article.meta ?? {};
    if (!m.drafts || !Array.isArray(m.drafts) || m.drafts.length === 0) {
      onPatch({ meta: { ...m, drafts, activeDraftId } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = drafts.find(d => d.id === activeDraftId) ?? drafts[0];
  const compareDraft = compareWith ? drafts.find(d => d.id === compareWith) : null;

  /** Persist the new draft list + active draft + sync top-level article fields. */
  function persist(nextDrafts: Draft[], nextActiveId: string) {
    setDrafts(nextDrafts);
    setActiveDraftId(nextActiveId);
    const act = nextDrafts.find(d => d.id === nextActiveId) ?? nextDrafts[0];
    onPatch({
      meta: { ...(article.meta ?? {}), drafts: nextDrafts, activeDraftId: nextActiveId },
      contentJson: act?.contentJson ?? emptyDoc(),
      contentText: act?.contentText ?? '',
    });
  }

  function handleActiveChange(json: any, text: string) {
    const next = drafts.map(d =>
      d.id === activeDraftId
        ? { ...d, contentJson: json, contentText: text, updatedAt: Date.now() }
        : d
    );
    setDrafts(next);
    onPatch({
      meta: { ...(article.meta ?? {}), drafts: next, activeDraftId },
      contentJson: json,
      contentText: text,
    });
  }

  function switchDraft(id: string) {
    if (id === activeDraftId) return;
    const act = drafts.find(d => d.id === id);
    if (!act) return;
    setActiveDraftId(id);
    onPatch({
      meta: { ...(article.meta ?? {}), activeDraftId: id },
      contentJson: act.contentJson,
      contentText: act.contentText,
    });
  }

  function addDraft(cloneActive = true) {
    const cloneFrom = cloneActive ? active : null;
    const newDraft: Draft = {
      id: nanoid(8),
      name: `Draft ${drafts.length + 1}`,
      contentJson: cloneFrom?.contentJson ?? emptyDoc(),
      contentText: cloneFrom?.contentText ?? '',
      updatedAt: Date.now(),
    };
    const next = [...drafts, newDraft];
    persist(next, newDraft.id);
  }

  function startRename(d: Draft) {
    setRenaming(d.id);
    setRenameDraft(d.name);
  }

  function commitRename() {
    if (!renaming) return;
    const trimmed = renameDraft.trim();
    if (!trimmed) { setRenaming(null); return; }
    const next = drafts.map(d => d.id === renaming ? { ...d, name: trimmed } : d);
    persist(next, activeDraftId);
    setRenaming(null);
  }

  function deleteDraft(id: string) {
    if (drafts.length <= 1) return;
    const next = drafts.filter(d => d.id !== id);
    const nextActiveId = id === activeDraftId ? next[0].id : activeDraftId;
    persist(next, nextActiveId);
    if (compareWith === id) setCompareWith(null);
  }

  return (
    <div>
      {/* Draft tab bar */}
      <div className="sf-card" style={{ padding: 10, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="text-eyebrow">Manuscript drafts</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`btn ${compareWith ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                if (compareWith) setCompareWith(null);
                else {
                  // Default compare to most recent OTHER draft
                  const other = drafts.find(d => d.id !== activeDraftId);
                  if (other) setCompareWith(other.id);
                }
              }}
              disabled={drafts.length < 2}
              title="Toggle split-screen comparison"
            >
              <Icon name="eye" size={13} /> {compareWith ? 'Hide compare' : 'Compare'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => addDraft(true)}
              title="Add new draft (clones current)"
            >
              <Icon name="plus" size={13} /> Add draft
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {drafts.map(d => {
            const isActive = d.id === activeDraftId;
            const isComparing = compareWith === d.id;
            const wc = articleWordCount(d.contentText, '');
            const editingThis = renaming === d.id;
            return (
              <div
                key={d.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: isActive
                    ? 'rgba(67,199,199,0.16)'
                    : (isComparing ? 'rgba(184,138,59,0.14)' : 'var(--panel-2)'),
                  border: isActive
                    ? '1px solid var(--accent)'
                    : (isComparing ? '1px solid var(--ember)' : '1px solid var(--border)'),
                  cursor: 'pointer',
                  fontSize: 12.5,
                }}
                onClick={() => !editingThis && switchDraft(d.id)}
              >
                {editingThis ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--text)', fontSize: 12.5, width: 100,
                    }}
                  />
                ) : (
                  <>
                    <span style={{ color: isActive ? 'var(--accent)' : 'var(--text)', fontWeight: isActive ? 600 : 400 }}>
                      {d.name}
                    </span>
                    <span className="text-dim" style={{ fontSize: 10 }}>{wc.toLocaleString()} w</span>
                  </>
                )}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={e => { e.stopPropagation(); startRename(d); }}
                  title="Rename"
                  style={{ width: 18, height: 18 }}
                >
                  <Icon name="edit" size={10} />
                </button>
                {drafts.length > 1 && (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={e => { e.stopPropagation(); setConfirmDeleteId(d.id); }}
                    title="Delete this draft"
                    style={{ width: 18, height: 18 }}
                  >
                    <Icon name="x" size={10} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {compareWith && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div className="text-eyebrow" style={{ color: 'var(--ember)', marginBottom: 4 }}>Comparing with</div>
            <select
              className="select"
              value={compareWith}
              onChange={e => setCompareWith(e.target.value)}
              style={{ width: 'auto', minWidth: 160 }}
            >
              {drafts.filter(d => d.id !== activeDraftId).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Editor area — split-screen when comparing */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compareWith ? '1fr 1fr' : '1fr',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        {/* Active draft — editable */}
        <div>
          <div className="text-eyebrow" style={{ marginBottom: 6, color: 'var(--accent)' }}>{active?.name ?? 'Draft'} (editing)</div>
          {active && (
            <Editor
              key={`book-${article.id}-${active.id}`}
              initialJson={active.contentJson}
              articlesIndex={articlesIndex}
              category={'book'}
              onChange={handleActiveChange}
              onOpenArticle={onOpenArticle}
            />
          )}
        </div>

        {/* Comparison draft — read-only */}
        {compareDraft && (
          <div>
            <div className="text-eyebrow" style={{ marginBottom: 6, color: 'var(--ember)' }}>{compareDraft.name} (read-only)</div>
            <ReadOnlyDraftView contentJson={compareDraft.contentJson} />
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this draft?"
          description="The other drafts of this book stay intact. This action cannot be undone."
          confirmLabel="Delete draft"
          danger
          onConfirm={() => { deleteDraft(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

/** Read-only Tiptap viewer for the right pane in compare mode. */
function ReadOnlyDraftView({ contentJson }: { contentJson: any }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: 'Empty draft.' }),
    ],
    content: contentJson,
    editable: false,
  }, [contentJson]);
  if (!editor) return null;
  return (
    <div className="tiptap-wrap" style={{ background: 'var(--panel)', opacity: 0.95 }}>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}
