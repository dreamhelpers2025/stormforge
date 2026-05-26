import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArticles } from '../stores/useArticles';
import { useWorlds } from '../stores/useWorlds';
import { CATEGORIES, CATEGORY_MAP } from '../lib/categories';
import Icon from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: any;
  run: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { worldId } = useParams();
  const articles = useArticles(s => (worldId ? s.byWorld[worldId] ?? [] : []));
  const worlds = useWorlds(s => s.worlds);
  const createArticle = useArticles(s => s.create);

  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => { if (open) { setQ(''); setIdx(0); } }, [open]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    const query = q.trim().toLowerCase();

    // Article matches
    for (const a of articles) {
      if (!query || a.title.toLowerCase().includes(query) || a.contentText.toLowerCase().includes(query)) {
        out.push({
          id: 'a:' + a.id,
          label: a.title,
          hint: CATEGORY_MAP[a.category]?.label,
          icon: CATEGORY_MAP[a.category]?.icon ?? 'codex',
          run: () => navigate(`/w/${a.worldId}/articles/${a.id}`),
        });
      }
    }

    // World matches
    for (const w of worlds) {
      if (!query || w.name.toLowerCase().includes(query)) {
        out.push({
          id: 'w:' + w.id,
          label: w.name,
          hint: 'World',
          icon: 'globe',
          run: () => navigate(`/w/${w.id}`),
        });
      }
    }

    // Quick actions
    if (worldId) {
      for (const c of CATEGORIES) {
        const phrase = `new ${c.label.toLowerCase()}`;
        if (!query || phrase.includes(query) || c.label.toLowerCase().includes(query)) {
          out.push({
            id: 'new:' + c.key,
            label: `New ${c.label}`,
            hint: 'Action',
            icon: 'plus',
            run: async () => {
              const a = await createArticle(worldId, c.key);
              navigate(`/w/${worldId}/articles/${a.id}`);
            },
          });
        }
      }
    }

    return out.slice(0, 60);
  }, [q, articles, worlds, worldId, createArticle, navigate]);

  useEffect(() => { setIdx(0); }, [q, open]);

  function runItem(i: number) {
    const it = items[i];
    if (!it) return;
    it.run();
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(idx); }
  }

  if (!open) return null;

  return (
    <div className="cmdk-backdrop fade-in" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          className="cmdk-input"
          placeholder="Search articles, jump to a world, or type 'new species'…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="cmdk-results scrollbar-thin">
          {items.length === 0 ? (
            <div className="cmdk-empty">No matches. Try another phrase.</div>
          ) : items.map((it, i) => (
            <div
              key={it.id}
              className={`cmdk-item${i === idx ? ' active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => runItem(i)}
            >
              <Icon name={it.icon} size={15} className="text-accent" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</div>
                {it.hint && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{it.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
