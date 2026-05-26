import { db } from '../db';
import type { Article, ArticleRevision } from '../types';
import * as cloud from './cloudSync';

const MAX_REVISIONS_PER_ARTICLE = 30;
const MIN_INTERVAL_MS = 60_000; // throttle: don't snapshot more than once a minute

/** Snapshot the current article state as a revision, if enough time has passed. */
export async function snapshotIfDue(article: Article): Promise<void> {
  const recent = await db.revisions
    .where('[articleId+createdAt]')
    .between([article.id, 0], [article.id, Date.now() + 1])
    .reverse()
    .limit(1)
    .toArray();
  const last = recent[0];
  if (last && (Date.now() - last.createdAt) < MIN_INTERVAL_MS) return;

  const rev: ArticleRevision = {
    id: `${article.id}:${article.updatedAt}`,
    articleId: article.id,
    worldId: article.worldId,
    title: article.title,
    summary: article.summary,
    contentJson: article.contentJson,
    meta: article.meta,
    createdAt: article.updatedAt,
  };
  await db.revisions.put(rev);
  cloud.upsertRevision(rev);

  // Prune
  const all = await db.revisions.where('articleId').equals(article.id).reverse().sortBy('createdAt');
  if (all.length > MAX_REVISIONS_PER_ARTICLE) {
    const toPrune = all.slice(MAX_REVISIONS_PER_ARTICLE);
    await db.revisions.bulkDelete(toPrune.map(r => r.id));
    // best-effort cloud cleanup; ignore errors
  }
}

export async function listRevisions(articleId: string): Promise<ArticleRevision[]> {
  const all = await db.revisions.where('articleId').equals(articleId).toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteRevisionsFor(articleId: string): Promise<void> {
  await db.revisions.where('articleId').equals(articleId).delete();
}
