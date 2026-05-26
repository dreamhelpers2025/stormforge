import React, { useEffect, useState } from 'react';
import { listRevisions } from '../lib/revisions';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import type { Article, ArticleRevision } from '../types';
import Icon from './Icon';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  article: Article;
  onClose: () => void;
  onRestored: () => void;
}

export default function HistoryPanel({ article, onClose, onRestored }: Props) {
  const [revs, setRevs] = useState<ArticleRevision[]>([]);
  const [selected, setSelected] = useState<ArticleRevision | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<ArticleRevision | null>(null);
  const updateArticle = useArticles(s => s.update);
  const push = useToast(s => s.push);

  useEffect(() => {
    listRevisions(article.id).then(setRevs);
  }, [article.id]);

  async function restore(rev: ArticleRevision) {
    await updateArticle(article.id, {
      title: rev.title,
      summary: rev.summary,
      contentJson: rev.contentJson,
      contentText: extractText(rev.contentJson),
      meta: rev.meta,
    });
    push('Restored from history.', 'success');
    onRestored();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="text-eyebrow">History</div>
            <h2 className="text-display" style={{ fontSize: 20, margin: '4px 0 0' }}>{article.title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Revision list */}
          <div className="scrollbar-thin" style={{ overflowY: 'auto', borderRight: '1px solid var(--border)', paddingRight: 8 }}>
            {revs.length === 0 ? (
              <div className="text-mute" style={{ fontSize: 12.5, padding: 10, fontStyle: 'italic' }}>
                No revisions yet. Stormforge captures snapshots automatically as you write (about once per minute).
              </div>
            ) : (
              revs.map(r => {
                const active = selected?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    style={{
                      padding: '7px 9px', borderRadius: 6, cursor: 'pointer',
                      background: active ? 'rgba(67,199,199,0.12)' : 'transparent',
                      border: active ? '1px solid var(--border-strong)' : '1px solid transparent',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: 12.5 }}>{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="text-dim" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Preview */}
          <div className="scrollbar-thin" style={{ overflowY: 'auto' }}>
            {!selected ? (
              <EmptyState icon="scroll" title="Pick a revision" description="Select an entry on the left to preview it. You can restore the article to that state." />
            ) : (
              <>
                <div className="text-eyebrow">Preview</div>
                <h3 className="text-display" style={{ fontSize: 18, margin: '4px 0' }}>{selected.title}</h3>
                {selected.summary && <p className="text-mute" style={{ fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>{selected.summary}</p>}
                <div className="sf-card scrollbar-thin" style={{ padding: 14, fontSize: 13.5, lineHeight: 1.6, maxHeight: 360, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
                    {extractText(selected.contentJson).slice(0, 4000)}
                    {extractText(selected.contentJson).length > 4000 && '\n…(truncated)'}
                  </pre>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={() => setConfirmRestore(selected)}>
                    <Icon name="undo" size={13} /> Restore this version
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {confirmRestore && (
          <ConfirmDialog
            title="Restore this revision?"
            description="The current version will become a new revision in history, so this is reversible."
            confirmLabel="Restore"
            onConfirm={async () => { await restore(confirmRestore); setConfirmRestore(null); }}
            onCancel={() => setConfirmRestore(null)}
          />
        )}
      </div>
    </div>
  );
}

function extractText(doc: any): string {
  const parts: string[] = [];
  function walk(n: any) {
    if (!n) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'text' && n.text) parts.push(n.text);
    if (n.type === 'heading') parts.push('\n\n');
    if (n.type === 'paragraph') parts.push('\n\n');
    if (n.content) walk(n.content);
  }
  walk(doc);
  return parts.join('').trim();
}
