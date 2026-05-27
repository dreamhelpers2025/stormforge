import React, { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import type { Article, ArticleCategory } from '../types';
import Icon from './Icon';

/**
 * Format of an importable JSON payload.
 *
 * {
 *   "formatVersion": 1,
 *   "kind": "articles",
 *   "articles": [
 *     { "slug": "characters", "category": "folder", "title": "Characters", "_parent": null, ... },
 *     { "slug": "atla", "category": "character", "title": "Atlantis Sirian", "_parent": "characters", ... }
 *   ]
 * }
 *
 * On import, each `slug` is resolved to a fresh nanoid; `_parent` slugs become
 * meta.parentId references so folder hierarchies survive the import.
 */
export interface ImportableArticle {
  slug: string;
  category: ArticleCategory;
  title: string;
  summary?: string;
  contentJson?: any;
  contentText?: string;
  tags?: string[];
  meta?: Record<string, any>;
  pinned?: boolean;
  /** Reference to another item in this payload by its `slug`. */
  _parent?: string | null;
}

export interface ArticlesImportPayload {
  formatVersion: number;
  kind: 'articles';
  description?: string;
  articles: ImportableArticle[];
}

interface Props {
  worldId: string;
  open: boolean;
  onClose: () => void;
}

export default function ImportArticles({ worldId, open, onClose }: Props) {
  const bulkImport = useArticles(s => s.bulkImport);
  const push = useToast(s => s.push);
  const fileRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ArticlesImportPayload | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (json.kind !== 'articles' || !Array.isArray(json.articles)) {
        throw new Error('Not a valid articles import file. Expected kind="articles" + articles array.');
      }
      if (json.formatVersion !== 1) {
        throw new Error('Unsupported format version: ' + json.formatVersion);
      }
      setPayload(json);
    } catch (e: any) {
      setError(e.message ?? String(e));
      setPayload(null);
    }
  }

  async function doImport() {
    if (!payload) return;
    setImporting(true);
    setError(null);
    try {
      const now = Date.now();
      const slugToId: Record<string, string> = {};
      // Pass 1: assign IDs to every slug
      for (const item of payload.articles) {
        slugToId[item.slug] = nanoid(12);
      }
      // Pass 2: build Article rows
      const rows: Article[] = payload.articles.map((item, i) => {
        const id = slugToId[item.slug];
        const parentId = item._parent && slugToId[item._parent] ? slugToId[item._parent] : undefined;
        const order = (i + 1) * 1000;
        return {
          id,
          worldId,
          category: item.category,
          title: item.title,
          summary: item.summary ?? '',
          contentJson: item.contentJson ?? { type: 'doc', content: [{ type: 'paragraph' }] },
          contentText: item.contentText ?? '',
          tags: item.tags ?? [],
          meta: { ...(item.meta ?? {}), parentId, order },
          pinned: !!item.pinned,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
      });
      await bulkImport(worldId, rows);
      push(`Imported ${rows.length} article${rows.length === 1 ? '' : 's'}.`, 'success');
      setPayload(null);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setImporting(false);
    }
  }

  const folderCount = payload?.articles.filter(a => a.category === 'folder').length ?? 0;
  const articleCount = (payload?.articles.length ?? 0) - folderCount;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(540px, 96vw)' }}>
        <div className="text-eyebrow">Import</div>
        <h2 className="text-display" style={{ fontSize: 20, margin: '6px 0 12px' }}>Add articles to this world</h2>
        <p className="text-mute" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
          Upload a Stormforge articles JSON file. Articles are added to <strong>this world</strong>;
          folder hierarchy in the file is preserved. Your existing articles are not modified.
        </p>

        {!payload ? (
          <>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={13} /> Choose JSON file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            {error && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 6, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12.5 }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="sf-card" style={{ padding: 14, marginBottom: 14 }}>
              {payload.description && (
                <div className="text-serif" style={{ fontStyle: 'italic', fontSize: 13, color: 'var(--text-mute)', marginBottom: 8 }}>
                  {payload.description}
                </div>
              )}
              <div className="text-display" style={{ fontSize: 13, letterSpacing: '0.15em' }}>
                {articleCount} article{articleCount === 1 ? '' : 's'}
                {folderCount > 0 && <> · {folderCount} folder{folderCount === 1 ? '' : 's'}</>}
              </div>
              <div className="text-mute" style={{ fontSize: 12, marginTop: 6 }}>
                First few:
              </div>
              <ul style={{ paddingLeft: 18, margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-mute)' }}>
                {payload.articles.slice(0, 6).map(a => (
                  <li key={a.slug}>
                    <strong style={{ color: 'var(--text)' }}>{a.title}</strong>
                    <span className="text-dim"> · {a.category}</span>
                  </li>
                ))}
                {payload.articles.length > 6 && (
                  <li className="text-dim">…and {payload.articles.length - 6} more</li>
                )}
              </ul>
            </div>
            {error && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12.5 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPayload(null)}>Choose different file</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={doImport} disabled={importing}>
                  {importing ? 'Importing…' : `Import ${payload.articles.length} item${payload.articles.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="rune-divider-app" style={{ margin: '14px 0' }} />
        <div className="text-dim" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          The import is additive — your existing articles aren't touched. If you imported by
          mistake, you can delete the imported folder (or individual articles) afterward.
        </div>
      </div>
    </div>
  );
}
