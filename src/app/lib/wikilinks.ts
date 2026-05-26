import type { Article } from '../types';

/**
 * Resolve [[Wiki Link]] syntax in plain text to article IDs.
 * Matching is case-insensitive on the article title (and an optional |alias).
 */
export function resolveWikiLinkText(
  text: string,
  articlesIndex: Record<string, Article>
): { resolvedId?: string; display: string } {
  // [[Target|Display]]
  const pipeIdx = text.indexOf('|');
  let target = text.trim();
  let display = target;
  if (pipeIdx !== -1) {
    target = text.slice(0, pipeIdx).trim();
    display = text.slice(pipeIdx + 1).trim();
  }
  const key = target.toLowerCase();
  for (const id in articlesIndex) {
    if (articlesIndex[id].title.toLowerCase() === key) {
      return { resolvedId: id, display };
    }
  }
  return { resolvedId: undefined, display };
}

/** Extract referenced wiki link titles from a Tiptap JSON doc. */
export function extractWikiLinks(doc: any): string[] {
  const out = new Set<string>();
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'wikilink' && node.attrs?.target) {
      out.add(String(node.attrs.target));
    }
    if (node.content) walk(node.content);
  }
  walk(doc);
  return [...out];
}
