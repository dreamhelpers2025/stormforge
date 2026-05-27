import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { compressFile } from '../lib/imageCompress';

export interface ProfileData {
  displayName: string;
  bio: string;
  accent?: string;          // hex color for personal accent
  /** Storage path in the profile-images bucket, e.g. "<userId>/avatar.jpg". */
  avatarPath?: string;
  /** Storage path in the profile-images bucket, e.g. "<userId>/background.jpg". */
  backgroundPath?: string;
  /** Signed display URLs — resolved at hydrate time, not persisted. */
  avatarUrl?: string;
  backgroundUrl?: string;
}

const EMPTY: ProfileData = { displayName: '', bio: '' };
const BUCKET = 'profile-images';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

interface ProfileStore {
  loaded: boolean;
  saving: boolean;
  profile: ProfileData;
  /** Pull profile data from auth.users.raw_user_meta_data + mint signed URLs. */
  hydrate: () => Promise<void>;
  /** Persist text/accent fields. Image uploads go through uploadImage(). */
  update: (patch: Partial<Pick<ProfileData, 'displayName' | 'bio' | 'accent'>>) => Promise<void>;
  /** Upload an avatar or background. Replaces the previous file at the same path. */
  uploadImage: (kind: 'avatar' | 'background', file: File) => Promise<void>;
  /** Delete the avatar or background from storage + clear the metadata path. */
  removeImage: (kind: 'avatar' | 'background') => Promise<void>;
}

/** Convert a `data:` URL to a Blob (used for one-time migration). */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/** Mint a signed URL for a storage path (best-effort — failure returns undefined). */
async function signedUrl(path: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
    if (error) {
      console.warn('[profile] signed URL failed', error);
      return undefined;
    }
    return data?.signedUrl;
  } catch (e) {
    console.warn('[profile] signed URL threw', e);
    return undefined;
  }
}

/**
 * One-time migration: if a user still has avatarDataUrl / backgroundDataUrl
 * embedded in their auth metadata (legacy), upload them to Storage and strip
 * the inline data. After this runs once per affected account, future sessions
 * load only paths and signed URLs — no more JWT bloat.
 */
async function migrateLegacyInlineImages(userId: string, meta: any): Promise<{ avatarPath?: string; backgroundPath?: string }> {
  const result: { avatarPath?: string; backgroundPath?: string } = {};
  const cleanup: Record<string, null> = {};
  for (const kind of ['avatar', 'background'] as const) {
    const legacyKey = kind === 'avatar' ? 'avatarDataUrl' : 'backgroundDataUrl';
    const inline = meta?.[legacyKey];
    if (typeof inline === 'string' && inline.startsWith('data:')) {
      try {
        const blob = await dataUrlToBlob(inline);
        const path = `${userId}/${kind}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
          cacheControl: '3600',
        });
        if (error) {
          console.warn(`[profile] legacy ${kind} migration upload failed`, error);
          continue;
        }
        result[`${kind}Path` as const] = path;
        cleanup[legacyKey] = null;          // delete the bloat from metadata
        console.info(`[profile] migrated legacy ${kind} to Storage at ${path}.`);
      } catch (e) {
        console.warn(`[profile] legacy ${kind} migration threw`, e);
      }
    }
  }
  if (Object.keys(cleanup).length || Object.keys(result).length) {
    // Stripping a metadata key requires sending null explicitly.
    try {
      await supabase.auth.updateUser({
        data: { ...result, ...cleanup },
      });
    } catch (e) {
      console.warn('[profile] strip legacy metadata failed', e);
    }
  }
  return result;
}

export const useProfile = create<ProfileStore>((set, get) => ({
  loaded: false,
  saving: false,
  profile: EMPTY,

  hydrate: async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      set({ loaded: true, profile: EMPTY });
      return;
    }
    const meta = (user.user_metadata ?? {}) as any;

    // Legacy → storage migration. Runs at most once per affected account.
    const migrated = await migrateLegacyInlineImages(user.id, meta);
    const avatarPath = migrated.avatarPath ?? meta.avatarPath ?? undefined;
    const backgroundPath = migrated.backgroundPath ?? meta.backgroundPath ?? undefined;

    const [avatarUrl, backgroundUrl] = await Promise.all([
      avatarPath ? signedUrl(avatarPath) : Promise.resolve(undefined),
      backgroundPath ? signedUrl(backgroundPath) : Promise.resolve(undefined),
    ]);

    set({
      loaded: true,
      profile: {
        displayName: meta.displayName ?? '',
        bio: meta.bio ?? '',
        accent: meta.accent,
        avatarPath,
        backgroundPath,
        avatarUrl,
        backgroundUrl,
      },
    });
  },

  update: async (patch) => {
    set({ saving: true });
    const cur = get().profile;
    const next: ProfileData = { ...cur, ...patch };
    // Only send the fields that legitimately live in metadata.
    const { error } = await supabase.auth.updateUser({
      data: {
        displayName: next.displayName,
        bio: next.bio,
        accent: next.accent,
      } as any,
    });
    if (error) {
      console.warn('[profile] update failed', error);
      set({ saving: false });
      throw error;
    }
    set({ profile: next, saving: false });
  },

  uploadImage: async (kind, file) => {
    set({ saving: true });
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error('Not signed in.');

      // Compress — avatars are tiny, backgrounds larger.
      const compressedDataUrl = kind === 'avatar'
        ? await compressFile(file, 400, 0.85)
        : await compressFile(file, 1800, 0.78);
      const blob = await dataUrlToBlob(compressedDataUrl);
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error(`Image is over 5 MB after compression. Try a smaller source file.`);
      }

      const path = `${userId}/${kind}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });
      if (error) throw error;

      const url = await signedUrl(path);

      // Save the path to metadata so future sessions know to fetch it.
      const metaPatch: any = {};
      metaPatch[`${kind}Path`] = path;
      const { error: metaErr } = await supabase.auth.updateUser({ data: metaPatch });
      if (metaErr) {
        console.warn(`[profile] saved ${kind} but metadata update failed`, metaErr);
      }

      set({
        profile: {
          ...get().profile,
          [`${kind}Path`]: path,
          [`${kind}Url`]: url,
        } as ProfileData,
        saving: false,
      });
    } catch (e) {
      set({ saving: false });
      throw e;
    }
  },

  removeImage: async (kind) => {
    set({ saving: true });
    try {
      const cur = get().profile;
      const path = kind === 'avatar' ? cur.avatarPath : cur.backgroundPath;
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]).catch(e => {
          // Non-fatal — proceed to clear the metadata regardless.
          console.warn(`[profile] could not delete ${kind} file`, e);
        });
      }
      const metaPatch: any = {};
      metaPatch[`${kind}Path`] = null;
      await supabase.auth.updateUser({ data: metaPatch });

      set({
        profile: {
          ...cur,
          [`${kind}Path`]: undefined,
          [`${kind}Url`]: undefined,
        },
        saving: false,
      });
    } catch (e) {
      set({ saving: false });
      throw e;
    }
  },
}));

/** Derived username from email (the part before @). */
export function usernameFromEmail(email: string | undefined): string {
  if (!email) return 'anonymous';
  return email.split('@')[0];
}
