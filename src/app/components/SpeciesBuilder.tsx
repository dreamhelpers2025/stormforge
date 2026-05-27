import React, { useMemo, useState } from 'react';
import type { Article, SpeciesMeta, DietType, BehaviorPreset, CommunicationMode, RelationshipType } from '../types';
import { TRAITS, TRAIT_MAP, TRAIT_CATEGORIES, WEAKNESSES } from '../lib/traits';
import { ENVIRONMENTS, ENV_MAP } from '../lib/environments';
import { generateMutation, applyMutation, simulateSurvival, type MutationEvent, type SimReport } from '../lib/evolution';
import { compressFile } from '../lib/imageCompress';
import Icon from './Icon';

interface Props {
  article: Article;
  allArticles: Article[];
  onPatch: (meta: Partial<SpeciesMeta>) => void;
  onPatchArticle?: (patch: Partial<Article>) => void;
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

export default function SpeciesBuilder({ article, allArticles, onPatch, onPatchArticle }: Props) {
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
  const mutations: MutationEvent[] = article.meta?.mutations ?? [];
  const [simResult, setSimResult] = useState<SimReport | null>(null);

  function rollMutation() {
    const mut = generateMutation(m);
    const nextMeta = applyMutation(m, mut);
    onPatch({
      ...nextMeta,
      mutations: [...mutations, mut],
    } as any);
  }
  function undoMutation(id: string) {
    onPatch({ mutations: mutations.filter(x => x.id !== id) } as any);
  }
  function runSimulation() { setSimResult(simulateSurvival(m)); }

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
          <button className="btn btn-ghost" onClick={rollMutation} title="Generate a plausible mutation given current biology + environment">
            <Icon name="sparkles" size={13} /> Trigger Mutation
          </button>
          <button className="btn btn-primary" onClick={runSimulation} title="Run a heuristic survival simulation">
            <Icon name="lightning" size={13} /> Simulate Survival
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
              {m.environments.filter(e => !ENV_MAP[e]).map(e => (
                <span
                  key={'custom-env-' + e}
                  className="chip selected"
                  style={{ borderStyle: 'dashed' }}
                  onClick={() => onPatch({ environments: m.environments.filter(x => x !== e) })}
                  title="Custom environment (click to remove)"
                >
                  🌐 {e} <Icon name="x" size={9} />
                </span>
              ))}
              <CustomChipAdder
                placeholder="Custom environment…"
                onAdd={(v) => { if (!m.environments.includes(v)) onPatch({ environments: [...m.environments, v] }); }}
              />
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
              {m.behavior.filter(b => !BEHAVIORS.some(B => B.key === b)).map(b => (
                <span
                  key={'custom-bh-' + b}
                  className="chip selected"
                  style={{ borderStyle: 'dashed' }}
                  onClick={() => onPatch({ behavior: m.behavior.filter(x => x !== b) })}
                  title="Custom behavior (click to remove)"
                >
                  {b} <Icon name="x" size={9} />
                </span>
              ))}
              <CustomChipAdder
                placeholder="Custom behavior…"
                onAdd={(v) => { if (!m.behavior.includes(v as any)) onPatch({ behavior: [...m.behavior, v as any] }); }}
              />
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
              {m.communication.filter(c => !COMMS.some(C => C.key === c)).map(c => (
                <span
                  key={'custom-cm-' + c}
                  className="chip selected"
                  style={{ borderStyle: 'dashed' }}
                  onClick={() => onPatch({ communication: m.communication.filter(x => x !== c) })}
                  title="Custom communication (click to remove)"
                >
                  {c} <Icon name="x" size={9} />
                </span>
              ))}
              <CustomChipAdder
                placeholder="Custom communication…"
                onAdd={(v) => { if (!m.communication.includes(v as any)) onPatch({ communication: [...m.communication, v as any] }); }}
              />
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(() => {
                const predefined = new Set(WEAKNESSES);
                const customs = m.weaknesses.filter(w => !predefined.has(w));
                return (
                  <>
                    {WEAKNESSES.map(w => (
                      <span
                        key={w}
                        className={`chip${m.weaknesses.includes(w) ? ' selected' : ''}`}
                        onClick={() => onPatch({ weaknesses: toggleArr(m.weaknesses, w) })}
                      >
                        {w}
                      </span>
                    ))}
                    {customs.map(w => (
                      <span
                        key={'custom-' + w}
                        className="chip selected"
                        onClick={() => onPatch({ weaknesses: m.weaknesses.filter(x => x !== w) })}
                        title="Custom weakness (click to remove)"
                        style={{ borderStyle: 'dashed' }}
                      >
                        {w} <Icon name="x" size={9} />
                      </span>
                    ))}
                    <CustomChipAdder
                      placeholder="Custom weakness…"
                      onAdd={(w) => { if (!m.weaknesses.includes(w)) onPatch({ weaknesses: [...m.weaknesses, w] }); }}
                    />
                  </>
                );
              })()}
            </div>
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

          {/* Evolution Tree */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>EVOLUTION TREE</div>
                <div className="text-mute" style={{ fontSize: 11 }}>Branching mutations applied to this lineage.</div>
              </div>
              <button className="btn btn-ghost" onClick={rollMutation}>
                <Icon name="sparkles" size={12} /> Trigger mutation
              </button>
            </div>
            {mutations.length === 0 ? (
              <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>
                No mutations recorded yet. Click "Trigger Mutation" to evolve the lineage. Each mutation may add or lose traits and shift biology.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 22 }}>
                <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 1, background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)' }} />
                {mutations.map((mut, i) => (
                  <div key={mut.id} style={{ position: 'relative', marginBottom: 12 }}>
                    <span style={{
                      position: 'absolute', left: -19, top: 6, width: 10, height: 10, borderRadius: 99,
                      background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)',
                    }} />
                    <div className="sf-card" style={{ padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div>
                          <span className="text-eyebrow" style={{ color: 'var(--ember)' }}>Gen {i + 1} · {mut.era}</span>
                        </div>
                        <button className="btn btn-ghost btn-icon" title="Remove this mutation" onClick={() => undoMutation(mut.id)}>
                          <Icon name="x" size={11} />
                        </button>
                      </div>
                      <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.5 }}>{mut.description}</div>
                      {(mut.gainedTraits.length || mut.lostTraits.length) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {mut.gainedTraits.map(k => (
                            <span key={'+' + k} style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 999, background: 'rgba(110,208,153,0.15)', color: 'var(--success)', border: '1px solid rgba(110,208,153,0.35)' }}>
                              +{TRAIT_MAP[k]?.label || k}
                            </span>
                          ))}
                          {mut.lostTraits.map(k => (
                            <span key={'-' + k} style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 999, background: 'rgba(217,122,122,0.12)', color: 'var(--danger)', border: '1px solid rgba(217,122,122,0.35)' }}>
                              −{TRAIT_MAP[k]?.label || k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Survival simulation */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>SURVIVAL SIMULATION</div>
                <div className="text-mute" style={{ fontSize: 11 }}>Run the species through their chosen environments and see what happens.</div>
              </div>
              <button className="btn btn-primary" onClick={runSimulation}>
                <Icon name="lightning" size={12} /> Run sim
              </button>
            </div>
            {!simResult ? (
              <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>
                No simulation yet. The sim checks environment fit, trait synergies, diet coherence, weaknesses, and relationships.
              </div>
            ) : (
              <div className="sf-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: `conic-gradient(${simColor(simResult.score)} ${simResult.score * 3.6}deg, var(--bg-elev-2) 0)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 50, height: 50, borderRadius: '50%', background: 'var(--bg-elev)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Cinzel, serif', fontSize: 18,
                    }}>
                      {simResult.score}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.15em' }}>{simResult.verdict}</div>
                    <div className="text-mute" style={{ fontSize: 12, marginTop: 2 }}>Niche: <strong>{simResult.niche}</strong></div>
                  </div>
                </div>

                <PopulationChart trend={simResult.populationTrend} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--success)' }}>Working for them</div>
                    {simResult.pros.length === 0 ? (
                      <div className="text-dim" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>—</div>
                    ) : (
                      <ul style={{ paddingLeft: 16, margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.55 }}>
                        {simResult.pros.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="text-eyebrow" style={{ color: 'var(--danger)' }}>Working against them</div>
                    {simResult.cons.length === 0 ? (
                      <div className="text-dim" style={{ fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>—</div>
                    ) : (
                      <ul style={{ paddingLeft: 16, margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.55 }}>
                        {simResult.cons.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right column: image/silhouette + stats summary */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 70 }}>
          <SpeciesVisual
            imageDataUrl={article.imageDataUrl}
            seed={m.silhouetteSeed ?? 0}
            traits={m.traits}
            environments={m.environments}
            onReroll={() => onPatch({ silhouetteSeed: Math.floor(Math.random() * 1_000_000) })}
            onUploadImage={onPatchArticle ? async (file) => {
              const compressed = await compressFile(file, 1600, 0.85);
              onPatchArticle({ imageDataUrl: compressed });
            } : undefined}
            onClearImage={onPatchArticle ? () => onPatchArticle({ imageDataUrl: undefined as any }) : undefined}
          />

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

function CustomChipAdder({ onAdd, placeholder = 'Custom…' }: { onAdd: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState('');
  if (!editing) {
    return (
      <span
        className="chip"
        onClick={() => setEditing(true)}
        style={{ borderStyle: 'dashed', color: 'var(--text-mute)' }}
        title="Add a custom option"
      >
        <Icon name="plus" size={10} /> Custom
      </span>
    );
  }
  return (
    <span className="chip" style={{ padding: '2px 8px', borderColor: 'var(--accent)', minWidth: 0 }}>
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => {
          if (v.trim()) onAdd(v.trim());
          setEditing(false);
          setV('');
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            if (v.trim()) onAdd(v.trim());
            setEditing(false);
            setV('');
          }
          if (e.key === 'Escape') {
            setEditing(false);
            setV('');
          }
        }}
        placeholder={placeholder}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text)',
          fontSize: 12,
          width: 130,
        }}
      />
    </span>
  );
}

/** Wrapper that shows uploaded image if present, else procedural silhouette. */
function SpeciesVisual({
  imageDataUrl,
  seed,
  traits,
  environments,
  onReroll,
  onUploadImage,
  onClearImage,
}: {
  imageDataUrl?: string;
  seed: number;
  traits: string[];
  environments: string[];
  onReroll: () => void;
  onUploadImage?: (file: File) => void;
  onClearImage?: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  if (imageDataUrl) {
    return (
      <div className="sf-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="text-eyebrow">Species image</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {onUploadImage && (
              <button className="btn btn-ghost btn-icon" title="Replace image" onClick={() => fileRef.current?.click()}>
                <Icon name="edit" size={13} />
              </button>
            )}
            {onClearImage && (
              <button className="btn btn-ghost btn-icon" title="Remove image (show silhouette)" onClick={onClearImage}>
                <Icon name="x" size={13} />
              </button>
            )}
          </div>
        </div>
        <div
          style={{
            aspectRatio: '1 / 1',
            background: `url(${imageDataUrl}) center/cover`,
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        />
        {onUploadImage && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); e.target.value = ''; }}
          />
        )}
        <div className="text-dim" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          Also used as the article cover
        </div>
      </div>
    );
  }
  return (
    <div className="sf-card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="text-eyebrow">Silhouette</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onUploadImage && (
            <button className="btn btn-ghost btn-icon" title="Upload species image" onClick={() => fileRef.current?.click()}>
              <Icon name="image" size={13} />
            </button>
          )}
          <button className="btn btn-ghost btn-icon" title="Reroll silhouette" onClick={onReroll}>
            <Icon name="sparkles" size={13} />
          </button>
        </div>
      </div>
      <SilhouetteCanvas seed={seed} traits={traits} environments={environments} />
      {onUploadImage && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onUploadImage(f); e.target.value = ''; }}
        />
      )}
      <div className="text-dim" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>
        Procedural from traits — upload an image to replace
      </div>
    </div>
  );
}

/** Procedurally generated silhouette based on seed + selected traits. */
function SilhouetteCanvas({ seed, traits, environments }: { seed: number; traits: string[]; environments: string[] }) {
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
        <ellipse cx={cx} cy={cy} rx={bodyW} ry={bodyH} fill={colA} opacity="0.85" />
        <circle cx={cx + bodyW * 0.8} cy={cy - bodyH * 0.2} r={bodyH * 0.55} fill={colA} />
        <circle cx={cx + bodyW * 0.95} cy={cy - bodyH * 0.3} r="2" fill={glow ? '#43C7C7' : '#fff'} />
        {hasHorns && (
          <>
            <path d={`M ${cx + bodyW * 0.6} ${cy - bodyH * 0.6} l 4 -10`} stroke={colA} strokeWidth="2" strokeLinecap="round" />
            <path d={`M ${cx + bodyW * 0.85} ${cy - bodyH * 0.7} l 3 -12`} stroke={colA} strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {hasWings && (
          <>
            <path d={`M ${cx} ${cy - bodyH * 0.8} Q ${cx - 30} ${cy - bodyH * 2.0} ${cx - 22} ${cy + 4}`} fill={colA} fillOpacity="0.4" />
            <path d={`M ${cx} ${cy - bodyH * 0.8} Q ${cx + 30} ${cy - bodyH * 2.0} ${cx + 22} ${cy + 4}`} fill={colA} fillOpacity="0.4" />
          </>
        )}
        {hasFins && !hasWings && (
          <path d={`M ${cx - 6} ${cy - bodyH} q 6 -12 12 0`} fill={colA} fillOpacity="0.55" />
        )}
        {!hasFins && legs}
      </svg>
    </div>
  );
}

function simColor(score: number): string {
  if (score >= 80) return '#6ed099';
  if (score >= 60) return '#43C7C7';
  if (score >= 40) return '#B88A3B';
  if (score >= 20) return '#d97a7a';
  return '#B0413E';
}

function PopulationChart({ trend }: { trend: number[] }) {
  const max = Math.max(1, ...trend);
  const w = 100, h = 40;
  const points = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <div>
      <div className="text-eyebrow" style={{ marginBottom: 4 }}>Population over 10 generations</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height: 60, display: 'block' }}>
        <defs>
          <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43C7C7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#43C7C7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#popGrad)" />
        <polyline points={points} fill="none" stroke="#43C7C7" strokeWidth="0.8" />
        {trend.map((v, i) => {
          const x = (i / (trend.length - 1)) * w;
          const y = h - (v / max) * (h - 4) - 2;
          return <circle key={i} cx={x} cy={y} r="0.9" fill="#43C7C7" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
        <span>Gen 1: {trend[0]}</span>
        <span>Gen 10: {trend[trend.length - 1]}</span>
      </div>
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
