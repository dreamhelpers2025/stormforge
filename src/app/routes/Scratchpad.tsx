import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import type { ScratchpadNote } from '../types';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';

export default function Scratchpad() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [draft, setDraft] = useState('');
  const createArticle = useArticles(s => s.create);
  const push = useToast(s => s.push);

  useEffect(() => {
    db.scratchpad.where('worldId').equals(worldId).toArray().then(list => {
      setNotes(list.sort((a, b) => b.createdAt - a.createdAt));
    });
  }, [worldId]);

  async function save() {
    if (!draft.trim()) return;
    const note: ScratchpadNote = { id: nanoid(12), worldId, content: draft.trim(), createdAt: Date.now() };
    await db.scratchpad.put(note);
    setNotes(n => [note, ...n]);
    setDraft('');
  }

  async function remove(id: string) {
    await db.scratchpad.delete(id);
    setNotes(n => n.filter(x => x.id !== id));
  }

  async function promote(note: ScratchpadNote) {
    const firstLine = note.content.split('\n')[0].slice(0, 80);
    const a = await createArticle(worldId, 'note', firstLine);
    await useArticles.getState().update(a.id, {
      contentText: note.content,
      contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: note.content }] }] },
    });
    await db.scratchpad.delete(note.id);
    setNotes(n => n.filter(x => x.id !== note.id));
    push('Promoted to article.', 'success');
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 920, margin: '0 auto', padding: '24px 28px 80px' }}>
      <div className="text-eyebrow">Loose Threads</div>
      <h1 className="text-display" style={{ fontSize: 28, margin: '4px 0 16px' }}>Scratchpad</h1>
      <p className="text-mute" style={{ fontSize: 13.5, marginBottom: 18, maxWidth: 600 }}>
        For half-formed ideas, dialogue snippets, throwaway names. Anything worth a real entry can be promoted to an article.
      </p>

      <div className="sf-card" style={{ padding: 14, marginBottom: 20 }}>
        <textarea
          className="textarea"
          rows={4}
          placeholder="What's circling in your head right now?"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span className="text-dim" style={{ fontSize: 11 }}>Ctrl/⌘ + Enter to save</span>
          <button className="btn btn-primary" onClick={save} disabled={!draft.trim()}>
            <Icon name="plus" size={13} /> Add note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon="feather"
          title="Scratchpad is empty"
          description="Capture a raw idea above. You can always come back and turn it into a full article."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map(n => (
            <div key={n.id} className="sf-card" style={{ padding: 12 }}>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55 }}>{n.content}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                <span className="text-dim" style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleString()}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost" onClick={() => promote(n)}>
                    <Icon name="arrow-right" size={12} /> Promote to article
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => remove(n.id)} title="Delete">
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
