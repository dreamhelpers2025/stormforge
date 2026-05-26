/**
 * Convert between local (camelCase) and Supabase (snake_case) shapes.
 * Each table has a paired `fromCloud` / `toCloud` so changes stay symmetrical.
 */
import type { World, Article, MapData, ScratchpadNote, ArticleRevision } from '../types';

// ---- worlds ----
export function worldFromCloud(row: any): World {
  return {
    id: row.id,
    name: row.name ?? '',
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    coverGradient: row.cover_gradient ?? '',
    themeAccent: row.theme_accent ?? 'tempest',
    bannerEmoji: row.banner_emoji ?? '🐉',
    goal: row.goal ?? undefined,
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}
export function worldToCloud(w: World, userId: string) {
  return {
    id: w.id,
    user_id: userId,
    name: w.name,
    tagline: w.tagline,
    description: w.description,
    cover_gradient: w.coverGradient,
    theme_accent: w.themeAccent,
    banner_emoji: w.bannerEmoji,
    goal: w.goal ?? null,
    created_at: w.createdAt,
    updated_at: w.updatedAt,
  };
}

// ---- articles ----
export function articleFromCloud(row: any): Article {
  return {
    id: row.id,
    worldId: row.world_id,
    category: row.category,
    title: row.title ?? '',
    summary: row.summary ?? '',
    contentJson: row.content_json ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    contentText: row.content_text ?? '',
    imageDataUrl: row.image_data_url ?? undefined,
    gallery: row.gallery ?? undefined,
    tags: row.tags ?? [],
    meta: row.meta ?? {},
    pinned: !!row.pinned,
    status: row.status ?? 'draft',
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}
export function articleToCloud(a: Article, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    world_id: a.worldId,
    category: a.category,
    title: a.title,
    summary: a.summary,
    content_json: a.contentJson,
    content_text: a.contentText,
    image_data_url: a.imageDataUrl ?? null,
    gallery: a.gallery ?? null,
    tags: a.tags,
    meta: a.meta,
    pinned: a.pinned,
    status: a.status,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

// ---- maps ----
export function mapFromCloud(row: any): MapData {
  return {
    id: row.id,
    worldId: row.world_id,
    name: row.name ?? '',
    description: row.description ?? '',
    background: row.background ?? '',
    aspectRatio: Number(row.aspect_ratio) || 16 / 9,
    showGrid: row.show_grid ?? true,
    pins: row.pins ?? [],
    regions: row.regions ?? [],
    createdAt: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
  };
}
export function mapToCloud(m: MapData, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    world_id: m.worldId,
    name: m.name,
    description: m.description,
    background: m.background,
    aspect_ratio: m.aspectRatio,
    show_grid: m.showGrid,
    pins: m.pins,
    regions: m.regions,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

// ---- scratchpad ----
export function noteFromCloud(row: any): ScratchpadNote {
  return {
    id: row.id,
    worldId: row.world_id ?? null,
    content: row.content ?? '',
    createdAt: Number(row.created_at) || 0,
  };
}
export function noteToCloud(n: ScratchpadNote, userId: string) {
  return {
    id: n.id,
    user_id: userId,
    world_id: n.worldId,
    content: n.content,
    created_at: n.createdAt,
  };
}

// ---- revisions ----
export function revisionFromCloud(row: any): ArticleRevision {
  return {
    id: row.id,
    articleId: row.article_id,
    worldId: row.world_id,
    title: row.title ?? '',
    summary: row.summary ?? '',
    contentJson: row.content_json ?? null,
    meta: row.meta ?? {},
    createdAt: Number(row.created_at) || 0,
  };
}
export function revisionToCloud(r: ArticleRevision, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    article_id: r.articleId,
    world_id: r.worldId,
    title: r.title,
    summary: r.summary,
    content_json: r.contentJson,
    meta: r.meta,
    created_at: r.createdAt,
  };
}
