/**
 * Sheet import (.xlsx / .csv) — converts a spreadsheet into a Stormforge
 * ArticlesImportPayload by mapping each row to one article.
 *
 * The user provides a column→field mapping at import time (which column
 * is the Title, which is the Body, etc.). We don't infer everything
 * automatically because spreadsheets vary wildly in shape.
 *
 * Mammoth-style: SheetJS is lazy-loaded only when a sheet file is picked
 * so it doesn't bloat the initial bundle.
 */

import type { ArticleCategory } from '../types';
import type { ArticlesImportPayload, ImportableArticle } from '../components/ImportArticles';

/** Shape returned by parseSheetFile for the UI to render the mapping step. */
export interface SheetParseResult {
  /** Name of the sheet we ended up parsing (first sheet by default). */
  sheetName: string;
  /** All sheet names so the user can switch if the workbook has multiple. */
  allSheets: string[];
  /** Column headers detected from row 1, in original order. */
  columns: string[];
  /** Data rows keyed by column header → cell value (always coerced to string). */
  rows: Record<string, string>[];
}

/** The user's chosen mapping of sheet columns to article fields. */
export interface SheetMapping {
  /** Required: column whose value becomes the article title. */
  titleColumn: string;
  /** Optional: column whose value becomes the article summary. */
  summaryColumn?: string;
  /** Optional: column(s) whose values become the article body, joined as paragraphs. */
  bodyColumns: string[];
  /** Optional: column whose comma-separated value becomes article tags. */
  tagsColumn?: string;
  /** Optional: column whose value becomes the per-row category. If unset, every row uses `defaultCategory`. */
  categoryColumn?: string;
  /** Category used when categoryColumn is unset (or the row's category is blank). */
  defaultCategory: ArticleCategory;
}

/** Pick the first non-empty workbook sheet that actually has rows. */
function pickInitialSheet(workbook: any): string {
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const range = ws['!ref'];
    if (range && range !== 'A1') return name;
  }
  return workbook.SheetNames[0];
}

/** Open the workbook and return a structured view of the chosen sheet. */
export async function parseSheetFile(file: File, sheetName?: string): Promise<SheetParseResult> {
  // Lazy import — SheetJS is ~400 KB, only needed when a user picks a sheet.
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', cellDates: false });

  const allSheets: string[] = workbook.SheetNames;
  const chosen = sheetName && allSheets.includes(sheetName) ? sheetName : pickInitialSheet(workbook);
  const ws = workbook.Sheets[chosen];

  // sheet_to_json with header: 1 gives us an array of arrays so we can capture
  // column headers exactly as the user wrote them, then split header row off.
  const rowsRaw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (rowsRaw.length === 0) {
    return { sheetName: chosen, allSheets, columns: [], rows: [] };
  }

  const headerRow = rowsRaw[0].map(c => String(c ?? '').trim());
  // Replace any blank headers with a placeholder so they're still selectable.
  const columns = headerRow.map((h, i) => h || `Column ${i + 1}`);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < rowsRaw.length; i++) {
    const row = rowsRaw[i];
    // Skip truly blank rows.
    if (row.every(cell => String(cell ?? '').trim() === '')) continue;
    const entry: Record<string, string> = {};
    for (let c = 0; c < columns.length; c++) {
      const v = row[c];
      entry[columns[c]] = v == null ? '' : String(v).trim();
    }
    rows.push(entry);
  }

  return { sheetName: chosen, allSheets, columns, rows };
}

/** Suggest a sensible default mapping based on column names. */
export function suggestMapping(columns: string[]): Partial<SheetMapping> {
  const lower: Record<string, string> = {};
  for (const c of columns) lower[c.toLowerCase()] = c;
  function find(...candidates: string[]): string | undefined {
    for (const cand of candidates) {
      const hit = lower[cand];
      if (hit) return hit;
      // Substring match as a fallback (e.g. "Character Name" matches "name").
      for (const key of Object.keys(lower)) {
        if (key.includes(cand)) return lower[key];
      }
    }
    return undefined;
  }
  const title = find('title', 'name');
  const summary = find('summary', 'description', 'tagline', 'subtitle');
  const tags = find('tags', 'keywords');
  const category = find('category', 'type', 'kind');
  // Body: any column that looks descriptive and isn't already mapped.
  const skip = new Set([title, summary, tags, category].filter(Boolean) as string[]);
  const body = columns.find(c => skip.has(c) ? false : /notes|body|content|text|details/i.test(c));

  return {
    titleColumn: title,
    summaryColumn: summary,
    tagsColumn: tags,
    categoryColumn: category,
    bodyColumns: body ? [body] : [],
  };
}

/** Coerce an arbitrary string into a valid ArticleCategory key, or null. */
const VALID_CATEGORIES: ArticleCategory[] = [
  'species', 'character', 'place', 'country', 'language', 'item', 'geography',
  'material', 'military', 'myth', 'natural_law', 'organization', 'profession',
  'religion', 'title', 'spell', 'tradition', 'vehicle', 'conflict', 'deity',
  'history', 'magic_system', 'note', 'folder', 'book',
];
function normalizeCategory(raw: string): ArticleCategory | null {
  const k = raw.trim().toLowerCase().replace(/[^a-z_]/g, '_');
  return VALID_CATEGORIES.includes(k as ArticleCategory) ? (k as ArticleCategory) : null;
}

/** Slugify with the same rules as docxImport. */
function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) { used.add(base); return base; }
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  const slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

/** Build a Tiptap doc of plain paragraphs from one or more text values. */
function plainParagraphs(parts: string[]): any {
  const nonEmpty = parts.map(p => p.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return { type: 'doc', content: [{ type: 'paragraph' }] };
  const content = nonEmpty.flatMap(text =>
    text.split(/\n+/).map(line => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line.trim() }] : undefined,
    })),
  );
  return { type: 'doc', content };
}

/** Turn parsed rows + a mapping into a payload ready for bulkImport. */
export function buildArticlesFromMapping(
  rows: Record<string, string>[],
  mapping: SheetMapping,
): ArticlesImportPayload {
  const articles: ImportableArticle[] = [];
  const used = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[mapping.titleColumn] || '').trim();
    if (!title) continue;  // skip rows with no title — they'd just be junk
    const slug = uniqueSlug(slugify(title, `row-${i + 1}`), used);

    let category: ArticleCategory = mapping.defaultCategory;
    if (mapping.categoryColumn) {
      const norm = normalizeCategory(row[mapping.categoryColumn] || '');
      if (norm) category = norm;
    }

    const summary = mapping.summaryColumn ? (row[mapping.summaryColumn] || '').trim() : '';
    const bodyParts = (mapping.bodyColumns ?? []).map(col => row[col] || '');
    const contentJson = plainParagraphs(bodyParts);
    const contentText = bodyParts.join('\n\n').trim().slice(0, 4000);
    const tags = mapping.tagsColumn
      ? (row[mapping.tagsColumn] || '')
          .split(/[,;|]/)
          .map(t => t.trim())
          .filter(Boolean)
      : [];

    // Stuff any unmapped columns into meta.extra so info isn't lost.
    const mappedCols = new Set<string>([
      mapping.titleColumn,
      mapping.summaryColumn ?? '',
      mapping.tagsColumn ?? '',
      mapping.categoryColumn ?? '',
      ...(mapping.bodyColumns ?? []),
    ].filter(Boolean));
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!mappedCols.has(k) && v) extra[k] = v;
    }

    articles.push({
      slug,
      category,
      title,
      summary,
      contentJson,
      contentText,
      tags,
      meta: Object.keys(extra).length ? { extra } : undefined,
    });
  }

  return {
    formatVersion: 1,
    kind: 'articles',
    description: `Imported from sheet — ${articles.length} row${articles.length === 1 ? '' : 's'}`,
    articles,
  };
}
