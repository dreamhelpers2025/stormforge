/**
 * Stamp registry — decorative fantasy-map icons.
 *
 * Each stamp is rendered into a 100x100 viewBox, monochrome, so it can be
 * tinted at runtime via `fill`. No external assets — all paths are inline.
 *
 * Add new stamps freely; the `key` is what gets stored on disk.
 */

export type StampCategory = 'terrain' | 'forest' | 'water' | 'settlement' | 'magic' | 'threat' | 'decor';

export interface StampDef {
  key: string;
  label: string;
  category: StampCategory;
  /** Inner SVG markup. Use `currentColor` for fill / stroke so tinting works. */
  svg: string;
  /** Default tint hint when first placed. */
  defaultColor: string;
}

/* Helper consts — kept terse so the file scans as a sheet of glyphs. */
const TERRAIN = '#4a3318';
const FOREST = '#1f4423';
const WATER = '#1b4a6e';
const STONE = '#3a3a3a';
const MAGIC = '#5c2d8a';
const FIRE = '#a4380a';
const PARCHMENT = '#6b4a1d';

export const STAMPS: StampDef[] = [
  // ───── Terrain ─────
  {
    key: 'mountain',
    label: 'Mountain',
    category: 'terrain',
    defaultColor: TERRAIN,
    svg: `
      <path fill='currentColor' d='M10 80 L40 30 L55 55 L70 40 L90 80 Z'/>
      <path fill='#ffffff' fill-opacity='0.6' d='M40 30 L46 45 L34 45 Z'/>
      <path fill='#ffffff' fill-opacity='0.45' d='M70 40 L75 55 L65 55 Z'/>
    `,
  },
  {
    key: 'mountain_range',
    label: 'Mountain range',
    category: 'terrain',
    defaultColor: TERRAIN,
    svg: `
      <path fill='currentColor' d='M0 85 L18 50 L28 65 L45 35 L60 60 L72 45 L90 70 L100 60 L100 100 L0 100 Z'/>
      <path fill='#ffffff' fill-opacity='0.5' d='M18 50 L22 60 L14 60 Z'/>
      <path fill='#ffffff' fill-opacity='0.5' d='M45 35 L50 50 L40 50 Z'/>
      <path fill='#ffffff' fill-opacity='0.4' d='M72 45 L77 60 L67 60 Z'/>
    `,
  },
  {
    key: 'hill',
    label: 'Hill',
    category: 'terrain',
    defaultColor: '#5a4628',
    svg: `
      <path fill='currentColor' d='M10 75 Q35 50 50 65 Q65 50 90 75 Q70 80 50 78 Q30 80 10 75 Z'/>
      <path stroke='#ffffff' stroke-opacity='0.4' stroke-width='1.4' fill='none' d='M22 70 Q30 65 38 70 M52 70 Q60 64 68 70'/>
    `,
  },
  {
    key: 'volcano',
    label: 'Volcano',
    category: 'terrain',
    defaultColor: TERRAIN,
    svg: `
      <path fill='currentColor' d='M14 85 L36 28 L48 35 L62 28 L86 85 Z'/>
      <path fill='${FIRE}' d='M36 28 Q42 22 48 35 Q54 22 62 28 L58 14 Q52 22 50 18 Q46 24 40 14 Z'/>
      <circle cx='30' cy='52' r='2.5' fill='${FIRE}'/>
      <circle cx='70' cy='62' r='2' fill='${FIRE}'/>
    `,
  },
  {
    key: 'cliff',
    label: 'Cliff',
    category: 'terrain',
    defaultColor: STONE,
    svg: `
      <path fill='currentColor' d='M5 85 L5 40 L25 32 L35 50 L55 40 L65 55 L85 45 L95 85 Z'/>
      <path stroke='#ffffff' stroke-opacity='0.35' stroke-width='1.2' fill='none' d='M15 50 L22 55 M40 60 L48 64 M68 60 L78 65'/>
    `,
  },

  // ───── Forest ─────
  {
    key: 'tree',
    label: 'Tree',
    category: 'forest',
    defaultColor: FOREST,
    svg: `
      <path fill='currentColor' d='M50 12 L30 50 L40 50 L24 78 L42 78 L42 92 L58 92 L58 78 L76 78 L60 50 L70 50 Z'/>
    `,
  },
  {
    key: 'forest',
    label: 'Forest',
    category: 'forest',
    defaultColor: FOREST,
    svg: `
      <g fill='currentColor'>
        <path d='M20 30 L10 55 L30 55 Z'/>
        <path d='M45 22 L33 52 L57 52 Z'/>
        <path d='M70 35 L60 60 L80 60 Z'/>
        <path d='M30 50 L18 78 L42 78 Z'/>
        <path d='M58 55 L46 82 L70 82 Z'/>
        <path d='M82 55 L72 80 L92 80 Z'/>
      </g>
    `,
  },
  {
    key: 'pine',
    label: 'Pine',
    category: 'forest',
    defaultColor: '#1d3a2a',
    svg: `
      <path fill='currentColor' d='M50 8 L38 28 L46 28 L34 48 L44 48 L30 68 L46 68 L46 90 L54 90 L54 68 L70 68 L56 48 L66 48 L54 28 L62 28 Z'/>
    `,
  },
  {
    key: 'dead_tree',
    label: 'Dead tree',
    category: 'forest',
    defaultColor: '#3a2614',
    svg: `
      <path stroke='currentColor' stroke-width='4' stroke-linecap='round' fill='none' d='M50 92 L50 24'/>
      <path stroke='currentColor' stroke-width='2.5' stroke-linecap='round' fill='none' d='M50 50 L28 30 M50 40 L72 22 M50 60 L26 56 M50 32 L62 18 M50 70 L70 60'/>
    `,
  },
  {
    key: 'oasis',
    label: 'Oasis',
    category: 'forest',
    defaultColor: '#2c6a3a',
    svg: `
      <ellipse cx='50' cy='80' rx='30' ry='8' fill='${WATER}' fill-opacity='0.6'/>
      <path stroke='currentColor' stroke-width='3' stroke-linecap='round' fill='none' d='M35 78 L30 30 M40 78 L50 32 M55 78 L70 34 M50 78 L55 26'/>
      <g fill='currentColor'>
        <path d='M30 30 Q18 26 14 18 Q22 22 30 30'/>
        <path d='M30 30 Q22 38 12 42 Q22 32 30 30'/>
        <path d='M50 32 Q60 24 70 22 Q60 30 50 32'/>
        <path d='M70 34 Q82 30 88 22 Q80 32 70 34'/>
        <path d='M55 26 Q58 14 66 12 Q60 22 55 26'/>
      </g>
    `,
  },

  // ───── Water ─────
  {
    key: 'waves',
    label: 'Waves',
    category: 'water',
    defaultColor: WATER,
    svg: `
      <g stroke='currentColor' stroke-width='3' stroke-linecap='round' fill='none'>
        <path d='M10 35 Q25 20 40 35 T70 35 T100 35'/>
        <path d='M10 55 Q25 40 40 55 T70 55 T100 55'/>
        <path d='M10 75 Q25 60 40 75 T70 75 T100 75'/>
      </g>
    `,
  },
  {
    key: 'island',
    label: 'Island',
    category: 'water',
    defaultColor: TERRAIN,
    svg: `
      <ellipse cx='50' cy='65' rx='38' ry='14' fill='currentColor'/>
      <path fill='${FOREST}' d='M40 60 L34 70 L46 70 Z M52 55 L46 70 L58 70 Z M64 60 L58 70 L70 70 Z'/>
      <g stroke='${WATER}' stroke-width='1.5' fill='none' stroke-opacity='0.8'>
        <path d='M8 82 Q18 78 26 82 T44 82 M56 86 Q66 82 74 86 T92 86'/>
      </g>
    `,
  },
  {
    key: 'ship',
    label: 'Ship',
    category: 'water',
    defaultColor: '#3a2614',
    svg: `
      <path fill='currentColor' d='M10 70 L90 70 L78 88 L22 88 Z'/>
      <path stroke='currentColor' stroke-width='2.5' fill='none' d='M50 70 L50 16'/>
      <path fill='#e9dcb2' d='M50 18 L78 50 L50 50 Z M50 25 L26 55 L50 55 Z'/>
      <path stroke='${WATER}' stroke-width='1.5' fill='none' stroke-opacity='0.7' d='M6 92 Q18 88 30 92 M40 94 Q52 90 64 94 M70 92 Q82 88 94 92'/>
    `,
  },
  {
    key: 'anchor',
    label: 'Anchor',
    category: 'water',
    defaultColor: STONE,
    svg: `
      <circle cx='50' cy='18' r='6' stroke='currentColor' stroke-width='3' fill='none'/>
      <path stroke='currentColor' stroke-width='4' stroke-linecap='round' fill='none' d='M50 24 L50 82 M30 50 L70 50 M18 70 Q34 90 50 84 Q66 90 82 70'/>
    `,
  },
  {
    key: 'lighthouse',
    label: 'Lighthouse',
    category: 'water',
    defaultColor: '#a83a2a',
    svg: `
      <path fill='currentColor' d='M40 90 L42 38 L58 38 L60 90 Z'/>
      <rect x='38' y='30' width='24' height='8' fill='currentColor'/>
      <rect x='42' y='18' width='16' height='12' fill='#ffeb8a'/>
      <path fill='currentColor' d='M40 18 L60 18 L55 8 L45 8 Z'/>
      <g stroke='#ffeb8a' stroke-width='2' stroke-linecap='round' opacity='0.8'>
        <path d='M30 18 L18 12 M70 18 L82 12 M30 26 L14 26 M70 26 L86 26'/>
      </g>
    `,
  },
  {
    key: 'river_bend',
    label: 'River bend',
    category: 'water',
    defaultColor: WATER,
    svg: `
      <path stroke='currentColor' stroke-width='6' stroke-linecap='round' fill='none' d='M8 12 Q40 30 38 55 Q36 80 92 92'/>
      <path stroke='#ffffff' stroke-width='1.4' stroke-linecap='round' fill='none' stroke-opacity='0.45' d='M12 16 Q40 32 38 55 Q36 78 90 88'/>
    `,
  },

  // ───── Settlement ─────
  {
    key: 'castle',
    label: 'Castle',
    category: 'settlement',
    defaultColor: STONE,
    svg: `
      <path fill='currentColor' d='M10 88 L10 50 L20 50 L20 40 L28 40 L28 50 L42 50 L42 30 L58 30 L58 50 L72 50 L72 40 L80 40 L80 50 L90 50 L90 88 Z'/>
      <rect x='46' y='60' width='8' height='28' fill='#1a1a1a' fill-opacity='0.5'/>
      <rect x='22' y='62' width='6' height='10' fill='#1a1a1a' fill-opacity='0.5'/>
      <rect x='72' y='62' width='6' height='10' fill='#1a1a1a' fill-opacity='0.5'/>
      <path fill='#a83a2a' d='M42 30 L50 14 L58 30 Z'/>
    `,
  },
  {
    key: 'tower',
    label: 'Tower',
    category: 'settlement',
    defaultColor: STONE,
    svg: `
      <path fill='currentColor' d='M34 88 L34 40 L30 40 L30 32 L36 32 L36 24 L42 24 L42 20 L58 20 L58 24 L64 24 L64 32 L70 32 L70 40 L66 40 L66 88 Z'/>
      <rect x='45' y='62' width='10' height='26' fill='#1a1a1a' fill-opacity='0.5'/>
      <rect x='40' y='42' width='6' height='10' fill='#1a1a1a' fill-opacity='0.5'/>
      <rect x='54' y='42' width='6' height='10' fill='#1a1a1a' fill-opacity='0.5'/>
      <path fill='#43c7c7' d='M50 4 L52 20 L48 20 Z'/>
    `,
  },
  {
    key: 'village',
    label: 'Village',
    category: 'settlement',
    defaultColor: '#6b4628',
    svg: `
      <g fill='currentColor'>
        <path d='M14 80 L14 60 L24 50 L34 60 L34 80 Z'/>
        <path d='M42 82 L42 56 L54 44 L66 56 L66 82 Z'/>
        <path d='M70 80 L70 64 L78 56 L86 64 L86 80 Z'/>
      </g>
      <g fill='#a83a2a'>
        <path d='M12 62 L24 48 L36 62 Z'/>
        <path d='M40 58 L54 42 L68 58 Z'/>
        <path d='M68 66 L78 54 L88 66 Z'/>
      </g>
      <rect x='21' y='68' width='6' height='12' fill='#1a1a1a' fill-opacity='0.4'/>
      <rect x='50' y='66' width='8' height='16' fill='#1a1a1a' fill-opacity='0.4'/>
    `,
  },
  {
    key: 'ruin',
    label: 'Ruin',
    category: 'settlement',
    defaultColor: '#5a5048',
    svg: `
      <path fill='currentColor' d='M14 88 L14 60 L22 60 L22 50 L30 50 L30 70 L40 70 L40 40 L48 40 L48 60 L60 60 L60 30 L68 30 L68 55 L80 55 L80 88 Z'/>
      <path fill='#1a1a1a' fill-opacity='0.4' d='M22 72 L30 72 L30 78 L22 78 Z M48 76 L58 76 L58 84 L48 84 Z'/>
    `,
  },
  {
    key: 'bridge',
    label: 'Bridge',
    category: 'settlement',
    defaultColor: '#7a5a36',
    svg: `
      <path fill='currentColor' d='M8 68 L92 68 L92 76 L8 76 Z'/>
      <path stroke='currentColor' stroke-width='3' fill='none' d='M14 70 Q50 30 86 70'/>
      <path stroke='currentColor' stroke-width='2.5' fill='none' d='M20 76 L20 88 M40 76 L40 88 M60 76 L60 88 M80 76 L80 88'/>
      <path stroke='${WATER}' stroke-width='2' fill='none' stroke-opacity='0.7' d='M10 92 Q26 88 42 92 M54 92 Q70 88 90 92'/>
    `,
  },
  {
    key: 'mill',
    label: 'Mill',
    category: 'settlement',
    defaultColor: '#7a5a36',
    svg: `
      <rect x='30' y='44' width='30' height='44' fill='currentColor'/>
      <path fill='${PARCHMENT}' d='M30 44 L45 30 L60 44 Z'/>
      <g stroke='#3a2410' stroke-width='3' stroke-linecap='round'>
        <path d='M45 50 L22 30'/>
        <path d='M45 50 L68 30'/>
        <path d='M45 50 L22 72'/>
        <path d='M45 50 L68 72'/>
      </g>
      <circle cx='45' cy='50' r='3' fill='#3a2410'/>
      <rect x='38' y='62' width='14' height='18' fill='#1a1a1a' fill-opacity='0.45'/>
    `,
  },

  // ───── Magic ─────
  {
    key: 'shrine',
    label: 'Shrine',
    category: 'magic',
    defaultColor: '#a83a2a',
    svg: `
      <path fill='currentColor' d='M16 28 L84 28 L86 36 L14 36 Z'/>
      <rect x='26' y='36' width='8' height='44' fill='currentColor'/>
      <rect x='66' y='36' width='8' height='44' fill='currentColor'/>
      <path fill='currentColor' d='M22 80 L78 80 L78 88 L22 88 Z'/>
      <rect x='44' y='44' width='12' height='36' fill='currentColor'/>
      <path stroke='currentColor' stroke-width='3' fill='none' d='M10 30 L90 30'/>
    `,
  },
  {
    key: 'monolith',
    label: 'Monolith',
    category: 'magic',
    defaultColor: STONE,
    svg: `
      <path fill='currentColor' d='M42 88 L40 28 L46 16 L54 16 L60 28 L58 88 Z'/>
      <path stroke='${MAGIC}' stroke-width='1.5' fill='none' stroke-opacity='0.9' d='M46 30 L54 30 M44 40 L56 40 M46 50 L54 50 M44 60 L56 60'/>
    `,
  },
  {
    key: 'rune_circle',
    label: 'Rune circle',
    category: 'magic',
    defaultColor: MAGIC,
    svg: `
      <circle cx='50' cy='50' r='38' stroke='currentColor' stroke-width='2.5' fill='none'/>
      <circle cx='50' cy='50' r='28' stroke='currentColor' stroke-width='1.8' fill='none' stroke-opacity='0.75'/>
      <g stroke='currentColor' stroke-width='2' fill='none' stroke-linecap='round'>
        <path d='M50 18 L50 30 M50 70 L50 82 M18 50 L30 50 M70 50 L82 50'/>
        <path d='M28 28 L36 36 M64 64 L72 72 M28 72 L36 64 M64 36 L72 28'/>
      </g>
      <path fill='currentColor' d='M50 42 L58 58 L42 58 Z'/>
    `,
  },
  {
    key: 'statue',
    label: 'Statue',
    category: 'magic',
    defaultColor: '#9a9088',
    svg: `
      <rect x='30' y='80' width='40' height='10' fill='currentColor'/>
      <circle cx='50' cy='26' r='8' fill='currentColor'/>
      <path fill='currentColor' d='M40 34 L60 34 L66 60 L60 80 L40 80 L34 60 Z'/>
      <path stroke='currentColor' stroke-width='5' stroke-linecap='round' fill='none' d='M30 50 L40 46 M70 50 L60 46'/>
    `,
  },
  {
    key: 'arcane_eye',
    label: 'Arcane eye',
    category: 'magic',
    defaultColor: MAGIC,
    svg: `
      <path fill='currentColor' d='M8 50 Q50 12 92 50 Q50 88 8 50 Z'/>
      <circle cx='50' cy='50' r='16' fill='#ffffff'/>
      <circle cx='50' cy='50' r='10' fill='currentColor'/>
      <circle cx='53' cy='47' r='3' fill='#ffffff'/>
    `,
  },

  // ───── Threat ─────
  {
    key: 'dragon',
    label: 'Dragon roost',
    category: 'threat',
    defaultColor: '#4a1010',
    svg: `
      <path fill='currentColor' d='M10 70 Q24 50 38 58 L42 50 Q48 36 60 38 L74 28 L72 42 L86 38 L78 52 L92 56 L80 64 L84 78 L70 72 L60 84 Q50 80 44 74 L30 82 L32 70 L18 78 Z'/>
      <path stroke='currentColor' stroke-width='2' fill='none' d='M44 74 L20 88'/>
      <circle cx='66' cy='44' r='2.5' fill='${FIRE}'/>
    `,
  },
  {
    key: 'skull',
    label: 'Skull marker',
    category: 'threat',
    defaultColor: '#d6cfb8',
    svg: `
      <path fill='currentColor' d='M20 42 Q20 16 50 16 Q80 16 80 42 L80 60 Q80 72 70 72 L66 84 L34 84 L30 72 Q20 72 20 60 Z'/>
      <circle cx='36' cy='48' r='8' fill='#1a1a1a'/>
      <circle cx='64' cy='48' r='8' fill='#1a1a1a'/>
      <path fill='#1a1a1a' d='M46 62 L50 56 L54 62 L52 70 L48 70 Z'/>
      <path stroke='#1a1a1a' stroke-width='1.5' fill='none' d='M38 78 L38 84 M46 78 L46 84 M54 78 L54 84 M62 78 L62 84'/>
    `,
  },
  {
    key: 'dungeon',
    label: 'Dungeon',
    category: 'threat',
    defaultColor: '#1a1a1a',
    svg: `
      <path fill='${STONE}' d='M14 88 L14 50 Q14 30 50 30 Q86 30 86 50 L86 88 Z'/>
      <path fill='currentColor' d='M32 88 L32 60 Q32 46 50 46 Q68 46 68 60 L68 88 Z'/>
      <g stroke='${PARCHMENT}' stroke-width='1.5' fill='none'>
        <path d='M14 60 L86 60 M14 72 L86 72 M30 50 L30 30 M50 50 L50 30 M70 50 L70 30'/>
      </g>
    `,
  },

  // ───── Decor ─────
  {
    key: 'banner',
    label: 'Banner',
    category: 'decor',
    defaultColor: '#a83a2a',
    svg: `
      <path stroke='#3a2410' stroke-width='3' stroke-linecap='round' fill='none' d='M30 12 L30 92'/>
      <path fill='currentColor' d='M30 16 L74 16 L66 32 L74 48 L30 48 Z'/>
      <path fill='#ffffff' fill-opacity='0.4' d='M40 22 L46 28 L40 34 L40 30 L36 30 L36 26 L40 26 Z'/>
    `,
  },
  {
    key: 'crossroads',
    label: 'Crossroads',
    category: 'decor',
    defaultColor: PARCHMENT,
    svg: `
      <path stroke='currentColor' stroke-width='6' stroke-linecap='round' fill='none' d='M8 50 L92 50 M50 8 L50 92'/>
      <path stroke='currentColor' stroke-width='3' stroke-linecap='round' fill='none' stroke-dasharray='3 4' d='M8 50 L92 50 M50 8 L50 92'/>
      <circle cx='50' cy='50' r='5' fill='currentColor'/>
    `,
  },
  {
    key: 'sun',
    label: 'Sun symbol',
    category: 'decor',
    defaultColor: '#d49a2a',
    svg: `
      <circle cx='50' cy='50' r='18' fill='currentColor'/>
      <g stroke='currentColor' stroke-width='4' stroke-linecap='round'>
        <path d='M50 8 L50 22 M50 78 L50 92 M8 50 L22 50 M78 50 L92 50'/>
        <path d='M20 20 L30 30 M70 70 L80 80 M20 80 L30 70 M70 30 L80 20'/>
      </g>
    `,
  },
  {
    key: 'moon',
    label: 'Moon symbol',
    category: 'decor',
    defaultColor: '#b3c3d6',
    svg: `
      <path fill='currentColor' d='M62 14 Q34 14 26 50 Q34 86 62 86 Q42 76 42 50 Q42 24 62 14 Z'/>
      <circle cx='80' cy='30' r='2' fill='currentColor'/>
      <circle cx='78' cy='60' r='1.5' fill='currentColor'/>
      <circle cx='84' cy='44' r='1.2' fill='currentColor'/>
    `,
  },
];

export const STAMPS_BY_CATEGORY: Record<StampCategory, StampDef[]> = STAMPS.reduce((acc, s) => {
  (acc[s.category] ||= []).push(s);
  return acc;
}, {} as Record<StampCategory, StampDef[]>);

export const CATEGORY_LABELS: Record<StampCategory, string> = {
  terrain: 'Terrain',
  forest: 'Forest',
  water: 'Water',
  settlement: 'Settlement',
  magic: 'Magic',
  threat: 'Threat',
  decor: 'Decor',
};

export function getStamp(key: string): StampDef | undefined {
  return STAMPS.find(s => s.key === key);
}
