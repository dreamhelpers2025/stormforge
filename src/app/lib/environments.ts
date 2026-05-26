export interface Environment {
  key: string;
  label: string;
  emoji: string;
  description: string;
  suggestedTraits: string[];   // trait keys
  forbiddenTraits?: string[];
}

export const ENVIRONMENTS: Environment[] = [
  { key: 'ocean',       label: 'Ocean',         emoji: '🌊', description: 'Deep saltwater seas',                     suggestedTraits: ['gills', 'bioluminescence', 'pressure_resistance', 'fins'], forbiddenTraits: ['wings'] },
  { key: 'deep_sea',    label: 'Deep Sea',      emoji: '🦑', description: 'Lightless abyssal trenches',              suggestedTraits: ['bioluminescence', 'pressure_resistance', 'echolocation'], },
  { key: 'river',       label: 'River & Lake',  emoji: '💧', description: 'Freshwater systems',                      suggestedTraits: ['gills', 'fins'] },
  { key: 'desert',      label: 'Desert',        emoji: '🏜️', description: 'Hot, arid wastes',                        suggestedTraits: ['heat_resistance', 'burrowing', 'water_storage', 'nocturnal'] },
  { key: 'tundra',      label: 'Tundra',        emoji: '🧊', description: 'Frozen plains and ice',                   suggestedTraits: ['fur', 'cold_resistance', 'fat_reserves'] },
  { key: 'forest',      label: 'Forest',        emoji: '🌲', description: 'Temperate woodlands',                     suggestedTraits: ['camouflage', 'climbing', 'keen_smell'] },
  { key: 'jungle',      label: 'Jungle',        emoji: '🌴', description: 'Tropical rainforest',                     suggestedTraits: ['climbing', 'venom', 'camouflage', 'bioluminescence'] },
  { key: 'mountain',    label: 'Mountain',      emoji: '⛰️', description: 'High altitude crags',                     suggestedTraits: ['climbing', 'cold_resistance', 'enhanced_lungs'] },
  { key: 'swamp',       label: 'Swamp',         emoji: '🪷', description: 'Marshes and bogs',                        suggestedTraits: ['camouflage', 'venom', 'amphibious'] },
  { key: 'plains',      label: 'Plains',        emoji: '🌾', description: 'Open grasslands',                         suggestedTraits: ['speed', 'pack_instinct', 'keen_sight'] },
  { key: 'subterranean',label: 'Subterranean',  emoji: '🕳️', description: 'Caves and tunnels',                       suggestedTraits: ['burrowing', 'echolocation', 'bioluminescence', 'blindness'] },
  { key: 'volcanic',    label: 'Volcanic',      emoji: '🌋', description: 'Magma and ash',                            suggestedTraits: ['heat_resistance', 'fire_breath', 'stone_skin'] },
  { key: 'sky',         label: 'Sky',           emoji: '☁️', description: 'Aerial realm and storm clouds',           suggestedTraits: ['wings', 'lightweight_bones', 'keen_sight', 'storm_affinity'] },
  { key: 'astral',      label: 'Astral / Void', emoji: '🌌', description: 'Spaces between worlds',                   suggestedTraits: ['phase_shift', 'telepathy', 'no_breath'] },
  { key: 'alien',       label: 'Alien',         emoji: '👽', description: 'Wholly unearthly biome',                  suggestedTraits: ['photosynthesis', 'silicon_body', 'telepathy'] },
  { key: 'urban',       label: 'Urban',         emoji: '🏙️', description: 'Cities and settlements',                  suggestedTraits: ['cunning', 'small_size'] },
];

export const ENV_MAP: Record<string, Environment> =
  Object.fromEntries(ENVIRONMENTS.map(e => [e.key, e]));
