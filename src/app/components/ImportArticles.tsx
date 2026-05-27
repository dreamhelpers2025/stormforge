import React, { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { parseDocxToPayload } from '../lib/docxImport';
import { parseSheetFile, suggestMapping, buildArticlesFromMapping, type SheetParseResult, type SheetMapping } from '../lib/sheetImport';
import { CATEGORIES, CATEGORY_MAP } from '../lib/categories';
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
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Docx headings — H1 sections vs H2 sections. The article heading level is
  // what becomes one article; the level above it becomes a containing folder.
  const [docxHeadingLevel, setDocxHeadingLevel] = useState<1 | 2>(2);
  /** Holds the most recently-picked .docx so the user can re-parse with a
   *  different heading level without re-choosing the file. */
  const [docxFile, setDocxFile] = useState<File | null>(null);

  // Sheet (.xlsx / .csv) state.
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetParse, setSheetParse] = useState<SheetParseResult | null>(null);
  const [sheetMapping, setSheetMapping] = useState<SheetMapping | null>(null);

  if (!open) return null;

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);
    const name = file.name.toLowerCase();
    const isDocx = name.endsWith('.docx');
    const isSheet = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
    if (isDocx) {
      setDocxFile(file);
      setSheetFile(null); setSheetParse(null); setSheetMapping(null);
      await parseDocxNow(file, docxHeadingLevel);
      return;
    }
    if (isSheet) {
      setDocxFile(null);
      setSheetFile(file);
      await parseSheetNow(file);
      return;
    }
    setDocxFile(null);
    setSheetFile(null); setSheetParse(null); setSheetMapping(null);
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

  async function parseSheetNow(file: File, sheetName?: string) {
    setParsing(true);
    setError(null);
    setWarnings([]);
    setPayload(null);
    try {
      const result = await parseSheetFile(file, sheetName);
      if (result.rows.length === 0) {
        throw new Error('No rows found in the sheet. Make sure the first row is your column headers and there\'s at least one row of data below.');
      }
      const suggested = suggestMapping(result.columns);
      const initialMapping: SheetMapping = {
        titleColumn: suggested.titleColumn ?? result.columns[0],
        summaryColumn: suggested.summaryColumn,
        bodyColumns: suggested.bodyColumns ?? [],
        tagsColumn: suggested.tagsColumn,
        categoryColumn: suggested.categoryColumn,
        defaultCategory: 'note',
      };
      setSheetParse(result);
      setSheetMapping(initialMapping);
      // Build initial preview payload so the user sees something right away.
      setPayload(buildArticlesFromMapping(result.rows, initialMapping));
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setSheetParse(null);
      setSheetMapping(null);
    } finally {
      setParsing(false);
    }
  }

  /** Recompute the preview payload whenever the mapping changes. */
  function applyMappingChange(next: SheetMapping) {
    setSheetMapping(next);
    if (sheetParse) setPayload(buildArticlesFromMapping(sheetParse.rows, next));
  }

  async function parseDocxNow(file: File, level: 1 | 2) {
    setParsing(true);
    setError(null);
    setWarnings([]);
    try {
      const result = await parseDocxToPayload(file, { articleHeadingLevel: level, buildFolders: true });
      setPayload(result.payload);
      setWarnings(result.warnings.slice(0, 5));
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setPayload(null);
    } finally {
      setParsing(false);
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
          Upload a <strong>Word doc (.docx)</strong> — split by heading into folders and articles —
          a <strong>spreadsheet (.xlsx, .csv)</strong> — one article per row, you map the columns —
          or a Stormforge JSON file. Either way it's added to <strong>this world</strong>;
          existing articles aren't touched.
        </p>

        {!payload ? (
          <>
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
            >
              <Icon name="upload" size={13} /> {parsing ? 'Parsing…' : 'Choose .docx, .xlsx, .csv, or .json…'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv,.xls,application/vnd.ms-excel"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            <div className="text-dim" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.55 }}>
              <strong>From Google Docs:</strong> File → Download → Microsoft Word (.docx).<br />
              <strong>From Google Sheets:</strong> File → Download → Microsoft Excel (.xlsx) — first row should be column headers, each row becomes one article.
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 6, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12.5 }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            {sheetFile && sheetParse && sheetMapping && (
              <SheetMappingPanel
                parse={sheetParse}
                mapping={sheetMapping}
                onMappingChange={applyMappingChange}
                onSheetChange={(name) => parseSheetNow(sheetFile, name)}
              />
            )}
            {docxFile && (
              <div className="sf-card" style={{ padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: 'var(--text-mute)' }}>Split docx at:</div>
                <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <button
                    className={'btn ' + (docxHeadingLevel === 1 ? 'btn-primary' : 'btn-ghost')}
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setDocxHeadingLevel(1); parseDocxNow(docxFile, 1); }}
                    disabled={parsing}
                  >
                    Heading 1
                  </button>
                  <button
                    className={'btn ' + (docxHeadingLevel === 2 ? 'btn-primary' : 'btn-ghost')}
                    style={{ padding: '4px 10px', fontSize: 11 }}
                    onClick={() => { setDocxHeadingLevel(2); parseDocxNow(docxFile, 2); }}
                    disabled={parsing}
                  >
                    Heading 2
                  </button>
                </div>
                <div className="text-dim" style={{ fontSize: 11, flex: 1, minWidth: 0 }}>
                  {parsing ? 'Re-parsing…' : 'Each block at this level becomes one article.'}
                </div>
              </div>
            )}
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
            {warnings.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, border: '1px solid var(--ember)', color: 'var(--text-mute)', fontSize: 11.5, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--ember)' }}>Conversion notes:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {error && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 6, border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12.5 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setPayload(null); setDocxFile(null); setSheetFile(null); setSheetParse(null); setSheetMapping(null); setWarnings([]); }}>Choose different file</button>
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

/** Sheet column → article field mapping UI. */
function SheetMappingPanel({
  parse,
  mapping,
  onMappingChange,
  onSheetChange,
}: {
  parse: SheetParseResult;
  mapping: SheetMapping;
  onMappingChange: (next: SheetMapping) => void;
  onSheetChange: (sheetName: string) => void;
}) {
  // Filter out 'folder' from the user-pickable categories — articles
  // imported from a sheet shouldn't become folders themselves.
  const pickableCategories = CATEGORIES.filter(c => c.key !== 'folder');
  const cols = parse.columns;

  return (
    <div className="sf-card" style={{ padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="text-eyebrow">Column mapping</div>
        {parse.allSheets.length > 1 && (
          <label style={{ fontSize: 11.5, color: 'var(--text-mute)' }}>
            Sheet:&nbsp;
            <select
              className="select"
              value={parse.sheetName}
              onChange={e => onSheetChange(e.target.value)}
              style={{ width: 'auto', display: 'inline-block', padding: '4px 8px', fontSize: 12 }}
            >
              {parse.allSheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FieldPick
          label="Title (required)"
          value={mapping.titleColumn}
          onChange={v => onMappingChange({ ...mapping, titleColumn: v })}
          columns={cols}
        />
        <FieldPick
          label="Default category"
          value={mapping.defaultCategory}
          onChange={v => onMappingChange({ ...mapping, defaultCategory: v as ArticleCategory })}
          columns={pickableCategories.map(c => c.key)}
          renderLabel={(v) => CATEGORY_MAP[v as ArticleCategory]?.label ?? v}
        />
        <FieldPick
          label="Category column (optional)"
          value={mapping.categoryColumn ?? ''}
          onChange={v => onMappingChange({ ...mapping, categoryColumn: v || undefined })}
          columns={cols}
          allowNone
          hint="If a row's value matches a known category key, that row uses it."
        />
        <FieldPick
          label="Summary column (optional)"
          value={mapping.summaryColumn ?? ''}
          onChange={v => onMappingChange({ ...mapping, summaryColumn: v || undefined })}
          columns={cols}
          allowNone
        />
        <FieldPick
          label="Body column (optional)"
          value={mapping.bodyColumns[0] ?? ''}
          onChange={v => onMappingChange({ ...mapping, bodyColumns: v ? [v] : [] })}
          columns={cols}
          allowNone
          hint="Long-form text. Becomes the article's content."
        />
        <FieldPick
          label="Tags column (optional)"
          value={mapping.tagsColumn ?? ''}
          onChange={v => onMappingChange({ ...mapping, tagsColumn: v || undefined })}
          columns={cols}
          allowNone
          hint="Comma- or semicolon-separated values become tags."
        />
      </div>

      <div className="text-dim" style={{ fontSize: 11, lineHeight: 1.5 }}>
        Unmapped columns are kept on each article under <code>meta.extra</code>, so no data
        is lost — you can still see them later by opening any imported article and inspecting it.
      </div>
    </div>
  );
}

/** One labeled dropdown for the mapping UI. */
function FieldPick({
  label,
  value,
  onChange,
  columns,
  allowNone = false,
  hint,
  renderLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  columns: string[];
  allowNone?: boolean;
  hint?: string;
  renderLabel?: (v: string) => string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 11, color: 'var(--text-mute)', letterSpacing: '0.04em' }}>{label}</span>
      <select
        className="select"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ fontSize: 12.5 }}
      >
        {allowNone && <option value="">— none —</option>}
        {columns.map(c => (
          <option key={c} value={c}>{renderLabel ? renderLabel(c) : c}</option>
        ))}
      </select>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{hint}</span>}
    </label>
  );
}
