import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticles, EMPTY_ARTICLES } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import { useSettings } from '../stores/useSettings';
import { CATEGORY_MAP } from '../lib/categories';
import Editor from '../components/Editor';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import SpeciesBuilder from '../components/SpeciesBuilder';
import type { Article } from '../types';

export default function ArticleEditor() {
  const { worldId = '', articleId = '' } = useParams();
  const navigate = useNavigate();
  const articles = useArticles(s => s.byWorld[worldId] ?? EMPTY_ARTICLES) as any;
  const updateArticle = useArticles(s => s.update);
  const removeArticle = useArticles(s => s.remove);
  const push = useToast(s => s.push);
  const pushRecent = useSettings(s => s.pushRecentArticle);

  const article = useMemo(() => articles.find(a => a.id === articleId), [articles, articleId]);
  const [draft, setDraft] = useState<Article | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imageInput] = useState(() => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    return inp;
  });

  useEffect(() => {
    if (article) {
      setDraft(article);
      pushRecent(article.id);
    }
    setDirty(false);
  }, [article?.id]);

  const articlesIndex = useMemo<Record<string, Article>>(() => {
    const out: Record<string, Article> = {};
    for (const a of articles) out[a.id] = a;
    return out;
  }, [articles]);

  // Auto-save: debounce 800ms after last change
  const saveTimer = useRef<any>(null);
  useEffect(() => {
    if (!dirty || !draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateArticle(draft.id, {
        title: draft.title,
        summary: draft.summary,
        contentJson: draft.contentJson,
        contentText: draft.contentText,
        imageDataUrl: draft.imageDataUrl,
        tags: draft.tags,
        meta: draft.meta,
        pinned: draft.pinned,
        status: draft.status,
      });
      setDirty(false);
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [draft, dirty, updateArticle]);

  // Cmd/Ctrl+S to force-save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (saveTimer.current) clearTimeout(saveTimer.current);
        if (draft) updateArticle(draft.id, draft as any).then(() => { setDirty(false); push('Saved.', 'success'); });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, updateArticle, push]);

  if (!article || !draft) {
    return <EmptyState title="Article not found" description="It may have been erased. Return to the article list." />;
  }

  const cat = CATEGORY_MAP[draft.category];

  function patch<K extends keyof Article>(key: K, value: Article[K]) {
    setDraft(d => d ? ({ ...d, [key]: value }) : d);
    setDirty(true);
  }

  function chooseImage() {
    imageInput.value = '';
    imageInput.onchange = () => {
      const file = imageInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => patch('imageDataUrl', reader.result as string);
      reader.readAsDataURL(file);
    };
    imageInput.click();
  }

  return (
    <div className="fade-in" style={{ maxWidth: 980, margin: '0 auto', padding: '20px 28px 80px' }}>
      {/* Hero / cover */}
      {draft.imageDataUrl ? (
        <div style={{ position: 'relative', height: 220, borderRadius: 12, marginBottom: 18, background: `url(${draft.imageDataUrl}) center/cover`, border: '1px solid var(--border)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)', borderRadius: 12 }} />
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-icon" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={chooseImage} title="Change image"><Icon name="edit" size={14} /></button>
            <button className="btn btn-ghost btn-icon" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }} onClick={() => patch('imageDataUrl', undefined as any)} title="Remove image"><Icon name="x" size={14} /></button>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div className="text-eyebrow" style={{ color: cat.accent }}>{cat.label}</div>
        <input
          className="input"
          style={{ background: 'transparent', border: 'none', padding: 0, fontFamily: 'Cinzel, serif', fontSize: 32, letterSpacing: '0.04em' }}
          value={draft.title}
          placeholder="Untitled"
          onChange={e => patch('title', e.target.value)}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => patch('pinned', !draft.pinned)}>
          <Icon name="star" size={13} className={draft.pinned ? 'text-accent' : ''} /> {draft.pinned ? 'Pinned' : 'Pin'}
        </button>
        {!draft.imageDataUrl && (
          <button className="btn btn-ghost" onClick={chooseImage}><Icon name="image" size={13} /> Cover image</button>
        )}
        <select
          className="select"
          style={{ width: 'auto' }}
          value={draft.status}
          onChange={e => patch('status', e.target.value as any)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <input
          className="input"
          style={{ width: 220 }}
          placeholder="tags, comma, separated"
          value={draft.tags.join(', ')}
          onChange={e => patch('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {dirty ? 'Saving…' : `Saved ${new Date(article.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </span>
          <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}><Icon name="trash" size={13} /></button>
        </div>
      </div>

      {/* Summary */}
      <textarea
        className="textarea"
        rows={2}
        placeholder="One-line summary (shown in lists and graphs)"
        value={draft.summary}
        onChange={e => patch('summary', e.target.value)}
        style={{ marginBottom: 14, fontStyle: 'italic' }}
      />

      {/* Category-specific builder OR editor */}
      {draft.category === 'species' && (
        <div style={{ marginBottom: 18 }}>
          <SpeciesBuilder
            article={draft}
            allArticles={articles}
            onPatch={(meta) => patch('meta', { ...(draft.meta ?? {}), ...meta })}
          />
        </div>
      )}

      <Editor
        key={draft.id}
        initialJson={draft.contentJson}
        articlesIndex={articlesIndex}
        onChange={(json, text) => {
          setDraft(d => d ? ({ ...d, contentJson: json, contentText: text }) : d);
          setDirty(true);
        }}
        onOpenArticle={(id) => navigate(`/w/${worldId}/articles/${id}`)}
      />

      {confirmDelete && (
        <ConfirmDialog
          title="Erase this article?"
          description="Cannot be undone. Export your world first if you may want it back."
          confirmLabel="Erase"
          danger
          onConfirm={async () => {
            await removeArticle(draft.id);
            setConfirmDelete(false);
            navigate(`/w/${worldId}/articles`);
            push('Article erased.', 'info');
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
