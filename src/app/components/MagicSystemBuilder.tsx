import React, { useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { Article } from '../types';
import Icon from './Icon';

interface MagicSystemMeta {
  source: string;              // where magic comes from
  costType: string[];          // life force, sanity, time, components, debt, etc.
  rules: { id: string; text: string }[];          // hard rules — castable can't violate these
  limits: { id: string; text: string }[];         // soft limits — strain caster but possible
  schools: { id: string; name: string; description: string; color: string }[];
  components: string[];        // wands, runes, gestures, etc.
  practitionerName: string;    // what is a mage called
  rarityOfPower: number;       // 0-100 (everyone has it -> almost no one)
  reliability: number;         // 0-100 (chaotic -> deterministic)
  cosmicCost: number;          // 0-100 (free -> world-shattering)
}

const SOURCE_PRESETS = [
  'Divine — granted by deities',
  'Innate — born with the spark',
  'Studied — learned arcane laws',
  'Pact — bargained from elsewhere',
  'Material — drawn from a substance',
  'Tempestuous — drawn from storms / chaos',
  'Ancestral — inherited bloodline gift',
  'Place — flows from sacred sites',
  'Other (custom)',
];

const COST_OPTIONS = [
  'Life force', 'Sanity', 'Memory', 'Years of lifespan', 'Sleep', 'Material components',
  'Sacred words', 'A piece of self', 'Time debt', 'Bound oaths', 'Pain', 'Emotional toll',
  'Cold (caster temperature drops)', 'Hunger', 'Reputation', 'Visible scars',
];

const COMPONENT_OPTIONS = [
  'Verbal incantation', 'Somatic gestures', 'Focus object (wand/staff)', 'Runes drawn',
  'Sacred materials', 'Sacrificed object', 'Drawn blood', 'Specific location',
  'Specific time (dusk, eclipse…)', 'Holy / unholy ground', 'Sung music', 'Silent intention',
];

const SCHOOL_COLORS = ['#43C7C7', '#B88A3B', '#B0413E', '#6ed099', '#c084fc', '#93c5fd', '#D8E0E5'];

interface Props {
  article: Article;
  onPatch: (meta: Partial<MagicSystemMeta>) => void;
}

export default function MagicSystemBuilder({ article, onPatch }: Props) {
  const m: MagicSystemMeta = {
    source: article.meta?.source ?? '',
    costType: article.meta?.costType ?? [],
    rules: article.meta?.rules ?? [],
    limits: article.meta?.limits ?? [],
    schools: article.meta?.schools ?? [],
    components: article.meta?.components ?? [],
    practitionerName: article.meta?.practitionerName ?? '',
    rarityOfPower: article.meta?.rarityOfPower ?? 50,
    reliability: article.meta?.reliability ?? 60,
    cosmicCost: article.meta?.cosmicCost ?? 40,
  };

  const [castingTab, setCastingTab] = useState<'build' | 'sandbox'>('build');

  function addRule() { onPatch({ rules: [...m.rules, { id: nanoid(6), text: '' }] }); }
  function updateRule(id: string, text: string) { onPatch({ rules: m.rules.map(r => r.id === id ? { ...r, text } : r) }); }
  function removeRule(id: string) { onPatch({ rules: m.rules.filter(r => r.id !== id) }); }
  function addLimit() { onPatch({ limits: [...m.limits, { id: nanoid(6), text: '' }] }); }
  function updateLimit(id: string, text: string) { onPatch({ limits: m.limits.map(r => r.id === id ? { ...r, text } : r) }); }
  function removeLimit(id: string) { onPatch({ limits: m.limits.filter(r => r.id !== id) }); }
  function addSchool() {
    const idx = m.schools.length;
    onPatch({ schools: [...m.schools, { id: nanoid(6), name: 'New School', description: '', color: SCHOOL_COLORS[idx % SCHOOL_COLORS.length] }] });
  }
  function updateSchool(id: string, patch: Partial<MagicSystemMeta['schools'][number]>) {
    onPatch({ schools: m.schools.map(s => s.id === id ? { ...s, ...patch } : s) });
  }
  function removeSchool(id: string) { onPatch({ schools: m.schools.filter(s => s.id !== id) }); }

  function toggleArr<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
  }

  return (
    <div className="sf-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="text-eyebrow text-accent">Magic System</div>
          <h2 className="text-display" style={{ fontSize: 18, marginTop: 4 }}>Codify the arcane</h2>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <button className={`btn ${castingTab === 'build' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCastingTab('build')} style={{ padding: '4px 10px', fontSize: 11 }}>Build</button>
          <button className={`btn ${castingTab === 'sandbox' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setCastingTab('sandbox')} style={{ padding: '4px 10px', fontSize: 11 }}>Cast Sandbox</button>
        </div>
      </div>

      {castingTab === 'build' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
          {/* Source */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>THE SOURCE</div>
            <div className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>Where does magic come from in this world?</div>
            <select className="select" style={{ marginBottom: 6 }} value={SOURCE_PRESETS.includes(m.source) ? m.source : 'Other (custom)'} onChange={e => onPatch({ source: e.target.value === 'Other (custom)' ? '' : e.target.value })}>
              {SOURCE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(!SOURCE_PRESETS.includes(m.source)) && (
              <input className="input" placeholder="Describe the source…" value={m.source} onChange={e => onPatch({ source: e.target.value })} />
            )}
          </section>

          {/* Practitioner name */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>PRACTITIONER NAME</div>
            <input className="input" placeholder="What is one called who wields this? (Mage, Stormcaller, Whisperer…)" value={m.practitionerName} onChange={e => onPatch({ practitionerName: e.target.value })} />
          </section>

          {/* Sliders */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 10 }}>NATURE OF POWER</div>
            <SliderRow
              label="Rarity of power" value={m.rarityOfPower} onChange={v => onPatch({ rarityOfPower: v })}
              left="Everyone" right="Almost no one" describe={rarityLabel}
            />
            <SliderRow
              label="Reliability" value={m.reliability} onChange={v => onPatch({ reliability: v })}
              left="Wild & chaotic" right="Hard science" describe={reliabilityLabel}
            />
            <SliderRow
              label="Cosmic cost" value={m.cosmicCost} onChange={v => onPatch({ cosmicCost: v })}
              left="Free" right="World-shattering" describe={cosmicLabel}
            />
          </section>

          {/* Costs */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>WHAT IT COSTS</div>
            <div className="text-mute" style={{ fontSize: 12, marginBottom: 8 }}>What does casting take from the caster?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COST_OPTIONS.map(c => (
                <span key={c} className={`chip${m.costType.includes(c) ? ' selected' : ''}`} onClick={() => onPatch({ costType: toggleArr(m.costType, c) })}>{c}</span>
              ))}
            </div>
          </section>

          {/* Components */}
          <section>
            <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em', marginBottom: 8 }}>COMPONENTS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMPONENT_OPTIONS.map(c => (
                <span key={c} className={`chip${m.components.includes(c) ? ' selected' : ''}`} onClick={() => onPatch({ components: toggleArr(m.components, c) })}>{c}</span>
              ))}
            </div>
          </section>

          {/* Schools */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>SCHOOLS / BRANCHES</div>
              <button className="btn btn-ghost" onClick={addSchool}><Icon name="plus" size={12} /> Add school</button>
            </div>
            {m.schools.length === 0 ? (
              <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>No schools yet. Elemental? Necromancy? Mind-bending?</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {m.schools.map(s => (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 8, alignItems: 'start', padding: 8, background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {SCHOOL_COLORS.map(c => (
                        <button key={c} onClick={() => updateSchool(s.id, { color: c })} style={{ width: 16, height: 14, borderRadius: 3, background: c, border: s.color === c ? '1px solid #fff' : '1px solid var(--border)', cursor: 'pointer' }} />
                      )).slice(0, 4)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input className="input" value={s.name} onChange={e => updateSchool(s.id, { name: e.target.value })} />
                      <textarea className="textarea" rows={2} placeholder="What this school does, who learns it…" value={s.description} onChange={e => updateSchool(s.id, { description: e.target.value })} />
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => removeSchool(s.id)}><Icon name="x" size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Hard rules */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>HARD RULES</div>
                <div className="text-mute" style={{ fontSize: 11 }}>Things this magic CANNOT do. The sandbox checks against these.</div>
              </div>
              <button className="btn btn-ghost" onClick={addRule}><Icon name="plus" size={12} /> Add rule</button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {m.rules.length === 0 && <div className="text-mute" style={{ fontSize: 13, fontStyle: 'italic' }}>Examples: "Cannot raise the truly dead", "Cannot create matter from nothing", "Cannot bind a willing soul"</div>}
              {m.rules.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 6 }}>
                  <input className="input" placeholder="Cannot…" value={r.text} onChange={e => updateRule(r.id, e.target.value)} />
                  <button className="btn btn-ghost btn-icon" onClick={() => removeRule(r.id)}><Icon name="x" size={13} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* Soft limits */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div className="text-display" style={{ fontSize: 12, letterSpacing: '0.2em' }}>SOFT LIMITS</div>
                <div className="text-mute" style={{ fontSize: 11 }}>Things that strain or scar a caster — possible but costly.</div>
              </div>
              <button className="btn btn-ghost" onClick={addLimit}><Icon name="plus" size={12} /> Add limit</button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {m.limits.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 6 }}>
                  <input className="input" placeholder="Strains the caster when…" value={r.text} onChange={e => updateLimit(r.id, e.target.value)} />
                  <button className="btn btn-ghost btn-icon" onClick={() => removeLimit(r.id)}><Icon name="x" size={13} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <CastSandbox meta={m} />
      )}
    </div>
  );
}

function SliderRow({ label, value, onChange, left, right, describe }: { label: string; value: number; onChange: (n: number) => void; left: string; right: string; describe: (n: number) => string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span className="label" style={{ marginBottom: 0 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>{describe(value)}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="slider" style={{ ['--pct' as any]: `${value}%` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

function rarityLabel(v: number): string {
  if (v < 10) return 'Universal — every soul has it';
  if (v < 30) return 'Widespread — common skill';
  if (v < 55) return 'Talented few';
  if (v < 80) return 'Rare gift';
  return 'Almost mythical';
}
function reliabilityLabel(v: number): string {
  if (v < 15) return 'Wild — outcomes vary madly';
  if (v < 40) return 'Unstable — needs care';
  if (v < 65) return 'Trustworthy with effort';
  if (v < 85) return 'Reliable, science-like';
  return 'Deterministic — laws never bend';
}
function cosmicLabel(v: number): string {
  if (v < 15) return 'Cost-free, easy';
  if (v < 35) return 'Mild personal cost';
  if (v < 60) return 'Lasting personal cost';
  if (v < 85) return 'Cosmic disturbance';
  return 'World-shattering';
}

/* ---- Cast Sandbox ---- */

interface CastResult {
  status: 'allowed' | 'strained' | 'forbidden';
  reasons: string[];
  warnings: string[];
}

function evaluateCast(intent: string, meta: MagicSystemMeta): CastResult {
  const text = intent.toLowerCase();
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Heuristic check against hard rules
  for (const r of meta.rules) {
    if (!r.text.trim()) continue;
    const kw = extractKeywords(r.text);
    const hits = kw.filter(k => k.length > 3 && text.includes(k));
    if (hits.length >= Math.max(1, Math.floor(kw.length * 0.35))) {
      reasons.push(`Violates declared rule: "${r.text}" (matched: ${hits.slice(0, 3).join(', ')})`);
    }
  }

  // Soft limits
  for (const r of meta.limits) {
    if (!r.text.trim()) continue;
    const kw = extractKeywords(r.text);
    const hits = kw.filter(k => k.length > 3 && text.includes(k));
    if (hits.length >= Math.max(1, Math.floor(kw.length * 0.35))) {
      warnings.push(`Strains a declared limit: "${r.text}"`);
    }
  }

  // Components — if any component is required, warn if absent
  if (meta.components.length) {
    const present = meta.components.filter(c => {
      const kw = extractKeywords(c);
      return kw.some(k => text.includes(k));
    });
    if (present.length === 0) {
      warnings.push(`No declared components present in intent (system requires: ${meta.components.slice(0, 3).join(', ')}${meta.components.length > 3 ? '…' : ''})`);
    }
  }

  // Cost call-out
  const costWord = meta.costType.find(c => extractKeywords(c).some(k => text.includes(k)));
  if (meta.costType.length && !costWord) {
    warnings.push('Caster has not paid the system\'s usual cost. Where does this energy come from?');
  }

  // Cosmic-cost magnitude flag
  if (meta.cosmicCost > 70) {
    warnings.push('In this system, ANY successful casting reverberates outward. Expect consequences.');
  }

  let status: CastResult['status'] = 'allowed';
  if (reasons.length) status = 'forbidden';
  else if (warnings.length) status = 'strained';

  return { status, reasons, warnings };
}

function extractKeywords(s: string): string[] {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w));
}
const STOPWORDS = new Set([
  'the','a','an','of','to','and','or','but','in','on','at','by','for','with','is','are',
  'be','been','being','from','as','that','this','it','its','must','can','cannot','do','does',
  'not','no','than','then','so','if','when','while','because','about','any','all','some',
  'caster','casters','magic','spell','spells','cast','casting','wield','wielder',
  'one','two','three','only','also','very','really','just',
]);

function CastSandbox({ meta }: { meta: MagicSystemMeta }) {
  const [intent, setIntent] = useState('');
  const [result, setResult] = useState<CastResult | null>(null);

  function run() {
    if (!intent.trim()) { setResult(null); return; }
    setResult(evaluateCast(intent, meta));
  }

  return (
    <div>
      <div className="text-mute" style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
        Describe a spell or magical intent in plain words. The sandbox checks it against the <strong>hard rules</strong>, <strong>soft limits</strong>, <strong>components</strong>, and <strong>costs</strong> you declared above and tells you whether your own system would permit it.
      </div>
      <textarea
        className="textarea"
        rows={5}
        placeholder="e.g. 'A mage tries to raise her dead brother by burning ten years of her own life'…"
        value={intent}
        onChange={e => setIntent(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={run} disabled={!intent.trim()}><Icon name="lightning" size={13} /> Evaluate cast</button>
        <button className="btn btn-ghost" onClick={() => { setIntent(''); setResult(null); }}>Clear</button>
      </div>

      {result && (
        <div className="sf-card" style={{ padding: 14, marginTop: 14, borderColor: result.status === 'forbidden' ? 'rgba(217,122,122,0.6)' : result.status === 'strained' ? 'rgba(184,138,59,0.6)' : 'rgba(110,208,153,0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: result.status === 'forbidden' ? 'var(--danger)' : result.status === 'strained' ? 'var(--ember)' : 'var(--success)' }} />
            <div className="text-display" style={{ fontSize: 14, letterSpacing: '0.18em' }}>
              {result.status === 'allowed' ? 'ALLOWED' : result.status === 'strained' ? 'STRAINED — POSSIBLE BUT COSTLY' : 'FORBIDDEN BY YOUR RULES'}
            </div>
          </div>
          {result.reasons.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="text-eyebrow" style={{ color: 'var(--danger)' }}>Hard rule violations</div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text)' }}>
                {result.reasons.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="text-eyebrow" style={{ color: 'var(--ember)' }}>Cautions</div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-mute)' }}>
                {result.warnings.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
              </ul>
            </div>
          )}
          {result.status === 'allowed' && (
            <div className="text-mute" style={{ fontSize: 13, marginTop: 10, fontStyle: 'italic' }}>
              Your rules don't object. (This is heuristic — final word is yours.)
            </div>
          )}
        </div>
      )}

      <div className="text-dim" style={{ fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        Note: the sandbox uses keyword overlap. Phrasing matters — describe the intent in the same vocabulary you used in your rules ("raise the dead", "create matter", "bind a soul") for tighter detection.
      </div>
    </div>
  );
}
