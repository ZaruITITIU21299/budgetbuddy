import { create } from 'zustand';
import { GroupsRepo, GroupMembersRepo, ProfileRepo, ExpensesRepo, ExpenseSplitsRepo } from '@/lib/storage';
import { Group } from '@/models';
import type { ExpenseSplitRow, ExpenseRow, ProfileRow } from '@/types';

interface GroupState {
  groups: Group[];
  membersByGroup: Record<string, ProfileRow[]>;
  /** Expenses + splits for groups the user belongs to, keyed by group id.
   *  Populated by `loadFor` so the settle-up + balances views never have to
   *  call the repos directly (which is important for Supabase where reads
   *  are async). */
  groupExpenses: Record<string, ExpenseRow[]>;
  groupSplits: Record<string, ExpenseSplitRow[]>;
  isLoaded: boolean;
  isLoading: boolean;
  loadFor: (userId: string) => Promise<void>;
  create: (input: { name: string; description?: string; userId: string }) => Promise<Group>;
  joinByCode: (code: string, userId: string) => Promise<Group | null>;
  leave: (groupId: string, userId: string) => Promise<void>;
  refreshOne: (groupId: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  membersByGroup: {},
  groupExpenses: {},
  groupSplits: {},
  isLoaded: false,
  isLoading: false,

  loadFor: async (userId) => {
    set({ isLoading: true });
    try {
      const rows = await GroupsRepo.list(userId);

      // Pull membership rows for every group in parallel.
      const memberRowsByGroup = await Promise.all(
        rows.map((g) => GroupMembersRepo.listByGroup(g.id).then((members) => ({ groupId: g.id, members }))),
      );

      const groups = rows.map((g) => {
        const members = memberRowsByGroup.find((m) => m.groupId === g.id)?.members ?? [];
        return Group.fromRow(g, members);
      });

      // Collect every user id that appears in any group, fetch profiles in one batch.
      const allUserIds = Array.from(new Set(memberRowsByGroup.flatMap((m) => m.members.map((mm) => mm.user_id))));
      const profiles = await ProfileRepo.listByIds(allUserIds);
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const membersByGroup: Record<string, ProfileRow[]> = {};
      for (const { groupId, members } of memberRowsByGroup) {
        membersByGroup[groupId] = members
          .map((m) => profileById.get(m.user_id))
          .filter((p): p is ProfileRow => !!p);
      }

      // Pull group expenses + splits up-front so hooks like useGroupBalances
      // never need to async-fetch in render.
      const groupExpenses: Record<string, ExpenseRow[]> = {};
      const groupSplits: Record<string, ExpenseSplitRow[]> = {};
      await Promise.all(
        rows.map(async (g) => {
          const [exps, sps] = await Promise.all([
            ExpensesRepo.listForGroup(g.id),
            ExpenseSplitsRepo.listByGroup(g.id),
          ]);
          groupExpenses[g.id] = exps;
          groupSplits[g.id] = sps;
        }),
      );

      set({ groups, membersByGroup, groupExpenses, groupSplits, isLoaded: true, isLoading: false });
    } catch (e) {
      console.error('[groups] loadFor failed', e);
      set({ isLoading: false, isLoaded: true });
      throw e;
    }
  },

  create: async (input) => {
    const row = await GroupsRepo.create({
      name: input.name,
      description: input.description,
      createdBy: input.userId,
    });
    const members = await GroupMembersRepo.listByGroup(row.id);
    const group = Group.fromRow(row, members);

    const memberProfiles = await ProfileRepo.listByIds(members.map((m) => m.user_id));

    set((state) => ({
      groups: [group, ...state.groups],
      membersByGroup: {
        ...state.membersByGroup,
        [group.id]: memberProfiles,
      },
      groupExpenses: { ...state.groupExpenses, [group.id]: [] },
      groupSplits: { ...state.groupSplits, [group.id]: [] },
    }));
    return group;
  },

  joinByCode: async (code, userId) => {
    const row = await GroupsRepo.joinByCode(code, userId);
    if (!row) return null;
    await get().refreshOne(row.id);
    const refreshed = get().groups.find((g) => g.id === row.id);
    return refreshed ?? null;
  },

  leave: async (groupId, userId) => {
    await GroupMembersRepo.leave(groupId, userId);
    set((state) => {
      const { [groupId]: _members, ...restMembers } = state.membersByGroup;
      const { [groupId]: _exps, ...restExps } = state.groupExpenses;
      const { [groupId]: _sps, ...restSps } = state.groupSplits;
      void _members; void _exps; void _sps;
      return {
        groups: state.groups.filter((g) => g.id !== groupId),
        membersByGroup: restMembers,
        groupExpenses: restExps,
        groupSplits: restSps,
      };
    });
  },

  refreshOne: async (groupId) => {
    const row = await GroupsRepo.get(groupId);
    if (!row) return;
    const members = await GroupMembersRepo.listByGroup(groupId);
    const group = Group.fromRow(row, members);
    const memberProfiles = await ProfileRepo.listByIds(members.map((m) => m.user_id));
    const [exps, sps] = await Promise.all([
      ExpensesRepo.listForGroup(groupId),
      ExpenseSplitsRepo.listByGroup(groupId),
    ]);

    set((state) => ({
      groups: state.groups.some((g) => g.id === groupId)
        ? state.groups.map((g) => (g.id === groupId ? group : g))
        : [group, ...state.groups],
      membersByGroup: { ...state.membersByGroup, [groupId]: memberProfiles },
      groupExpenses: { ...state.groupExpenses, [groupId]: exps },
      groupSplits: { ...state.groupSplits, [groupId]: sps },
    }));
  },
}));
