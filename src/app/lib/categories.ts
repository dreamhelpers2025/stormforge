import type { ArticleCategory } from '../types';

export interface CategoryDef {
  key: ArticleCategory;
  label: string;
  plural: string;
  icon: string;          // icon name in our Icon component
  description: string;
  accent: string;        // hex
  group: 'living' | 'places' | 'systems' | 'culture' | 'objects' | 'events' | 'writing';
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'species',       label: 'Species',        plural: 'Species',         icon: 'dragon',   description: 'Sapient and non-sapient lifeforms',          accent: '#43C7C7', group: 'living' },
  { key: 'character',     label: 'Character',      plural: 'Characters',      icon: 'user',     description: 'People and personalities',                   accent: '#D8E0E5', group: 'living' },
  { key: 'deity',         label: 'Deity',          plural: 'Deities',         icon: 'flame',    description: 'Gods, spirits, primordial beings',           accent: '#B88A3B', group: 'living' },
  { key: 'place',         label: 'Place',          plural: 'Places',          icon: 'compass',  description: 'Cities, dungeons, landmarks',                accent: '#43C7C7', group: 'places' },
  { key: 'country',       label: 'Country',        plural: 'Countries',       icon: 'crown',    description: 'Nations, kingdoms, polities',                accent: '#B88A3B', group: 'places' },
  { key: 'geography',     label: 'Geography',      plural: 'Geography',       icon: 'map',      description: 'Mountains, oceans, biomes',                  accent: '#1E7C86', group: 'places' },
  { key: 'magic_system',  label: 'Magic System',   plural: 'Magic Systems',   icon: 'rune',     description: 'How the arcane works',                       accent: '#43C7C7', group: 'systems' },
  { key: 'spell',         label: 'Spell',          plural: 'Spells',          icon: 'lightning',description: 'Specific spells, rituals, invocations',      accent: '#43C7C7', group: 'systems' },
  { key: 'natural_law',   label: 'Natural Law',    plural: 'Natural Laws',    icon: 'scroll',   description: 'The physics of your world',                  accent: '#D8E0E5', group: 'systems' },
  { key: 'language',      label: 'Language',       plural: 'Languages',       icon: 'feather',  description: 'Tongues, scripts, dialects',                 accent: '#D8E0E5', group: 'culture' },
  { key: 'religion',      label: 'Religion',       plural: 'Religions',       icon: 'flame',    description: 'Faiths and pantheons',                       accent: '#B88A3B', group: 'culture' },
  { key: 'tradition',     label: 'Tradition',      plural: 'Traditions',      icon: 'scroll',   description: 'Customs, holidays, rites',                   accent: '#B88A3B', group: 'culture' },
  { key: 'myth',          label: 'Myth & Legend',  plural: 'Myths',           icon: 'feather',  description: 'Stories the world tells itself',             accent: '#B88A3B', group: 'culture' },
  { key: 'organization',  label: 'Organization',   plural: 'Organizations',   icon: 'shield',   description: 'Guilds, cults, councils',                    accent: '#D8E0E5', group: 'culture' },
  { key: 'profession',    label: 'Profession',     plural: 'Professions',     icon: 'shield',   description: 'Roles, classes, trades',                     accent: '#D8E0E5', group: 'culture' },
  { key: 'title',         label: 'Title',          plural: 'Titles',          icon: 'crown',    description: 'Honorifics and ranks',                       accent: '#B88A3B', group: 'culture' },
  { key: 'item',          label: 'Item',           plural: 'Items',           icon: 'scroll',   description: 'Artifacts, weapons, tools',                  accent: '#B88A3B', group: 'objects' },
  { key: 'material',      label: 'Material',       plural: 'Materials',       icon: 'rune',     description: 'Substances, ores, fibers',                   accent: '#1E7C86', group: 'objects' },
  { key: 'vehicle',       label: 'Vehicle',        plural: 'Vehicles',        icon: 'compass',  description: 'Ships, mounts, machines',                    accent: '#43C7C7', group: 'objects' },
  { key: 'military',      label: 'Military Unit',  plural: 'Military Units',  icon: 'shield',   description: 'Armies, regiments, war machines',            accent: '#D8E0E5', group: 'objects' },
  { key: 'conflict',      label: 'Conflict',       plural: 'Conflicts',       icon: 'lightning',description: 'Wars, feuds, schisms',                       accent: '#B0413E', group: 'events' },
  { key: 'history',       label: 'History',        plural: 'History',         icon: 'scroll',   description: 'Eras, events, chronicles',                   accent: '#D8E0E5', group: 'events' },
  { key: 'note',          label: 'Note',           plural: 'Notes',           icon: 'feather',  description: 'Loose ideas and writing',                    accent: '#B5C0C9', group: 'writing' },
];

export const CATEGORY_MAP: Record<ArticleCategory, CategoryDef> =
  Object.fromEntries(CATEGORIES.map(c => [c.key, c])) as any;

export const GROUPS: { key: CategoryDef['group']; label: string }[] = [
  { key: 'living',  label: 'Living Beings' },
  { key: 'places',  label: 'Places & Realms' },
  { key: 'systems', label: 'Systems & Laws' },
  { key: 'culture', label: 'Culture' },
  { key: 'objects', label: 'Objects' },
  { key: 'events',  label: 'Events & History' },
  { key: 'writing', label: 'Writing' },
];
