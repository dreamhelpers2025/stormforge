import React, { useMemo, useState } from 'react';
import { TEMPLATES, type TemplateSection } from '../lib/templates';
import type { ArticleCategory } from '../types';
import Icon from './Icon';

interface Props {
  category: ArticleCategory;
  /** Called with selected sections; parent does the actual insertion. */
  onInsert: (sections: TemplateSection[]) => void;
  onClose: () => void;
}

export default function PromptPicker({ category, onInsert, onClose }: Props) {
  const all = TEMPLATES[category] ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(s =>
      s.heading.toLowerCase().includes(query) ||
      s.prompt.toLowerCase().includes(query)
    );
  }, [all, q]);

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map(s => s.heading)));
  }

  function clear() {
    setSelected(new Set());
  }

  function doInsert() {
    const picks = all.filter(s => selected.has(s.heading));
    if (picks.length === 0) { onClose(); return; }
    onInsert(picks);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 'min(720px, 96vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div className="text-eyebrow">Prompts</div>
            <h2 className="text-display" style={{ fontSize: 20, margin: '4px 0 0' }}>Add to this article</h2>
            <p className="text-mute" style={{ fontSize: 12.5, marginTop: 4 }}>
              Tap any prompt to add it. Selected prompts are inserted as headings + italic questions at your cursor.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>
              <Icon name="search" size={13} />
            </div>
            <input
              className="input"
              placeholder="Filter prompts…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 30 }}
              autoFocus
            />
          </div>
          <button className="btn btn-ghost" onClick={selectAll} disabled={!filtered.length}>Select all</button>
          {selected.size > 0 && <button className="btn btn-ghost" onClick={clear}>Clear ({selected.size})</button>}
        </div>

        <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
          {filtered.length === 0 ? (
            <div className="text-mute" style={{ padding: 40, textAlign: 'center', fontStyle: 'italic' }}>
              No matching prompts.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {filtered.map(s => {
                const isOn = selected.has(s.heading);
                return (
                  <button
                    key={s.heading}
                    onClick={() => toggle(s.heading)}
                    className="sf-card"
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      cursor: 'pointer',
                      border: isOn ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isOn ? 'rgba(67,199,199,0.10)' : undefined,
                      transition: 'border-color .12s, background .12s, transform .08s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: 4,
                        border: isOn ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isOn ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {isOn && <Icon name="check" size={10} className="" />}
                      </span>
                      <span className="text-display" style={{ fontSize: 12.5, letterSpacing: '0.1em', color: 'var(--text)' }}>
                        {s.heading}
                      </span>
                    </div>
                    <div className="text-mute text-serif" style={{ fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.45 }}>
                      {s.prompt}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rune-divider-app" style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="text-dim" style={{ fontSize: 12 }}>
            {selected.size === 0 ? 'No prompts selected' : `${selected.size} prompt${selected.size === 1 ? '' : 's'} selected`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={doInsert} disabled={selected.size === 0}>
              Insert {selected.size > 0 && `(${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Convert selected sections into Tiptap insertContent shape for cursor-position insertion. */
export function sectionsToTiptapNodes(sections: TemplateSection[]): any[] {
  const nodes: any[] = [];
  for (const s of sections) {
    nodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: s.heading }] });
    nodes.push({ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: s.prompt }] });
  }
  return nodes;
}
