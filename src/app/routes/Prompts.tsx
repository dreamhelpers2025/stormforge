import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PROMPTS } from '../lib/prompts';
import { useArticles } from '../stores/useArticles';
import { useToast } from '../stores/useToast';
import Icon from '../components/Icon';

export default function Prompts() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const createArticle = useArticles(s => s.create);
  const push = useToast(s => s.push);
  const [seed, setSeed] = useState(0);

  const shuffled = [...PROMPTS].sort((_, __) => Math.random() - 0.5);

  async function startWith(prompt: string) {
    const a = await createArticle(worldId, 'note', prompt.slice(0, 60));
    await useArticles.getState().update(a.id, {
      contentText: prompt,
      contentJson: {
        type: 'doc',
        content: [
          { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: prompt }] }] },
          { type: 'paragraph' },
        ],
      },
    });
    push('Started a new note from this prompt.', 'success');
    navigate(`/w/${worldId}/articles/${a.id}`);
  }

  return (
    <div className="fade-in" style={{ maxWidth: 920, margin: '0 auto', padding: '24px 28px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="text-eyebrow">Inspiration</div>
          <h1 className="text-display" style={{ fontSize: 28, margin: '4px 0' }}>Writing Prompts</h1>
          <p className="text-mute" style={{ fontSize: 13.5, maxWidth: 540, lineHeight: 1.6 }}>
            Stuck? Pick a prompt to start a note. Every prompt is yours to mangle.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setSeed(s => s + 1)}>
          <Icon name="sparkles" size={13} /> Shuffle
        </button>
      </div>

      <div key={seed} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 18 }}>
        {shuffled.map((p, i) => (
          <div key={i} className="sf-card hoverable" style={{ padding: 16 }} onClick={() => startWith(p)}>
            <div className="text-serif" style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.55 }}>"{p}"</div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', color: 'var(--accent)', fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Begin <Icon name="arrow-right" size={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
