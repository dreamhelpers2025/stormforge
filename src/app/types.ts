/** Stormforge type definitions. */

export type ArticleCategory =
  | 'species'
  | 'character'
  | 'place'
  | 'country'
  | 'language'
  | 'item'
  | 'geography'
  | 'material'
  | 'military'
  | 'myth'
  | 'natural_law'
  | 'organization'
  | 'profession'
  | 'religion'
  | 'title'
  | 'spell'
  | 'tradition'
  | 'vehicle'
  | 'conflict'
  | 'deity'
  | 'history'
  | 'magic_system'
  | 'note'
  | 'folder'
  | 'book';

export type WorldTheme =
  | 'tempest'      // default
  | 'ember'        // warm gold/red
  | 'verdant'      // green/forest
  | 'arcane'       // purple/violet
  | 'frost'        // ice blue
  | 'umbra';       // deep shadow

export interface World {
  id: string;
  /** Supabase auth.users.id of the owner. Optional only for pre-sharing local rows
   *  that haven't been backfilled yet. */
  ownerUserId?: string;
  name: string;
  tagline: string;
  description: string;        // plain text or markdown
  coverGradient: string;      // CSS gradient
  themeAccent: WorldTheme;
  bannerEmoji: string;
  goal?: WorldGoal;
  createdAt: number;
  updatedAt: number;
}

export interface GalleryImage {
  id: string;
  dataUrl: string;
  caption?: string;
}

export interface Article {
  id: string;
  worldId: string;
  category: ArticleCategory;
  title: string;
  summary: string;
  contentJson: any;            // Tiptap JSON
  contentText: string;         // flattened for search
  imageDataUrl?: string;       // base64 cover image
  gallery?: GalleryImage[];    // additional images
  tags: string[];
  meta: Record<string, any>;   // category-specific structured data
  pinned: boolean;
  status: 'draft' | 'published';
  createdAt: number;
  updatedAt: number;
}

export type DietType = 'herbivore' | 'carnivore' | 'omnivore' | 'insectivore' | 'photosynthetic' | 'magivore';
export type BehaviorPreset = 'pack' | 'solitary' | 'hive' | 'territorial' | 'migratory' | 'nomadic' | 'symbiotic';
export type CommunicationMode = 'verbal' | 'pheromones' | 'clicks' | 'song' | 'telepathy' | 'bioluminescence' | 'gesture' | 'magic';
export type RelationshipType = 'prey' | 'predator' | 'symbiosis' | 'rival' | 'kin' | 'parasite' | 'mutualist';

export interface SpeciesMeta {
  // Core biology sliders 0-100
  size: number;            // 0=microbe, 100=titan
  lifespan: number;        // 0=hours, 100=immortal
  intelligence: number;    // 0=instinct, 100=transcendent
  reproductionRate: number;// 0=once a century, 100=rapid bloom
  // Environments
  environments: string[];
  diet: DietType;
  behavior: BehaviorPreset[];
  traits: string[];           // trait keys (e.g. 'wings', 'gills')
  weaknesses: string[];
  communication: CommunicationMode[];
  language?: string;          // linked language articleId
  relationships: { speciesId: string; type: RelationshipType; note?: string }[];
  silhouetteSeed?: number;    // for visual randomizer
}

export type PinKind = 'capital' | 'city' | 'town' | 'ruin' | 'landmark' | 'dungeon' | 'battle' | 'lore' | 'roost' | 'shrine' | 'rift' | 'custom';

export interface MapPin {
  id: string;
  x: number;            // 0-100 percent
  y: number;            // 0-100 percent
  label: string;
  kind: PinKind;
  color?: string;       // hex, optional override
  articleId?: string;   // linked article
  note?: string;
}

export interface MapRegion {
  id: string;
  label: string;
  color: string;        // hex, used at low opacity
  /** Polygon points as [x, y] in 0-100 percent coords. */
  points: [number, number][];
  factionArticleId?: string;
  note?: string;
}

export interface MapData {
  id: string;
  worldId: string;
  name: string;
  description: string;
  /** Optional background image (base64 data URL) or gradient string */
  background: string;
  /** If background is an image, declare its aspect ratio. Default 16/9. */
  aspectRatio: number;
  showGrid: boolean;
  pins: MapPin[];
  regions: MapRegion[];
  createdAt: number;
  updatedAt: number;
}

export interface ArticleRevision {
  id: string;            // composite: articleId + ':' + timestamp
  articleId: string;
  worldId: string;
  title: string;
  summary: string;
  contentJson: any;
  meta: Record<string, any>;
  createdAt: number;
}

export interface WorldGoal {
  /** Word-count goal across the world (0 = unset). */
  wordTarget: number;
  /** Milestones with optional check flag. */
  milestones: { id: string; label: string; done: boolean }[];
}

export interface ScratchpadNote {
  id: string;
  worldId: string | null;    // null = global scratchpad
  content: string;
  createdAt: number;
}

export interface AppSettings {
  id: 'singleton';
  theme: 'dark' | 'light';
  activeWorldId: string | null;
  hasSeenTutorial: boolean;
  recentArticleIds: string[];
}

/** Sharing / collaboration */
export type WorldRole = 'owner' | 'editor' | 'viewer';

export interface WorldMember {
  id: string;
  worldId: string;
  /** Null until the invitee signs in with the matching email. */
  userId: string | null;
  email: string;
  role: 'viewer' | 'editor';
  invitedBy: string;
  invitedAt: number;
  /** Null until accepted. */
  acceptedAt: number | null;
}
