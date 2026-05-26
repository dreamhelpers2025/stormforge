export interface Trait {
  key: string;
  label: string;
  icon: string;        // emoji
  category: 'locomotion' | 'sensory' | 'defense' | 'offense' | 'biology' | 'mind' | 'magical';
  description: string;
  implies?: string[];  // suggests these other traits
  conflicts?: string[];
}

export const TRAITS: Trait[] = [
  { key: 'wings',               label: 'Wings',                 icon: '🪽', category: 'locomotion', description: 'Powered flight.', implies: ['lightweight_bones'] },
  { key: 'gills',               label: 'Gills',                 icon: '🫁', category: 'biology',    description: 'Breathes water.' },
  { key: 'fins',                label: 'Fins',                  icon: '🐟', category: 'locomotion', description: 'Swims efficiently.' },
  { key: 'fur',                 label: 'Fur',                   icon: '🦊', category: 'biology',    description: 'Insulating pelt.' },
  { key: 'scales',              label: 'Scales',                icon: '🐉', category: 'defense',    description: 'Tough overlapping plates.' },
  { key: 'feathers',            label: 'Feathers',              icon: '🪶', category: 'biology',    description: 'Light, insulating, often colorful.' },
  { key: 'chitin',              label: 'Chitin Exoskeleton',    icon: '🦂', category: 'defense',    description: 'External armor.' },
  { key: 'bioluminescence',     label: 'Bioluminescence',       icon: '✨', category: 'biology',    description: 'Produces its own light.' },
  { key: 'venom',               label: 'Venom',                 icon: '🧪', category: 'offense',    description: 'Injects toxin via bite or sting.' },
  { key: 'poison_skin',         label: 'Poisonous Skin',        icon: '☠️', category: 'defense',    description: 'Touch is dangerous.' },
  { key: 'camouflage',          label: 'Camouflage',            icon: '🦎', category: 'defense',    description: 'Blends with surroundings.' },
  { key: 'climbing',            label: 'Climbing',              icon: '🧗', category: 'locomotion', description: 'Scales vertical surfaces.' },
  { key: 'burrowing',           label: 'Burrowing',             icon: '🦫', category: 'locomotion', description: 'Tunnels through soil or stone.' },
  { key: 'speed',               label: 'Great Speed',           icon: '💨', category: 'locomotion', description: 'Exceeds typical motion.' },
  { key: 'pressure_resistance', label: 'Pressure Resistance',   icon: '🪨', category: 'biology',    description: 'Survives crushing depth.' },
  { key: 'cold_resistance',     label: 'Cold Resistance',       icon: '❄️', category: 'biology',    description: 'Endures freezing climates.' },
  { key: 'heat_resistance',     label: 'Heat Resistance',       icon: '🔥', category: 'biology',    description: 'Endures extreme heat.' },
  { key: 'water_storage',       label: 'Water Storage',         icon: '💧', category: 'biology',    description: 'Stores water internally.' },
  { key: 'fat_reserves',        label: 'Fat Reserves',          icon: '🥩', category: 'biology',    description: 'Survives lean seasons.' },
  { key: 'echolocation',        label: 'Echolocation',          icon: '🦇', category: 'sensory',    description: 'Sees with sound.' },
  { key: 'keen_sight',          label: 'Keen Sight',            icon: '👁️', category: 'sensory',    description: 'Sees far and sharp.' },
  { key: 'keen_smell',          label: 'Keen Smell',            icon: '👃', category: 'sensory',    description: 'Tracks by scent.' },
  { key: 'nocturnal',           label: 'Nocturnal',             icon: '🌙', category: 'biology',    description: 'Active at night.' },
  { key: 'pack_instinct',       label: 'Pack Instinct',         icon: '🐺', category: 'mind',       description: 'Coordinates in groups.' },
  { key: 'cunning',             label: 'Cunning',               icon: '🧠', category: 'mind',       description: 'Solves complex problems.' },
  { key: 'telepathy',           label: 'Telepathy',             icon: '🧿', category: 'magical',    description: 'Mind-to-mind contact.' },
  { key: 'fire_breath',         label: 'Fire Breath',           icon: '🐲', category: 'offense',    description: 'Exhales flame.' },
  { key: 'stone_skin',          label: 'Stone Skin',            icon: '🪨', category: 'defense',    description: 'Mineralized hide.' },
  { key: 'phase_shift',         label: 'Phase Shift',           icon: '🌫️', category: 'magical',    description: 'Briefly insubstantial.' },
  { key: 'storm_affinity',      label: 'Storm Affinity',        icon: '⚡', category: 'magical',    description: 'Draws power from tempests.' },
  { key: 'photosynthesis',      label: 'Photosynthesis',        icon: '🌿', category: 'biology',    description: 'Eats sunlight.' },
  { key: 'silicon_body',        label: 'Silicon Body',          icon: '💎', category: 'biology',    description: 'Crystalline biology.' },
  { key: 'no_breath',           label: 'Does Not Breathe',      icon: '🚫', category: 'biology',    description: 'Needs no atmosphere.' },
  { key: 'lightweight_bones',   label: 'Lightweight Bones',     icon: '🦴', category: 'biology',    description: 'Hollow skeletal structure.' },
  { key: 'enhanced_lungs',      label: 'Enhanced Lungs',        icon: '🫁', category: 'biology',    description: 'Thrives in thin air.' },
  { key: 'amphibious',          label: 'Amphibious',            icon: '🐸', category: 'biology',    description: 'Equally at home in water and on land.' },
  { key: 'small_size',          label: 'Small Size',            icon: '🐁', category: 'biology',    description: 'Fits where larger creatures cannot.' },
  { key: 'blindness',           label: 'Blind',                 icon: '⚫', category: 'sensory',    description: 'Cannot see — relies on other senses.' },
];

export const TRAIT_MAP: Record<string, Trait> =
  Object.fromEntries(TRAITS.map(t => [t.key, t]));

export const TRAIT_CATEGORIES: { key: Trait['category']; label: string }[] = [
  { key: 'locomotion', label: 'Locomotion' },
  { key: 'sensory',    label: 'Senses' },
  { key: 'defense',    label: 'Defense' },
  { key: 'offense',    label: 'Offense' },
  { key: 'biology',    label: 'Biology' },
  { key: 'mind',       label: 'Mind' },
  { key: 'magical',    label: 'Magical' },
];

/** Common weaknesses pickable in the species builder. */
export const WEAKNESSES = [
  'Sunlight', 'Iron', 'Salt', 'Fire', 'Cold', 'Silver', 'Running Water',
  'True Name', 'Sacred Ground', 'Mistletoe', 'Specific Song', 'Eye Contact',
  'Drought', 'Vacuum', 'Magical Disruption', 'Birthplace Soil',
  'Verbal Bond', 'Lack of Touch', 'Solitude', 'Crowds',
];
