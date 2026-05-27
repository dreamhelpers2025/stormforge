/**
 * Tree-building utilities for the article/folder hierarchy.
 *
 * Articles and folders both live in the `articles` table. Each one can
 * have meta.parentId pointing to another article's id (or undefined for
 * root level). meta.order is a number used to sort siblings (we leave
 * gaps of 1000 so inserts don't require renumbering).
 */
import type { Article } from '../types';

export interface TreeNode {
  article: Article;
  children: TreeNode[];
  depth: number;
}

const ORDER_STEP = 1000;

/** Build a recursive tree from a flat article list. Orphans become roots. */
export function buildTree(articles: Article[]): TreeNode[] {
  const byId = new Map<string, Article>();
  for (const a of articles) byId.set(a.id, a);

  const childrenById = new Map<string | undefined, Article[]>();
  for (const a of articles) {
    let parentId = a.meta?.parentId as string | undefined;
    // Reject parent references that don't exist (orphans become roots)
    if (parentId && !byId.has(parentId)) parentId = undefined;
    const arr = childrenById.get(parentId) ?? [];
    arr.push(a);
    childrenById.set(parentId, arr);
  }

  function sortByOrder(arr: Article[]): Article[] {
    return [...arr].sort((a, b) => {
      const ao = (a.meta?.order as number) ?? 0;
      const bo = (b.meta?.order as number) ?? 0;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title);
    });
  }

  function build(parentId: string | undefined, depth: number): TreeNode[] {
    return sortByOrder(childrenById.get(parentId) ?? []).map(a => ({
      article: a,
      children: build(a.id, depth + 1),
      depth,
    }));
  }

  return build(undefined, 0);
}

/**
 * Compute a new order value to insert an item at a target index among siblings.
 * Returns a number that sits between the surrounding sibling orders, leaving
 * room for further inserts.
 */
export function computeOrder(siblings: Article[], targetIndex: number, movingId?: string): number {
  // Filter out the moving item (in case we're reordering within the same list)
  const filtered = siblings.filter(a => a.id !== movingId);
  const sorted = [...filtered].sort((a, b) => {
    const ao = (a.meta?.order as number) ?? 0;
    const bo = (b.meta?.order as number) ?? 0;
    return ao - bo;
  });

  // Clamp the index
  const idx = Math.max(0, Math.min(targetIndex, sorted.length));

  const before = sorted[idx - 1];
  const after = sorted[idx];
  const beforeOrder = (before?.meta?.order as number) ?? 0;
  const afterOrder = (after?.meta?.order as number) ?? (beforeOrder + ORDER_STEP * 2);

  if (!after) {
    // appending to end
    return beforeOrder + ORDER_STEP;
  }
  if (!before) {
    // prepending to start
    return afterOrder - ORDER_STEP;
  }
  // between two — split the gap
  return Math.round((beforeOrder + afterOrder) / 2);
}

/** Append an item to the end of root level. */
export function nextRootOrder(articles: Article[]): number {
  const roots = articles.filter(a => !a.meta?.parentId);
  if (!roots.length) return ORDER_STEP;
  const maxOrder = Math.max(...roots.map(a => (a.meta?.order as number) ?? 0));
  return maxOrder + ORDER_STEP;
}

/** Check whether `maybeAncestor` is an ancestor of `nodeId`. Prevents cycles when reparenting. */
export function isAncestor(maybeAncestor: string, nodeId: string, articles: Article[]): boolean {
  const byId = new Map<string, Article>();
  for (const a of articles) byId.set(a.id, a);
  let cur: string | undefined = byId.get(nodeId)?.meta?.parentId as string | undefined;
  while (cur) {
    if (cur === maybeAncestor) return true;
    cur = byId.get(cur)?.meta?.parentId as string | undefined;
  }
  return false;
}
