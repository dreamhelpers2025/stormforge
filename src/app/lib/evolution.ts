import { TRAITS, TRAIT_MAP } from './traits';
import { ENV_MAP } from './environments';
import type { SpeciesMeta } from '../types';

export interface MutationEvent {
  id: string;
  era: string;
  description: string;
  /** Trait keys gained at this event */
  gainedTraits: string[];
  /** Trait keys lost at this event */
  lostTraits: string[];
  /** Slider deltas applied at this event (additive) */
  sliderDeltas?: Partial<Pick<SpeciesMeta, 'size' | 'lifespan' | 'intelligence' | 'reproductionRate'>>;
  createdAt: number;
}

const ERAS = [
  'Primordial Era', 'First Stirring', 'Long Quiet', 'Age of Branching',
  'Ash Years', 'Tempest Wake', 'Hidden Centuries', 'Modern Age',
];
const SUFFIXES = ['adapted to deeper waters', 'shed an ancient fear', 'spread into new ranges', 'inherited a survival quirk', 'paid a cost for power', 'split from a sibling lineage', 'survived a great cataclysm', 'gained an unforeseen ally', 'lost what they no longer needed', 'underwent a quiet revolution'];
const VERBS_GAIN = ['developed', 'evolved', 'gained', 'inherited', 'awakened'];
const VERBS_LOSS = ['shed', 'lost', 'abandoned', 'forgot', 'sacrificed'];

/** Generate a plausible mutation event given current meta + a random seed. */
export function generateMutation(meta: SpeciesMeta): MutationEvent {
  const id = Math.random().toString(36).slice(2, 8);
  const era = ERAS[Math.floor(Math.random() * ERAS.length)];

  // Pick a trait to gain — prefer environment-suggested or random new
  const envTraits = new Set<string>();
  for (const e of meta.environments) {
    const env = ENV_MAP[e];
    env?.suggestedTraits.forEach(t => envTraits.add(t));
  }
  const candidates = TRAITS.filter(t => !meta.traits.includes(t.key));
  const preferred = candidates.filter(t => envTraits.has(t.key));
  const pool = preferred.length ? preferred : candidates;
  const gained = pool.length ? [pool[Math.floor(Math.random() * pool.length)].key] : [];

  // Sometimes lose an existing trait
  const losing = Math.random() < 0.35 && meta.traits.length > 1
    ? [meta.traits[Math.floor(Math.random() * meta.traits.length)]]
    : [];

  // Slider deltas, small jitter
  const sliderDeltas: any = {};
  if (Math.random() < 0.6) sliderDeltas.size = jitter();
  if (Math.random() < 0.5) sliderDeltas.lifespan = jitter();
  if (Math.random() < 0.4) sliderDeltas.intelligence = jitter();
  if (Math.random() < 0.4) sliderDeltas.reproductionRate = jitter();

  const gainedLabels = gained.map(k => TRAIT_MAP[k]?.label).filter(Boolean);
  const lostLabels = losing.map(k => TRAIT_MAP[k]?.label).filter(Boolean);
  const fragments: string[] = [];
  if (gainedLabels.length) fragments.push(`${VERBS_GAIN[Math.floor(Math.random() * VERBS_GAIN.length)]} ${gainedLabels.join(' & ')}`);
  if (lostLabels.length) fragments.push(`${VERBS_LOSS[Math.floor(Math.random() * VERBS_LOSS.length)]} ${lostLabels.join(' & ')}`);
  if (!fragments.length) fragments.push(SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]);
  const description = `The lineage ${fragments.join(' and ')}.`;

  return {
    id,
    era,
    description,
    gainedTraits: gained,
    lostTraits: losing,
    sliderDeltas,
    createdAt: Date.now(),
  };
}

/** Apply a mutation to a meta, returning a new meta. */
export function applyMutation(meta: SpeciesMeta, mut: MutationEvent): SpeciesMeta {
  const next: SpeciesMeta = {
    ...meta,
    traits: [...meta.traits.filter(t => !mut.lostTraits.includes(t)), ...mut.gainedTraits.filter(t => !meta.traits.includes(t))],
  };
  if (mut.sliderDeltas) {
    if (mut.sliderDeltas.size != null) next.size = clamp(meta.size + mut.sliderDeltas.size);
    if (mut.sliderDeltas.lifespan != null) next.lifespan = clamp(meta.lifespan + mut.sliderDeltas.lifespan);
    if (mut.sliderDeltas.intelligence != null) next.intelligence = clamp(meta.intelligence + mut.sliderDeltas.intelligence);
    if (mut.sliderDeltas.reproductionRate != null) next.reproductionRate = clamp(meta.reproductionRate + mut.sliderDeltas.reproductionRate);
  }
  return next;
}

function jitter(): number {
  // Mostly small ±5, occasional ±15
  if (Math.random() < 0.2) return Math.round((Math.random() * 30) - 15);
  return Math.round((Math.random() * 10) - 5);
}

function clamp(n: number) { return Math.max(0, Math.min(100, n)); }

/* ---- Survival simulator ---- */

export interface SimReport {
  /** Survival score 0-100. */
  score: number;
  /** Plain-English verdict. */
  verdict: string;
  /** Notes that contributed positively. */
  pros: string[];
  /** Notes that hurt survival. */
  cons: string[];
  /** Population trend over 10 generations (0-1000). */
  populationTrend: number[];
  /** Estimated apex niche label. */
  niche: string;
}

/** Heuristic ecological survival simulator. Pure function. */
export function simulateSurvival(meta: SpeciesMeta): SimReport {
  const pros: string[] = [];
  const cons: string[] = [];
  let score = 50;

  // Environment fit
  if (meta.environments.length === 0) {
    cons.push('No declared environment — nowhere to live.');
    score -= 20;
  } else {
    let envBonus = 0;
    let envSuggested = new Set<string>();
    let envForbidden = new Set<string>();
    for (const e of meta.environments) {
      const env = ENV_MAP[e];
      if (!env) continue;
      env.suggestedTraits.forEach(t => envSuggested.add(t));
      env.forbiddenTraits?.forEach(t => envForbidden.add(t));
    }
    const matches = meta.traits.filter(t => envSuggested.has(t)).length;
    const conflicts = meta.traits.filter(t => envForbidden.has(t)).length;
    envBonus = matches * 4 - conflicts * 12;
    score += envBonus;
    if (matches) pros.push(`Traits well-suited to environment (${matches} match${matches === 1 ? '' : 'es'}).`);
    if (conflicts) cons.push(`${conflicts} trait${conflicts === 1 ? '' : 's'} conflict with chosen environment.`);
    if (meta.environments.length > 3) {
      pros.push('Generalist — thrives across many biomes.');
      score += 5;
    }
  }

  // Diet vs. behavior coherence
  if (meta.diet === 'carnivore' && meta.behavior.includes('pack')) {
    pros.push('Carnivore + pack: coordinated hunting strategy.'); score += 5;
  }
  if (meta.diet === 'photosynthetic' && meta.size > 75) {
    cons.push('Photosynthetic giants struggle to capture enough light.'); score -= 6;
  }
  if (meta.diet === 'magivore' && meta.environments.includes('alien')) {
    pros.push('Magivore in alien biome — strange but plausible niche.'); score += 4;
  }

  // Slider effects
  if (meta.size > 85) { cons.push('Titanic size demands enormous food supply.'); score -= 6; }
  if (meta.size < 12) { pros.push('Microscopic — hides from predators easily.'); score += 4; }
  if (meta.lifespan < 15 && meta.reproductionRate < 25) { cons.push('Short-lived AND slow to reproduce — extinction-prone.'); score -= 15; }
  if (meta.lifespan > 80 && meta.reproductionRate > 80) { cons.push('Immortal AND prolific — would overrun the world.'); score -= 4; }
  if (meta.intelligence > 70 && meta.behavior.includes('pack')) { pros.push('Cunning pack — adapts faster than rivals.'); score += 6; }
  if (meta.intelligence < 15 && meta.environments.includes('urban')) { cons.push('Low cunning struggles in urban environment.'); score -= 4; }

  // Trait synergies
  if (meta.traits.includes('wings') && meta.traits.includes('keen_sight')) { pros.push('Flight + keen sight — apex aerial niche.'); score += 6; }
  if (meta.traits.includes('venom') && meta.traits.includes('camouflage')) { pros.push('Venomous ambusher.'); score += 5; }
  if (meta.traits.includes('echolocation') && meta.environments.includes('subterranean')) { pros.push('Echolocation in caves — perfect adaptation.'); score += 5; }
  if (meta.traits.includes('photosynthesis') && meta.environments.includes('sky')) { pros.push('Photosynthetic + sky — endless solar exposure.'); score += 5; }

  // Weaknesses
  if (meta.weaknesses.length === 0) {
    cons.push('No declared weaknesses — feels unbalanced. The world finds weaknesses anyway.');
    score -= 5;
  } else {
    const harsh = meta.weaknesses.filter(w => /sun|fire|water|salt|iron/i.test(w)).length;
    if (harsh > 0) { cons.push(`Common weaknesses (${harsh}) are easily exploited.`); score -= harsh * 3; }
  }

  // Relationships
  const predators = meta.relationships.filter(r => r.type === 'predator' || r.type === 'prey').length;
  const allies = meta.relationships.filter(r => r.type === 'symbiosis' || r.type === 'mutualist').length;
  if (allies > 0) { pros.push(`${allies} symbiotic bond${allies === 1 ? '' : 's'} stabilizes the niche.`); score += allies * 3; }
  if (predators > 2) { cons.push('Hunted by many predators.'); score -= 4; }

  // Cap
  score = clamp(score);

  // Verdict
  let verdict: string;
  if (score >= 80) verdict = 'Apex — thrives and reshapes its niche.';
  else if (score >= 60) verdict = 'Stable — sustained, sometimes growing, populations.';
  else if (score >= 40) verdict = 'Vulnerable — persists but fragile to change.';
  else if (score >= 20) verdict = 'Endangered — small isolated populations.';
  else verdict = 'Doomed — likely extinct within recorded history.';

  // Population trend over 10 generations
  const start = 600;
  const populationTrend: number[] = [];
  let pop = start;
  for (let g = 0; g < 10; g++) {
    const growth = (score - 50) / 50;
    const noise = (Math.random() - 0.5) * 0.2;
    pop = Math.max(0, Math.min(1000, pop * (1 + growth * 0.25 + noise)));
    populationTrend.push(Math.round(pop));
  }

  // Niche
  let niche = 'Generalist';
  if (meta.traits.includes('wings')) niche = 'Aerial';
  else if (meta.traits.includes('gills') || meta.traits.includes('fins')) niche = 'Aquatic';
  else if (meta.traits.includes('burrowing')) niche = 'Subterranean';
  else if (meta.behavior.includes('hive')) niche = 'Eusocial';
  else if (meta.size > 75) niche = 'Apex Megafauna';

  return { score, verdict, pros, cons, populationTrend, niche };
}
