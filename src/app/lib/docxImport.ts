/**
 * .docx import — parses a Word document into Stormforge ImportableArticles.
 *
 * Approach:
 *   1. mammoth converts the .docx to semantic HTML (h1–h6, p, ul, ol, etc.)
 *   2. We walk that HTML, splitting on a chosen heading level. Each split
 *      becomes one article. Higher-level headings become folders.
 *   3. The HTML for each article is converted to a Tiptap JSON document
 *      using `generateJSON` from @tiptap/core, with the same extension list
 *      the editor uses, so formatting (bold, italic, lists, headings,
 *      images) round-trips faithfully.
 *
 * The output uses the same ArticlesImportPayload shape as the JSON
 * importer, so it flows through the existing bulkImport plumbing without
 * any changes to the rest of the app.
 */

import { generateJSON } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import type { ArticleCategory } from '../types';
import type { ArticlesImportPayload, ImportableArticle } from '../components/ImportArticles';

/** Same extension list as the editor uses, minus the editor-only ones
 *  (Placeholder, WikiLink, BubbleMenu). generateJSON only needs nodes
 *  and marks defined. */
const TIPTAP_EXTENSIONS = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  Image.configure({ allowBase64: true, inline: false }),
  Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
];

export interface DocxImportOptions {
  /** Heading level whose blocks become article boundaries.
   *  H1 → outer sections; H2 → inner items (default). */
  articleHeadingLevel: 1 | 2;
  /** If true, treat any heading *one level above* articleHeadingLevel as
   *  a folder, and place articles underneath. */
  buildFolders: boolean;
  /** Category to assign to every imported article. */
  defaultCategory: ArticleCategory;
}

const DEFAULT_OPTIONS: DocxImportOptions = {
  articleHeadingLevel: 2,
  buildFolders: true,
  defaultCategory: 'note',
};

/** A pre-import preview of one document. */
export interface DocxParseResult {
  /** Per-article previews so the UI can show what's about to be imported. */
  payload: ArticlesImportPayload;
  /** Any mammoth conversion warnings (e.g. unsupported style). */
  warnings: string[];
  /** A short string describing what was detected, for the dialog. */
  summary: string;
}

/** Strip HTML to plain text — used for the contentText / search index. */
function htmlToPlainText(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Generate a slug from a heading. Lowercased, alphanumeric + dashes. */
function slugify(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

/** Ensure a slug is unique within a payload (append -2, -3, etc on collision). */
function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  const slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

/**
 * Walk the HTML once, collecting per-article sections.
 * Each section starts at an articleHeadingLevel heading and contains all
 * subsequent siblings until the next same-or-higher-level heading.
 *
 * Folder boundaries are detected by headings at articleHeadingLevel - 1.
 */
function splitByHeading(
  html: string,
  opts: DocxImportOptions,
): Array<{ kind: 'folder' | 'article'; title: string; bodyHtml: string }> {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root');
  if (!root) return [];

  const folderLevel = opts.articleHeadingLevel - 1;  // may be 0 → no folder split
  const articleLevel = opts.articleHeadingLevel;

  const result: Array<{ kind: 'folder' | 'article'; title: string; bodyHtml: string }> = [];

  function levelOf(el: Element): number | null {
    const tag = el.tagName.toLowerCase();
    if (tag === 'h1') return 1;
    if (tag === 'h2') return 2;
    if (tag === 'h3') return 3;
    if (tag === 'h4') return 4;
    if (tag === 'h5') return 5;
    if (tag === 'h6') return 6;
    return null;
  }

  // We track the "current article" body as a list of HTML chunks. When we
  // hit a new article heading, we flush the prior article.
  let currentArticleTitle: string | null = null;
  let currentBody: string[] = [];
  let leadParagraphs: string[] = []; // content before the first heading — discarded if no folder mode

  function flushArticle() {
    if (currentArticleTitle != null) {
      result.push({
        kind: 'article',
        title: currentArticleTitle,
        bodyHtml: currentBody.join(''),
      });
      currentArticleTitle = null;
      currentBody = [];
    }
  }

  const children = Array.from(root.children);
  for (const el of children) {
    const lvl = levelOf(el);
    if (lvl != null && opts.buildFolders && folderLevel >= 1 && lvl === folderLevel) {
      flushArticle();
      result.push({ kind: 'folder', title: (el.textContent || '').trim() || 'Section', bodyHtml: '' });
      continue;
    }
    if (lvl === articleLevel) {
      flushArticle();
      currentArticleTitle = (el.textContent || '').trim() || 'Untitled';
      continue;
    }
    // Otherwise: body content. Either part of the current article or
    // lead content before any heading.
    const outer = el.outerHTML;
    if (currentArticleTitle != null) {
      currentBody.push(outer);
    } else {
      // Pre-heading material — keep so we don't drop the intro paragraph.
      leadParagraphs.push(outer);
    }
  }
  flushArticle();

  // If there's lead content but no articles at all, treat the whole doc
  // as one article using the file name (caller provides) — caller handles
  // empty results.
  if (result.length === 0 && leadParagraphs.length > 0) {
    result.push({ kind: 'article', title: '', bodyHtml: leadParagraphs.join('') });
  }

  return result;
}

/** Convert one article's HTML to a Tiptap JSON doc, falling back gracefully. */
function htmlToTiptapJson(html: string): any {
  // Empty body → a single empty paragraph so the editor opens cleanly.
  const cleaned = (html || '').trim();
  if (!cleaned) return { type: 'doc', content: [{ type: 'paragraph' }] };
  try {
    return generateJSON(cleaned, TIPTAP_EXTENSIONS as any);
  } catch (e) {
    console.warn('[docxImport] HTML→Tiptap failed, falling back to plain paragraphs', e);
    const plain = htmlToPlainText(cleaned);
    const paragraphs = plain.split(/\n\n+/).filter(Boolean).map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    }));
    return {
      type: 'doc',
      content: paragraphs.length ? paragraphs : [{ type: 'paragraph' }],
    };
  }
}

/**
 * Parse a .docx file to an ArticlesImportPayload, ready to feed the
 * existing import flow.
 */
export async function parseDocxToPayload(
  file: File,
  partial: Partial<DocxImportOptions> = {},
): Promise<DocxParseResult> {
  const options: DocxImportOptions = { ...DEFAULT_OPTIONS, ...partial };

  // Lazy-load mammoth so the ~500 KB parser doesn't bloat the initial
  // bundle. It only runs when a user actually picks a .docx file.
  const mammoth = (await import('mammoth')).default;
  const arrayBuffer = await file.arrayBuffer();
  const conversion = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      // Preserve images inline as base64 data URLs so they survive without
      // a separate upload step. Same trade-off the article gallery makes.
      // (User can swap to Storage-backed images later.)
      convertImage: mammoth.images.imgElement(async (image) => {
        const b64 = await image.read('base64');
        return { src: `data:${image.contentType};base64,${b64}` };
      }),
    },
  );
  const html = conversion.value;
  const warnings = conversion.messages.map((m: any) => m.message || String(m));

  const sections = splitByHeading(html, options);
  if (sections.length === 0) {
    throw new Error('No headings found in document. Try lowering the article heading level, or check that your Word doc uses heading styles (Heading 1, Heading 2…) rather than just bold text.');
  }

  // If buildFolders=true but no folders detected, that's fine — articles
  // just sit at the root.
  const usedSlugs = new Set<string>();
  let currentFolderSlug: string | undefined;
  const articles: ImportableArticle[] = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (sec.kind === 'folder') {
      const slug = uniqueSlug(slugify(sec.title, `folder-${i}`), usedSlugs);
      articles.push({
        slug,
        category: 'folder',
        title: sec.title,
        summary: '',
        contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        contentText: '',
      });
      currentFolderSlug = slug;
    } else {
      const title = sec.title || file.name.replace(/\.docx$/i, '') || 'Imported';
      const slug = uniqueSlug(slugify(title, `article-${i}`), usedSlugs);
      const tiptapJson = htmlToTiptapJson(sec.bodyHtml);
      articles.push({
        slug,
        category: options.defaultCategory,
        title,
        summary: '',
        contentJson: tiptapJson,
        contentText: htmlToPlainText(sec.bodyHtml).slice(0, 4000),
        _parent: currentFolderSlug ?? null,
      });
    }
  }

  const articleCount = articles.filter(a => a.category !== 'folder').length;
  const folderCount = articles.length - articleCount;
  const summary =
    folderCount > 0
      ? `${articleCount} article${articleCount === 1 ? '' : 's'} across ${folderCount} folder${folderCount === 1 ? '' : 's'}`
      : `${articleCount} article${articleCount === 1 ? '' : 's'}`;

  const payload: ArticlesImportPayload = {
    formatVersion: 1,
    kind: 'articles',
    description: `Imported from ${file.name}`,
    articles,
  };

  return { payload, warnings, summary };
}
