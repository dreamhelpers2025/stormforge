import React, { useState } from 'react';
import { useSettings } from '../stores/useSettings';
import Icon from './Icon';
import Sigil from './Sigil';

const STEPS: { title: string; body: string; icon: any }[] = [
  {
    title: 'Welcome to Stormforge Archive',
    body: 'This is your private worldbuilding workspace. Everything you create lives in your browser — no account, no upload, fully offline. You can export any world to JSON at any time.',
    icon: 'codex',
  },
  {
    title: 'Worlds hold everything',
    body: 'Every realm you forge gets its own archive. Articles, scratchpad notes, species — all isolated per world. Use the world switcher at the top of the sidebar to jump between them.',
    icon: 'globe',
  },
  {
    title: 'Articles are wiki pages',
    body: 'Every species, place, character, and concept is an article. Use [[Wiki Link]] syntax inside the editor to connect them — broken links glow ember, resolved ones glow teal.',
    icon: 'scroll',
  },
  {
    title: 'The Species Builder is special',
    body: 'When you create a Species article, you get sliders, a trait library, environment selectors, an adaptation suggester, a weakness builder, and a relationship web — built specifically for ecological worldcraft.',
    icon: 'dragon',
  },
  {
    title: 'Quick keys',
    body: 'Ctrl/⌘ + K opens search. Ctrl/⌘ + S saves an article. Ctrl/⌘ + N opens the new-article menu. Most things are one keystroke away.',
    icon: 'sparkles',
  },
  {
    title: 'Forge well',
    body: 'There is no right way. Stormforge bends to your story. When in doubt, open a Scratchpad note and write — you can promote any scratch into a real article later.',
    icon: 'flame',
  },
];

export default function Tutorial() {
  const hasSeenTutorial = useSettings(s => s.settings.hasSeenTutorial);
  const loaded = useSettings(s => s.loaded);
  const markSeen = useSettings(s => s.markTutorialSeen);
  const [forceOpen, setForceOpen] = useState(false);
  const [step, setStep] = useState(0);

  if (!loaded) return null;
  if (hasSeenTutorial && !forceOpen) {
    // expose a global escape hatch
    (window as any).__stormforgeReopenTutorial = () => { setForceOpen(true); setStep(0); };
    return null;
  }

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  function close() {
    markSeen();
    setForceOpen(false);
  }

  return (
    <div className="modal-backdrop fade-in" style={{ alignItems: 'center' }}>
      <div className="modal" style={{ width: 'min(540px, 95vw)', padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          {step === 0 ? <Sigil size={64} className="text-accent" /> : (
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(67,199,199,0.18), transparent 70%)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
            }}>
              <Icon name={cur.icon} size={26} />
            </div>
          )}
        </div>

        <div className="text-eyebrow" style={{ textAlign: 'center' }}>Step {step + 1} of {STEPS.length}</div>
        <h2 className="text-display" style={{ fontSize: 22, textAlign: 'center', margin: '8px 0 12px' }}>{cur.title}</h2>
        <p className="text-mute" style={{ fontSize: 14.5, lineHeight: 1.6, textAlign: 'center' }}>{cur.body}</p>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '20px 0 16px' }}>
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: 7, height: 7, borderRadius: 99,
                background: i === step ? 'var(--accent)' : 'var(--border)',
                transition: 'background .15s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button className="btn btn-ghost" onClick={close}>Skip tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
            {isLast ? (
              <button className="btn btn-primary" onClick={close}>Begin</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
