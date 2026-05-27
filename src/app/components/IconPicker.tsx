import React, { useState } from 'react';
import Icon from './Icon';

interface Props {
  value?: string;
  onChange: (icon: string | undefined) => void;
}

const PRESETS: string[] = [
  '🐉','🐲','🦅','🐺','🦊','🦌','🐍','🕷️','🦂','🦇',
  '👑','⚔️','🛡️','🏹','🗡️','🪓','🔱','⚒️','🪶','📜',
  '🏰','🏯','🗼','⛩️','🏛️','🗿','⛰️','🏔️','🌋','🏝️',
  '🌲','🌳','🌴','🌾','🍂','🌸','🍄','🌵','🌿','💀',
  '🔥','💧','🌊','❄️','🌪️','⚡','☀️','🌙','⭐','✨',
  '🧿','🔮','💎','🪐','🌌','🜂','🜁','🜃','🜄','♾️',
  '🧝','🧙','🧚','🧛','🧜','🧞','🧟','👹','👺','👻',
  '🍷','🗝️','🔑','📖','🪙','💰','⚓','🏺','🪞','🕯️',
];

export default function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Choose article icon"
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          fontSize: 24,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {value || <Icon name="sparkles" size={18} className="text-mute" />}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div
            className="sf-card"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 31,
              width: 280, padding: 10,
            }}
          >
            <div className="text-eyebrow" style={{ marginBottom: 6 }}>Pick an icon</div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4,
              maxHeight: 240, overflowY: 'auto',
            }} className="scrollbar-thin">
              {PRESETS.map(e => (
                <button
                  key={e}
                  onClick={() => { onChange(e); setOpen(false); }}
                  style={{
                    fontSize: 18, padding: 4, borderRadius: 6,
                    background: value === e ? 'rgba(67,199,199,0.18)' : 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    aspectRatio: '1 / 1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(67,199,199,0.10)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = value === e ? 'rgba(67,199,199,0.18)' : 'transparent')}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="rune-divider-app" style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className="input"
                placeholder="Type any emoji…"
                value={custom}
                onChange={ev => setCustom(ev.target.value)}
                style={{ flex: 1, fontSize: 13 }}
                onKeyDown={ev => { if (ev.key === 'Enter' && custom.trim()) { onChange(custom.trim()); setOpen(false); setCustom(''); } }}
              />
              <button
                className="btn btn-primary"
                disabled={!custom.trim()}
                onClick={() => { onChange(custom.trim()); setOpen(false); setCustom(''); }}
              >
                Set
              </button>
            </div>
            {value && (
              <button
                className="btn btn-ghost"
                onClick={() => { onChange(undefined); setOpen(false); }}
                style={{ marginTop: 6, width: '100%', fontSize: 11 }}
              >
                <Icon name="x" size={11} /> Use category default
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
