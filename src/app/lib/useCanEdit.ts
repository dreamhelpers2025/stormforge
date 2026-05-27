import { useWorlds } from '../stores/useWorlds';
import { useAuth } from '../stores/useAuth';
import { useMembers } from '../stores/useMembers';

/**
 * Returns true when the current user is allowed to mutate content in the
 * given world. Mirrors the rule used in cloudSync.getEditableWorldIds:
 *   - owner of the world (ownerUserId === current user, or legacy world with no owner)
 *   - or accepted member with role='editor'
 *
 * Viewers and anonymous users on owned worlds get `false` — UI uses this
 * to disable edit affordances. The server's RLS is the authoritative gate;
 * this is for ergonomics so users don't see buttons that wouldn't work.
 */
export function useCanEditWorld(worldId: string | undefined): boolean {
  const worlds = useWorlds(s => s.worlds);
  const userId = useAuth(s => s.user?.id ?? null);
  const myRoles = useMembers(s => s.myMemberRoles);

  if (!worldId) return false;
  const world = worlds.find(w => w.id === worldId);
  if (!world) return false;

  // Pre-sharing local-only world (no ownerUserId yet): treat as editable.
  if (!world.ownerUserId) return true;
  // Owner.
  if (userId && world.ownerUserId === userId) return true;
  // Editor member.
  if (myRoles[worldId] === 'editor') return true;
  return false;
}

/** Pure-function variant for places that already have the inputs in hand
 *  (e.g. derived in a parent that's already subscribed to these stores). */
export function canEditWorld(
  worldId: string,
  worlds: { id: string; ownerUserId?: string }[],
  userId: string | null,
  myRoles: Record<string, 'viewer' | 'editor'>,
): boolean {
  const w = worlds.find(x => x.id === worldId);
  if (!w) return false;
  if (!w.ownerUserId) return true;
  if (userId && w.ownerUserId === userId) return true;
  return myRoles[worldId] === 'editor';
}
