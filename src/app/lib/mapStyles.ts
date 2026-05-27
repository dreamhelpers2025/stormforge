import type { MapData, MapStyle } from '../types';

/**
 * Procedural map background presets. Each entry returns a CSS `background`
 * value composed of inline SVG noise + gradients — no external imagery, so
 * the bundle stays small and the look survives any aspect ratio.
 *
 * The SVG is URL-encoded inline rather than base64 — that lets the gzip
 * compressor do its job and keeps the source readable.
 */

export interface MapStylePreset {
  key: MapStyle;
  label: string;
  /** Tone of the labels / decorative SVG strokes that overlay this style. */
  inkColor: string;
  /** Hint for the compass rose to pick contrasting strokes. */
  isLight: boolean;
  /** CSS `background` value. */
  background: string;
}

/** URL-encode an SVG string so it's safe to embed in a CSS `url(...)`. */
function encodeSvg(svg: string): string {
  return svg
    .replace(/\n/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/"/g, "'")
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/#/g, '%23');
}

/** Reusable fractal-noise filter. */
function noiseSvg(baseFreq: number, opacity: number, w = 600, h = 600): string {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='${baseFreq}' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${opacity} 0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(%23n)'/>
    </svg>
  `;
  return `url("data:image/svg+xml;utf8,${encodeSvg(svg)}")`;
}

/** Parchment fiber texture — diagonal hatching. */
function fiberSvg(strokeColor: string, opacity: number): string {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80' width='80' height='80'>
      <g stroke='${strokeColor}' stroke-opacity='${opacity}' stroke-width='0.4' fill='none'>
        <path d='M0 0 L80 80 M-20 60 L60 -20 M20 100 L100 20'/>
      </g>
    </svg>
  `;
  return `url("data:image/svg+xml;utf8,${encodeSvg(svg)}")`;
}

export const MAP_STYLE_PRESETS: MapStylePreset[] = [
  {
    key: 'parchment',
    label: 'Parchment',
    inkColor: '#3a2410',
    isLight: true,
    background: [
      // Aged paper noise speckles
      noiseSvg(0.9, 0.22),
      // Subtle warm vignette
      'radial-gradient(ellipse at center, transparent 40%, rgba(120,70,20,0.18) 100%)',
      // Diagonal fibers
      fiberSvg('#7a5a2a', 0.12),
      // Base warm cream
      'linear-gradient(135deg, #f5e2bd 0%, #e6cf9a 50%, #d9bd80 100%)',
    ].join(', '),
  },
  {
    key: 'vellum',
    label: 'Vellum',
    inkColor: '#2a1a0c',
    isLight: true,
    background: [
      noiseSvg(0.65, 0.18),
      'radial-gradient(ellipse at center, transparent 30%, rgba(80,50,10,0.28) 100%)',
      fiberSvg('#5a3a14', 0.08),
      'linear-gradient(135deg, #ede0c0 0%, #d8c290 60%, #b89860 100%)',
    ].join(', '),
  },
  {
    key: 'midnight',
    label: 'Midnight',
    inkColor: '#e9f6f7',
    isLight: false,
    background: [
      noiseSvg(0.85, 0.10),
      'radial-gradient(ellipse at 30% 10%, rgba(67,199,199,0.18) 0%, transparent 60%)',
      'radial-gradient(ellipse at 80% 90%, rgba(184,138,59,0.12) 0%, transparent 55%)',
      'linear-gradient(135deg, #0b1e2d 0%, #0a1825 50%, #06121b 100%)',
    ].join(', '),
  },
  {
    key: 'sketch',
    label: 'Sketch',
    inkColor: '#1a1a1a',
    isLight: true,
    background: [
      // Light grid
      `url("data:image/svg+xml;utf8,${encodeSvg(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'>
          <g stroke='#9a9080' stroke-opacity='0.45' stroke-width='0.4' fill='none'>
            <path d='M0 0 H40 M0 0 V40'/>
          </g>
        </svg>
      `)}")`,
      noiseSvg(0.4, 0.05),
      'linear-gradient(135deg, #f4f1ea 0%, #ece6d6 100%)',
    ].join(', '),
  },
];

/** Quick lookup by key. */
const STYLE_BY_KEY: Record<string, MapStylePreset> = Object.fromEntries(
  MAP_STYLE_PRESETS.map(p => [p.key, p]),
);

/**
 * Resolve the actual CSS background to render for a given map, honoring
 * backward compatibility:
 *   - style === 'image'      → use `background` (a data: URL)
 *   - style === 'custom'     → use `background` (a CSS gradient string)
 *   - style is a preset key  → use the preset
 *   - style is undefined     → use `background` as-is (legacy maps)
 */
export function getEffectiveBackground(map: MapData): string {
  const style = map.style;
  if (style && style !== 'image' && style !== 'custom') {
    const preset = STYLE_BY_KEY[style];
    if (preset) return preset.background;
  }
  // Image or custom or legacy: just use the stored background string.
  if (map.background?.startsWith('data:')) {
    return `url(${map.background}) center/cover`;
  }
  return map.background || '';
}

/** Lookup helper for ink/compass color from a map. */
export function getInkColor(map: MapData): string {
  const style = map.style;
  if (style && STYLE_BY_KEY[style]) return STYLE_BY_KEY[style].inkColor;
  // Reasonable default for legacy + custom maps (dark backgrounds dominate).
  return '#e9f6f7';
}

export function isLightStyle(map: MapData): boolean {
  const style = map.style;
  if (style && STYLE_BY_KEY[style]) return STYLE_BY_KEY[style].isLight;
  return false;
}
