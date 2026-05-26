import React, { useMemo, useState } from 'react';
import type { Article, SpeciesMeta, DietType, BehaviorPreset, CommunicationMode, RelationshipType } from '../types';
import { TRAITS, TRAIT_MAP, TRAIT_CATEGORIES, WEAKNESSES } from '../lib/traits';
import { ENVIRONMENTS, ENV_MAP } from '../lib/environments';
import Icon from './Icon';

interface Props {
  article: Article;
  allArticles: Article[];
  onPatch: (meta: Partial<SpeciesMeta>) => void;
}

const DIETS: { key: DietType; label: string; emoji: string }[] = [
  { key: 'herbivore',     label: 'Herbivore',     emoji: '🌿' },
  { key: 'carnivore',     label: 'Carnivore',     emoji: '🦴' },
  { key: 'omnivore',      label: 'Omnivore',      emoji: '🍖' },
  { key: 'insectivore',   label: 'Insectivore',   emoji: '🐛' },
  { key: 'photosynthetic',label: 'Photosynthetic',emoji: '☀️' },
  { key: 'magivore',      label: 'Magivore',      emoji: '✨' },
];

const BEHAVIORS: { key: BehaviorPreset; label: string; description: string }[] = [
  { key: 'pack',        label: 'Pack',        description: 'Hunts and lives in coordinated groups.' },
  { key: 'solitary',    label: 'Solitary',    description: 'Avoids its own kind outside of mating.' },
  { key: 'hive',        label: 'Hive',        description: 'Eusocial — queens, workers, drones.' },
  { key: 'territorial', label: 'Territorial', description: 'Defends a claimed range fiercely.' },
  { key: 'migratory',   label: 'Migratory',   description: 'Travels long distances with the seasons.' },
  { key: 'nomadic',     label: 'Nomadic',     description: 'Roams without a fixed range.' },
  { key: 'symbiotic',   label: 'Symbiotic',   description: 'Lives intertwined with another species.' },
];

const COMMS: { key: CommunicationMode; label: string; emoji: string }[] = [
  { key: 'verbal',          label: 'Verbal Speech',    emoji: '🗣️' },
  { key: 'pheromones',      label: 'Pheromones',       emoji: '🧴' },
  { key: 'clicks',          label: 'Clicks & Sonar',   emoji: '📡' },
  { key: 'song',            label: 'Song',             emoji: '🎵' },
  { key: 'telepathy',       label: 'Telepathy',        emoji: '🧿' },
  { key: 'bioluminescence', label: 'Light Patterns',   emoji: '✨' },
  { key: 'gesture',         label: 'Gesture / Posture',emoji: '👋' },
  { key: 'magic',           label: 'Magical',          emoji: '🔮' },
];

const RELATIONSHIPS: { key: RelationshipType; label: string; color: string }[] = [
  { key: 'prey',       label: 'Prey of',     color: '#B0413E' },
  { key: 'predator',   label: 'Hunts',       color: '#B88A3B' },
  { key: 'symbiosis',  label: 'Symbiotic with', color: '#43C7C7' },
  { key: 'rival',      label: 'Rival of',    color: '#7a2b2b' },
  { key: 'kin',        label: 'Kin to',      color: '#D8E0E5' },
  { key: 'parasite',   label: 'Parasite on', color: '#9b6e4f' },
  { key: 'mutualist',  label: 'Mutualist with', color: '#6ed099' },
];

export default function SpeciesBuilder({ article, allArticles, onPatch }: Props) {
  const m: SpeciesMeta = {
    size: article.meta?.size ?? 40,
    lifespan: article.meta?.lifespan ?? 50,
    intelligence: article.meta?.intelligence ?? 55,
    reproductionRate: article.meta?.reproductionRate ?? 40,
    environments: article.meta?.environments ?? [],
    diet: article.meta?.diet ?? 'omnivore',
    behavior: article.meta?.behavior ?? [],
    traits: article.meta?.traits ?? [],
    weaknesses: article.meta?.weaknesses ?? [],
    communication: article.meta?.communication ?? [],
    relationships: article.meta?.relationships ?? [],
    silhouetteSeed: article.meta?.silhouetteSeed ?? 0,
  };

  const otherSpecies = useMemo(
    () => allArticles.filter(a => a.category === 'species' && a.id !== article.id),
    [allArticles, article.id]
  );

  // Adaptation suggester: union of suggested traits from selected envs minus traits already chosen
  const suggestedTraits = useMemo(() => {
    const set = new Set<string>();
    const forbidden = new Set<string>();
    for (const e of m.environments) {
      const env = ENV_MAP[e];
      if (!env) continue;
      env.suggestedTraits.forEach(t => set.add(t));
      env.forbiddenTraits?.forEach(t => forbidden.add(t));
    }
    return TRAITS.filter(t => set.has(t.key) && !m.traits.includes(t.key) && !forbidden.has(t.key));
  }, [m.environments, m.traits]);

  const forbiddenSet = useMemo(() => {
    const out = new Set<string>();
    for (const e of m.environments) {
      const env = ENV_MAP[e];
      env?.forbiddenTraits?.forEach(t => out.add(t));
    }
    return out;
  }, [m.environments]);

  function toggleArr<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  function setSlider(k: keyof SpeciesMeta, v: number) {
    onPatch({ [k]: v } as any);
  }

  function addRelationship() {
    const next = [...m.relationships, { speciesId: otherSpecies[0]?.id ?? '', type: 'prey' as RelationshipType }];
    onPatch({ relationships: next });
  }

  return (
    <div className="sf-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="text-eyebrow text-accent">Species Builder</div>
          <h2 className="text-display" style={{ fontSize: 18, marginTop: 4 }}>Forge their biology</h2>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" disabled title="Coming in Phase 2">
            <Icon name="sparkles" size={13} /> Evolution Tree
          </button>
          <button className="btn btn-ghost" disabled title="Coming in Phase 2">
            <Icon name="lightning" size={13} /> Simulate
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 18, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Core biology sliders */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>CORE BIOLOGY</div>
            <Sliders m={m} setSlider={setSlider} />
          </section>

          {/* Environments */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>ENVIRONMENT</div>
            <div className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>Where do they live? (multi-select)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ENVIRONMENTS.map(env => (
                <span
                  key={env.key}
                  className={`chip${m.environments.includes(env.key) ? ' selected' : ''}`}
                  onClick={() => onPatch({ environments: toggleArr(m.environments, env.key) })}
                  title={env.description}
                >
                  <span>{env.emoji}</span> {env.label}
                </span>
              ))}
            </div>
          </section>

          {/* Diet */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>DIET</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DIETS.map(d => (
                <span
                  key={d.key}
                  className={`chip${m.diet === d.key ? ' selected' : ''}`}
                  onClick={() => onPatch({ diet: d.key })}
                >
                  <span>{d.emoji}</span> {d.label}
                </span>
              ))}
            </div>
          </section>

          {/* Behavior */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>BEHAVIOR</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BEHAVIORS.map(b => (
                <span
                  key={b.key}
                  className={`chip${m.behavior.includes(b.key) ? ' selected' : ''}`}
                  onClick={() => onPatch({ behavior: toggleArr(m.behavior, b.key) })}
                  title={b.description}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </section>

          {/* Communication */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>COMMUNICATION</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMS.map(c => (
                <span
                  key={c.key}
                  className={`chip${m.communication.includes(c.key) ? ' selected' : ''}`}
                  onClick={() => onPatch({ communication: toggleArr(m.communication, c.key) })}
                >
                  <span>{c.emoji}</span> {c.label}
                </span>
              ))}
            </div>
          </section>

          {/* Trait library */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>TRAIT LIBRARY</div>
              <div className="text-dim" style={{ fontSize: 11 }}>Click to add. Selected appear above environment-suggested.</div>
            </div>

            {suggestedTraits.length > 0 && (
              <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(184,138,59,0.08)', border: '1px solid rgba(184,138,59,0.3)' }}>
                <div className="text-eyebrow" style={{ color: 'var(--ember)' }}>Adaptation Suggester</div>
                <div className="text-mute" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  Based on the environments you picked, this species would likely evolve:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {suggestedTraits.slice(0, 10).map(t => (
                    <span
                      key={t.key}
                      className="chip"
                      onClick={() => onPatch({ traits: [...m.traits, t.key] })}
                      title="Add this suggested trait"
                    >
                      <span>{t.icon}</span> {t.label} <Icon name="plus" size={10} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {TRAIT_CATEGORIES.map(group => {
              const traits = TRAITS.filter(t => t.category === group.key);
              return (
                <div key={group.key} style={{ marginBottom: 10 }}>
                  <div className="text-dim" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>{group.label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {traits.map(t => {
                      const has = m.traits.includes(t.key);
                      const forbidden = forbiddenSet.has(t.key);
                      return (
                        <span
                          key={t.key}
                          className={`chip${has ? ' selected' : ''}`}
                          onClick={() => {
                            if (forbidden && !has) return;
                            onPatch({ traits: toggleArr(m.traits, t.key) });
                          }}
                          title={forbidden ? `Cannot have ${t.label} in chosen environment` : t.description}
                          style={forbidden ? { opacity: 0.4, cursor: 'not-allowed', textDecoration: 'line-through' } : {}}
                        >
                          <span>{t.icon}</span> {t.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Weaknesses */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>WEAKNESSES <span className="text-dim" style={{ fontSize: 10, letterSpacing: 0, textTransform: 'none' }}>— forced tradeoffs for balance</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {WEAKNESSES.map(w => (
                <span
                  key={w}
                  className={`chip${m.weaknesses.includes(w) ? ' selected' : ''}`}
                  onClick={() => onPatch({ weaknesses: toggleArr(m.weaknesses, w) })}
                >
                  {w}
                </span>
              ))}
            </div>
            <CustomWeaknessAdder current={m.weaknesses} onAdd={(w) => onPatch({ weaknesses: [...m.weaknesses, w] })} />
          </section>

          {/* Relationship web */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>RELATIONSHIP WEB</div>
              <button className="btn btn-ghost" onClick={addRelationship} disabled={!otherSpecies.length}>
                <Icon name="plus" size={12} /> Add bond
              </button>
            </div>
            {!otherSpecies.length ? (
              <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>Forge another species first to link them.</div>
            ) : m.relationships.length === 0 ? (
              <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>No relationships yet. Predator? Prey? Symbiotic partner?</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.relationships.map((rel, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <select
                      className="select"
                      style={{ width: 'auto' }}
                      value={rel.type}
                      onChange={e => {
                        const next = m.relationships.slice();
                        next[i] = { ...rel, type: e.target.value as RelationshipType };
                        onPatch({ relationships: next });
                      }}
                    >
                      {RELATIONSHIPS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                    <select
                      className="select"
                      value={rel.speciesId}
                      onChange={e => {
                        const next = m.relationships.slice();
                        next[i] = { ...rel, speciesId: e.target.value };
                        onPatch({ relationships: next });
                      }}
                      style={{ flex: 1 }}
                    >
                      {otherSpecies.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                    <input
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="note (optional)"
                      value={rel.note ?? ''}
                      onChange={e => {
                        const next = m.relationships.slice();
                        next[i] = { ...rel, note: e.target.value };
                        onPatch({ relationships: next });
                      }}
                    />
                    <button className="btn btn-ghost btn-icon" onClick={() => {
                      const next = m.relationships.filter((_, idx) => idx !== i);
                      onPatch({ relationships: next });
                    }}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: silhouette + stats summary */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 70 }}>
          <Silhouette seed={m.silhouetteSeed ?? 0} traits={m.traits} environments={m.environments} onReroll={() => onPatch({ silhouetteSeed: Math.floor(Math.random() * 1_000_000) })} />

          <div className="sf-card" style={{ padding: 12 }}>
            <div className="text-eyebrow">Summary</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, marginTop: 6, color: 'var(--text-mute)' }}>
              <div><strong className="text-accent">{sizeLabel(m.size)}</strong> · <strong>{lifeLabel(m.lifespan)}</strong></div>
              <div><strong>{intLabel(m.intelligence)}</strong> · <strong>{reproLabel(m.reproductionRate)}</strong></div>
              <div className="rune-divider-app" />
              <div>Diet: <strong>{m.diet}</strong></div>
              <div>Traits: <strong>{m.traits.length}</strong></div>
              <div>Environments: <strong>{m.environments.length || '—'}</strong></div>
              <div>Behaviors: <strong>{m.behavior.length || '—'}</strong></div>
              <div>Weaknesses: <strong>{m.weaknesses.length || '—'}</strong></div>
              <div>Bonds: <strong>{m.relationships.length || '—'}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Sliders({ m, setSlider }: { m: SpeciesMeta; setSlider: (k: keyof SpeciesMeta, v: number) => void }) {
  const rows: { key: keyof SpeciesMeta; label: string; describe: (v: number) => string }[] = [
    { key: 'size',             label: 'Size',              describe: sizeLabel },
    { key: 'lifespan',         label: 'Lifespan',          describe: lifeLabel },
    { key: 'intelligence',     label: 'Intelligence',      describe: intLabel },
    { key: 'reproductionRate', label: 'Reproduction Rate', describe: reproLabel },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(r => {
        const v = (m as any)[r.key] as number;
        return (
          <div key={r.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span className="label" style={{ marginBottom: 0 }}>{r.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>{r.describe(v)}</span>
            </div>
            <input
              type="range" min={0} max={100} value={v}
              onChange={e => setSlider(r.key, Number(e.target.value))}
              className="slider"
              style={{ ['--pct' as any]: `${v}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function CustomWeaknessAdder({ current, onAdd }: { current: string[]; onAdd: (w: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        className="input"
        style={{ flex: 1 }}
        placeholder="Add custom weakness…"
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && v.trim() && !current.includes(v.trim())) {
            onAdd(v.trim());
            setV('');
          }
        }}
      />
      <button className="btn btn-ghost" onClick={() => {
        if (v.trim() && !current.includes(v.trim())) { onAdd(v.trim()); setV(''); }
      }}>Add</button>
    </div>
  );
}

/** Procedurally generated silhouette based on seed + selected traits. */
function Silhouette({ seed, traits, environments, onReroll }: { seed: number; traits: string[]; environments: string[]; onReroll: () => void }) {
  // Deterministic PRNG from seed
  function rand(n: number) {
    let x = (seed + n * 9301 + 49297) % 233280;
    return x / 233280;
  }
  const bodyRoundness = 0.4 + rand(1) * 0.5;
  const legCount = traits.includes('wings') ? 2 : (traits.includes('burrowing') ? 6 : 2 + Math.floor(rand(2) * 4));
  const hasWings = traits.includes('wings');
  const hasFins = traits.includes('fins') || traits.includes('gills') || environments.includes('ocean');
  const hasTail = rand(3) > 0.35;
  const hasHorns = rand(4) > 0.55 || traits.includes('stone_skin');
  const glow = traits.includes('bioluminescence');
  const huesA = ['#43C7C7', '#1E7C86', '#B88A3B', '#7e7ed8', '#6ed099', '#d97a7a'];
  const colA = huesA[Math.floor(rand(5) * huesA.length)];

  // Body parameters
  const cx = 60, cy = 60;
  const bodyW = 28 + rand(6) * 14;
  const bodyH = bodyW * (0.6 + bodyRoundness * 0.45);

  // Legs
  const legs: JSX.Element[] = [];
  for (let i = 0; i < legCount; i++) {
    const t = (i + 0.5) / legCount;
    const lx = cx - bodyW * 0.7 + bodyW * 1.4 * t;
    const ly = cy + bodyH * 0.4;
    legs.push(<line key={i} x1={lx} y1={ly} x2={lx + (rand(10 + i) - 0.5) * 6} y2={ly + 10 + rand(20 + i) * 6} stroke={colA} strokeWidth="2" strokeLinecap="round" />);
  }

  return (
    <div className="sf-card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="text-eyebrow">Silhouette</div>
        <button className="btn btn-ghost btn-icon" title="Reroll" onClick={onReroll}>
          <Icon name="sparkles" size={13} />
        </button>
      </div>
      <div className="silhouette-frame">
        <svg width="100%" height="100%" viewBox="0 0 120 120">
          <defs>
            <radialGradient id="sgGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colA} stopOpacity={glow ? 0.6 : 0.0} />
              <stop offset="100%" stopColor={colA} stopOpacity="0" />
            </radialGradient>
          </defs>
          {glow && <circle cx={cx} cy={cy} r="40" fill="url(#sgGlow)" />}
          {/* tail */}
          {hasTail && (
            <path d={`M ${cx - bodyW * 0.8} ${cy} Q ${cx - bodyW * 1.4} ${cy + 8} ${cx - bodyW * 1.6} ${cy + 14}`} stroke={colA} strokeWidth="3" fill="none" strokeLinecap="round" />
          )}
          {/* body */}
          <ellipse cx={cx} cy={cy} rx={bodyW} ry={bodyH} fill={colA} opacity="0.85" />
          {/* head */}
          <circle cx={cx + bodyW * 0.8} cy={cy - bodyH * 0.2} r={bodyH * 0.55} fill={colA} />
          {/* eye */}
          <circle cx={cx + bodyW * 0.95} cy={cy - bodyH * 0.3} r="2" fill={glow ? '#43C7C7' : '#fff'} />
          {/* horns */}
          {hasHorns && (
            <>
              <path d={`M ${cx + bodyW * 0.6} ${cy - bodyH * 0.6} l 4 -10`} stroke={colA} strokeWidth="2" strokeLinecap="round" />
              <path d={`M ${cx + bodyW * 0.85} ${cy - bodyH * 0.7} l 3 -12`} stroke={colA} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {/* wings */}
          {hasWings && (
            <>
              <path d={`M ${cx} ${cy - bodyH * 0.8} Q ${cx - 30} ${cy - bodyH * 2.0} ${cx - 22} ${cy + 4}`} fill={colA} fillOpacity="0.4" />
              <path d={`M ${cx} ${cy - bodyH * 0.8} Q ${cx + 30} ${cy - bodyH * 2.0} ${cx + 22} ${cy + 4}`} fill={colA} fillOpacity="0.4" />
            </>
          )}
          {/* fins (back) */}
          {hasFins && !hasWings && (
            <path d={`M ${cx - 6} ${cy - bodyH} q 6 -12 12 0`} fill={colA} fillOpacity="0.55" />
          )}
          {/* legs (only if not full aquatic) */}
          {!hasFins && legs}
        </svg>
      </div>
      <div className="text-dim" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>Generated from traits + seed</div>
    </div>
  );
}

function sizeLabel(v: number): string {
  if (v < 10) return 'Microscopic';
  if (v < 25) return 'Tiny';
  if (v < 45) return 'Small';
  if (v < 60) return 'Medium';
  if (v < 78) return 'Large';
  if (v < 92) return 'Huge';
  return 'Titanic';
}
function lifeLabel(v: number): string {
  if (v < 10) return 'Hours';
  if (v < 25) return 'Months';
  if (v < 45) return '< 20 yrs';
  if (v < 65) return '20–100 yrs';
  if (v < 82) return 'Centuries';
  if (v < 95) return 'Millennia';
  return 'Immortal';
}
function intLabel(v: number): string {
  if (v < 10) return 'Instinctual';
  if (v < 30) return 'Cunning beast';
  if (v < 55) return 'Sapient';
  if (v < 75) return 'Cultured';
  if (v < 90) return 'Genius';
  return 'Transcendent';
}
function reproLabel(v: number): string {
  if (v < 10) return 'Once a century';
  if (v < 25) return 'Slow';
  if (v < 50) return 'Steady';
  if (v < 75) return 'Prolific';
  return 'Rapid bloom';
}
