import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { WorldMember, WorldRole } from '../types';

export const EMPTY_MEMBERS: readonly WorldMember[] = Object.freeze([]) as any;

function fromRow(r: any): WorldMember {
  return {
    id: r.id,
    worldId: r.world_id,
    userId: r.user_id ?? null,
    email: r.email,
    role: r.role,
    invitedBy: r.invited_by,
    invitedAt: Number(r.invited_at) || 0,
    acceptedAt: r.accepted_at != null ? Number(r.accepted_at) : null,
  };
}

interface MembersStore {
  /** Members of worlds I own, keyed by worldId. */
  byWorld: Record<string, WorldMember[]>;
  /** Roles I personally hold in worlds where I'm a non-owner member. */
  myMemberRoles: Record<string, 'viewer' | 'editor'>;
  loaded: boolean;

  /** Pull all member rows the current user can see (own worlds + their own membership rows). */
  hydrate: () => Promise<void>;

  /** Add a member to a world I own. */
  invite: (worldId: string, email: string, role: 'viewer' | 'editor') => Promise<WorldMember>;
  changeRole: (memberId: string, role: 'viewer' | 'editor') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  /** Claim any pending invites for the signed-in user's email. */
  claimInvites: () => Promise<number>;

  /** Resolve role for a given world. */
  roleFor: (worldId: string, ownerUserId: string, currentUserId: string | null) => WorldRole | null;
}

export const useMembers = create<MembersStore>((set, get) => ({
  byWorld: {},
  myMemberRoles: {},
  loaded: false,

  hydrate: async () => {
    // wm_owner_all policy lets us SEE all members of worlds we own.
    // wm_self_select policy lets us see our own membership rows.
    // The union covers everything we need.
    const { data, error } = await supabase.from('world_members').select('*');
    if (error) {
      console.warn('[useMembers] hydrate failed', error);
      set({ loaded: true });
      return;
    }
    const all = (data ?? []).map(fromRow);
    const byWorld: Record<string, WorldMember[]> = {};
    for (const m of all) {
      (byWorld[m.worldId] = byWorld[m.worldId] ?? []).push(m);
    }
    // myMemberRoles: rows where userId === current user's id (i.e. I'm a member)
    const { data: u } = await supabase.auth.getUser();
    const myId = u.user?.id;
    const myMemberRoles: Record<string, 'viewer' | 'editor'> = {};
    if (myId) {
      for (const m of all) {
        if (m.userId === myId && m.acceptedAt != null) {
          myMemberRoles[m.worldId] = m.role;
        }
      }
    }
    set({ byWorld, myMemberRoles, loaded: true });
  },

  invite: async (worldId, email, role) => {
    const { data: u } = await supabase.auth.getUser();
    const myId = u.user?.id;
    if (!myId) throw new Error('Not signed in');
    const payload = {
      world_id: worldId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: myId,
      invited_at: Date.now(),
      accepted_at: null,
    };
    const { data, error } = await supabase
      .from('world_members')
      .upsert(payload, { onConflict: 'world_id,email' })
      .select()
      .single();
    if (error) throw error;
    const m = fromRow(data);
    const cur = get().byWorld[worldId] ?? [];
    set({
      byWorld: {
        ...get().byWorld,
        [worldId]: [...cur.filter(x => x.id !== m.id), m],
      },
    });
    return m;
  },

  changeRole: async (memberId, role) => {
    const { data, error } = await supabase
      .from('world_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();
    if (error) throw error;
    const m = fromRow(data);
    const cur = get().byWorld[m.worldId] ?? [];
    set({
      byWorld: {
        ...get().byWorld,
        [m.worldId]: cur.map(x => (x.id === m.id ? m : x)),
      },
    });
  },

  removeMember: async (memberId) => {
    // Find which world this belongs to from local state (avoid extra query)
    let worldId: string | null = null;
    for (const wid in get().byWorld) {
      if ((get().byWorld[wid] ?? []).some(m => m.id === memberId)) {
        worldId = wid;
        break;
      }
    }
    const { error } = await supabase.from('world_members').delete().eq('id', memberId);
    if (error) throw error;
    if (worldId) {
      const cur = get().byWorld[worldId] ?? [];
      set({
        byWorld: {
          ...get().byWorld,
          [worldId]: cur.filter(m => m.id !== memberId),
        },
      });
    }
  },

  claimInvites: async () => {
    const { data, error } = await supabase.rpc('claim_pending_invites');
    if (error) {
      console.warn('[useMembers] claim_pending_invites failed', error);
      return 0;
    }
    return Number(data) || 0;
  },

  roleFor: (worldId, ownerUserId, currentUserId) => {
    if (!currentUserId) return null;
    if (ownerUserId === currentUserId) return 'owner';
    const r = get().myMemberRoles[worldId];
    if (r === 'editor') return 'editor';
    if (r === 'viewer') return 'viewer';
    return null;
  },
}));
