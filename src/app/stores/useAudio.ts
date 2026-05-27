import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AudioTrack } from '../types';

export const EMPTY_TRACKS: readonly AudioTrack[] = Object.freeze([]) as any;

/** Hard caps. Mirror the bucket file_size_limit and 0004 trigger in Supabase. */
export const MAX_TRACKS_PER_WORLD = 4;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** How long a signed URL stays valid (seconds). Refresh well before expiry. */
const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour
/** Refresh signed URL this many ms before its expiry. */
const SIGNED_URL_REFRESH_GUARD_MS = 5 * 60 * 1000; // 5 min

function fromRow(r: any): AudioTrack {
  return {
    id: r.id,
    worldId: r.world_id,
    userId: r.user_id,
    name: r.name,
    storagePath: r.storage_path,
    durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
    source: r.source ?? null,
    attribution: r.attribution ?? null,
    isDefault: !!r.is_default,
    createdAt: Number(r.created_at) || 0,
    updatedAt: Number(r.updated_at) || 0,
  };
}

/** Strip filesystem-unfriendly characters but keep extension. */
function safeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'audio';
}

interface SignedURL {
  url: string;
  expiresAt: number; // epoch ms
}

interface AudioStore {
  byWorld: Record<string, AudioTrack[]>;
  loadedWorlds: Record<string, boolean>;

  /** Cached signed URLs by storagePath. */
  signedUrls: Record<string, SignedURL>;

  /** Playback state. */
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;     // 0..1
  muted: boolean;
  /** The single shared HTMLAudioElement. Created lazily. */
  el: HTMLAudioElement | null;

  /** Bottom bar visibility — user can collapse. */
  barVisible: boolean;

  loadWorld: (worldId: string) => Promise<void>;
  uploadTrack: (
    worldId: string,
    file: File,
    opts?: { name?: string; source?: string; attribution?: string }
  ) => Promise<AudioTrack>;
  renameTrack: (trackId: string, name: string) => Promise<void>;
  updateAttribution: (trackId: string, attribution: string) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;

  /** Get (or mint) a signed URL for a storage path. */
  getSignedUrl: (storagePath: string) => Promise<string>;

  /** Play a track by id. Auto-plays. */
  play: (trackId: string) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => void;
  next: (worldId: string) => Promise<void>;
  prev: (worldId: string) => Promise<void>;

  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setBarVisible: (v: boolean) => void;
}

export const useAudio = create<AudioStore>((set, get) => {
  // Restore last volume/muted from localStorage.
  let initVolume = 0.6;
  let initMuted = false;
  try {
    const raw = localStorage.getItem('stormforge.audio.prefs');
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.volume === 'number') initVolume = p.volume;
      if (typeof p.muted === 'boolean') initMuted = p.muted;
    }
  } catch {}

  function savePrefs() {
    try {
      const s = get();
      localStorage.setItem(
        'stormforge.audio.prefs',
        JSON.stringify({ volume: s.volume, muted: s.muted }),
      );
    } catch {}
  }

  function ensureEl(): HTMLAudioElement {
    let el = get().el;
    if (el) return el;
    el = new Audio();
    el.preload = 'metadata';
    el.loop = false; // we advance via 'ended'
    el.volume = get().volume;
    el.muted = get().muted;

    el.addEventListener('play', () => set({ isPlaying: true }));
    el.addEventListener('pause', () => {
      if (!el!.ended) set({ isPlaying: false });
    });
    el.addEventListener('ended', () => {
      // Auto-advance within the same world if we know one.
      const cur = get().currentTrackId;
      if (!cur) { set({ isPlaying: false }); return; }
      // Find world by track id.
      let worldId: string | null = null;
      for (const wid in get().byWorld) {
        if ((get().byWorld[wid] ?? []).some(t => t.id === cur)) {
          worldId = wid; break;
        }
      }
      if (worldId) {
        get().next(worldId).catch(() => set({ isPlaying: false }));
      } else {
        set({ isPlaying: false });
      }
    });
    el.addEventListener('error', () => {
      console.warn('[useAudio] playback error', el!.error);
      set({ isPlaying: false });
    });

    set({ el });
    return el;
  }

  return {
    byWorld: {},
    loadedWorlds: {},
    signedUrls: {},
    currentTrackId: null,
    isPlaying: false,
    volume: initVolume,
    muted: initMuted,
    el: null,
    barVisible: true,

    loadWorld: async (worldId) => {
      const { data, error } = await supabase
        .from('world_audio_tracks')
        .select('*')
        .eq('world_id', worldId)
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[useAudio] loadWorld failed', error);
        return;
      }
      const tracks = (data ?? []).map(fromRow);
      set({
        byWorld: { ...get().byWorld, [worldId]: tracks },
        loadedWorlds: { ...get().loadedWorlds, [worldId]: true },
      });
    },

    uploadTrack: async (worldId, file, opts) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('Not signed in.');

      if (file.size > MAX_FILE_BYTES) {
        throw new Error(`File is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB. Try a shorter clip or a more-compressed format (mp3 / ogg).`);
      }

      // Enforce per-world cap on the client too so users get a friendly message
      // before the upload starts. The DB trigger is the authoritative guard.
      const existing = get().byWorld[worldId] ?? [];
      if (existing.length >= MAX_TRACKS_PER_WORLD) {
        throw new Error(`This world already has the maximum of ${MAX_TRACKS_PER_WORLD} ambient tracks. Remove one before adding another.`);
      }

      // Mint a track id client-side so we can compose a storage path.
      const trackId = crypto.randomUUID();
      const storagePath = `${worldId}/${trackId}__${safeFilename(file.name)}`;

      // Try to read duration locally so we can store it.
      let durationMs: number | null = null;
      try {
        durationMs = await readDurationMs(file);
      } catch {}

      const { error: upErr } = await supabase.storage
        .from('world-audio')
        .upload(storagePath, file, {
          contentType: file.type || 'audio/mpeg',
          upsert: false,
          cacheControl: '3600',
        });
      if (upErr) throw upErr;

      const nowMs = Date.now();
      const row = {
        id: trackId,
        world_id: worldId,
        user_id: userId,
        name: opts?.name?.trim() || file.name.replace(/\.[^.]+$/, '') || 'Untitled track',
        storage_path: storagePath,
        duration_ms: durationMs,
        source: opts?.source ?? 'upload',
        attribution: opts?.attribution ?? null,
        is_default: false,
        created_at: nowMs,
        updated_at: nowMs,
      };
      const { data, error } = await supabase
        .from('world_audio_tracks')
        .insert(row)
        .select()
        .single();
      if (error) {
        // Best-effort cleanup of orphan blob
        await supabase.storage.from('world-audio').remove([storagePath]).catch(() => {});
        throw error;
      }
      const track = fromRow(data);
      const cur = get().byWorld[worldId] ?? [];
      set({ byWorld: { ...get().byWorld, [worldId]: [...cur, track] } });
      return track;
    },

    renameTrack: async (trackId, name) => {
      const { data, error } = await supabase
        .from('world_audio_tracks')
        .update({ name: name.trim() || 'Untitled track', updated_at: Date.now() })
        .eq('id', trackId)
        .select()
        .single();
      if (error) throw error;
      const t = fromRow(data);
      const cur = get().byWorld[t.worldId] ?? [];
      set({
        byWorld: {
          ...get().byWorld,
          [t.worldId]: cur.map(x => (x.id === t.id ? t : x)),
        },
      });
    },

    updateAttribution: async (trackId, attribution) => {
      const { data, error } = await supabase
        .from('world_audio_tracks')
        .update({ attribution: attribution.trim() || null, updated_at: Date.now() })
        .eq('id', trackId)
        .select()
        .single();
      if (error) throw error;
      const t = fromRow(data);
      const cur = get().byWorld[t.worldId] ?? [];
      set({
        byWorld: {
          ...get().byWorld,
          [t.worldId]: cur.map(x => (x.id === t.id ? t : x)),
        },
      });
    },

    removeTrack: async (trackId) => {
      // Find which world + path.
      let worldId: string | null = null;
      let path: string | null = null;
      for (const wid in get().byWorld) {
        const found = (get().byWorld[wid] ?? []).find(t => t.id === trackId);
        if (found) { worldId = wid; path = found.storagePath; break; }
      }
      const { error } = await supabase
        .from('world_audio_tracks')
        .delete()
        .eq('id', trackId);
      if (error) throw error;
      if (path) {
        await supabase.storage.from('world-audio').remove([path]).catch(() => {});
      }
      if (worldId) {
        const cur = get().byWorld[worldId] ?? [];
        set({
          byWorld: { ...get().byWorld, [worldId]: cur.filter(t => t.id !== trackId) },
        });
      }
      // If we were playing it, stop.
      if (get().currentTrackId === trackId) {
        get().stop();
      }
    },

    getSignedUrl: async (storagePath) => {
      const cached = get().signedUrls[storagePath];
      if (cached && cached.expiresAt - Date.now() > SIGNED_URL_REFRESH_GUARD_MS) {
        return cached.url;
      }
      const { data, error } = await supabase.storage
        .from('world-audio')
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
      if (error || !data?.signedUrl) throw error ?? new Error('No signed URL returned.');
      const entry: SignedURL = {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_TTL_SEC * 1000,
      };
      set({ signedUrls: { ...get().signedUrls, [storagePath]: entry } });
      return data.signedUrl;
    },

    play: async (trackId) => {
      // Find the track.
      let track: AudioTrack | null = null;
      for (const wid in get().byWorld) {
        const f = (get().byWorld[wid] ?? []).find(t => t.id === trackId);
        if (f) { track = f; break; }
      }
      if (!track) throw new Error('Track not found.');

      const url = await get().getSignedUrl(track.storagePath);
      const el = ensureEl();
      if (get().currentTrackId !== trackId) {
        el.src = url;
        set({ currentTrackId: trackId });
      }
      el.volume = get().volume;
      el.muted = get().muted;
      try {
        await el.play();
        set({ isPlaying: true, barVisible: true });
      } catch (e: any) {
        // Browsers often block autoplay without a user gesture. Surface a clean error.
        set({ isPlaying: false });
        throw new Error(e?.message ?? 'Browser blocked playback. Click play again.');
      }
    },

    pause: () => {
      const el = get().el;
      if (el) el.pause();
      set({ isPlaying: false });
    },

    resume: async () => {
      const el = get().el;
      if (!el || !get().currentTrackId) return;
      try {
        await el.play();
        set({ isPlaying: true });
      } catch {
        set({ isPlaying: false });
      }
    },

    toggle: async () => {
      if (get().isPlaying) get().pause();
      else await get().resume();
    },

    stop: () => {
      const el = get().el;
      if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
      set({ isPlaying: false, currentTrackId: null });
    },

    next: async (worldId) => {
      const list = get().byWorld[worldId] ?? [];
      if (list.length === 0) return;
      const cur = get().currentTrackId;
      const idx = cur ? list.findIndex(t => t.id === cur) : -1;
      const nextIdx = idx < 0 ? 0 : (idx + 1) % list.length;
      await get().play(list[nextIdx].id);
    },

    prev: async (worldId) => {
      const list = get().byWorld[worldId] ?? [];
      if (list.length === 0) return;
      const cur = get().currentTrackId;
      const idx = cur ? list.findIndex(t => t.id === cur) : -1;
      const prevIdx = idx < 0 ? 0 : (idx - 1 + list.length) % list.length;
      await get().play(list[prevIdx].id);
    },

    setVolume: (v) => {
      const clamped = Math.max(0, Math.min(1, v));
      const el = get().el;
      if (el) el.volume = clamped;
      set({ volume: clamped });
      savePrefs();
    },

    setMuted: (m) => {
      const el = get().el;
      if (el) el.muted = m;
      set({ muted: m });
      savePrefs();
    },

    setBarVisible: (v) => set({ barVisible: v }),
  };
});

/** Decode just enough of the file to read its duration. */
function readDurationMs(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = 'metadata';
    a.src = url;
    const cleanup = () => { URL.revokeObjectURL(url); };
    a.addEventListener('loadedmetadata', () => {
      const ms = isFinite(a.duration) ? Math.round(a.duration * 1000) : 0;
      cleanup();
      resolve(ms);
    });
    a.addEventListener('error', () => { cleanup(); reject(new Error('Could not read duration')); });
  });
}
