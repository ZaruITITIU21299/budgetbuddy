import { useMemo, useState } from 'react';
import {
  Plus, Users, ArrowLeft, Share2, LogOut, Receipt, Settings2, Hash,
} from 'lucide-react';
import { Button, Avatar, EmptyState, Card, Badge, CategoryIconBadge } from '@/components/ui';
import { useAuthStore, useGroupStore, useUIStore } from '@/stores';
import { Expense } from '@/models';
import { useGroupBalances } from '@/hooks';
import { formatVND, formatRelativeDate, cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { CATEGORY_META } from '@/constants/categories';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';

export default function GroupsView() {
  const view = useUIStore((s) => s.view);
  const routeParam = useUIStore((s) => s.routeParam);
  const setView = useUIStore((s) => s.setView);
  const openModal = useUIStore((s) => s.openModal);

  // group detail mode
  if (view === 'groups' && routeParam) {
    return <GroupDetail groupId={routeParam} onBack={() => setView('groups')} />;
  }

  return <GroupsList onOpen={(id) => setView('groups', id)} onCreate={() => openModal('group_create')} onJoin={() => openModal('group_join')} />;
}

function GroupsList({ onOpen, onCreate, onJoin }: { onOpen: (id: string) => void; onCreate: () => void; onJoin: () => void }) {
  const groups = useGroupStore((s) => s.groups);
  const session = useAuthStore((s) => s.session);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-5 max-w-7xl mx-auto pb-32 lg:pb-9">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Groups</h1>
            <p className="text-sm text-slate-400 mt-0.5">{groups.length} active group{groups.length === 1 ? '' : 's'}</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="secondary" leftIcon={<Hash className="size-4" />} onClick={onJoin}>Join</Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={onCreate}>New Group</Button>
          </div>
        </header>

        {groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create one for your roommates, study squad, or trip companions — bills will split automatically."
            action={
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onJoin}>Join with code</Button>
                <Button onClick={onCreate} leftIcon={<Plus className="size-4" />}>Create Group</Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <GroupCard key={g.id} groupId={g.id} sessionUserId={session?.userId ?? ''} onOpen={() => onOpen(g.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ groupId, sessionUserId, onOpen }: { groupId: string; sessionUserId: string; onOpen: () => void }) {
  const groups = useGroupStore((s) => s.groups);
  const membersByGroup = useGroupStore((s) => s.membersByGroup);
  const { balances } = useGroupBalances(groupId);
  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;
  const members = membersByGroup[groupId] ?? [];

  const myBalance = balances.find((b) => b.user.id === sessionUserId)?.net ?? 0;
  const positive = myBalance > 0;

  return (
    <motion.button
      layout
      onClick={onOpen}
      className="rounded-3xl card-elevated p-5 text-left hover:border-white/20 transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="size-12 rounded-2xl gradient-violet flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Users className="size-5 text-white" />
        </div>
        <Badge variant={Math.abs(myBalance) > 0 ? (positive ? 'success' : 'danger') : 'neutral'}>
          {Math.abs(myBalance) > 0 ? (positive ? 'You are owed' : 'You owe') : 'Even'}
        </Badge>
      </div>
      <h3 className="text-lg font-bold text-white mt-4 truncate">{group.name}</h3>
      {group.description && <p className="text-xs text-slate-400 mt-1 truncate">{group.description}</p>}

      <div className="flex items-center justify-between mt-5">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((m) => (
            <Avatar key={m.id} name={m.full_name} size="xs" />
          ))}
          {members.length > 4 && (
            <div className="size-6 rounded-full bg-white/10 text-[10px] font-bold text-slate-300 flex items-center justify-center ring-2 ring-white/10">
              +{members.length - 4}
            </div>
          )}
        </div>
        <span className={cn('text-sm font-bold', positive ? 'text-emerald-400' : myBalance < 0 ? 'text-rose-400' : 'text-slate-400')}>
          {Math.abs(myBalance) > 0 ? formatVND(Math.abs(myBalance), { compact: true }) : '—'}
        </span>
      </div>
    </motion.button>
  );
}

function GroupDetail({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const groups = useGroupStore((s) => s.groups);
  const membersByGroup = useGroupStore((s) => s.membersByGroup);
  const groupExpenseRows = useGroupStore((s) => s.groupExpenses);
  const leave = useGroupStore((s) => s.leave);
  const session = useAuthStore((s) => s.session);
  const openModal = useUIStore((s) => s.openModal);
  const { balances } = useGroupBalances(groupId);

  const group = groups.find((g) => g.id === groupId);
  const members = membersByGroup[groupId] ?? [];
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [tab, setTab] = useState<'expenses' | 'members'>('expenses');

  const groupExpenses = useMemo(
    () => (groupExpenseRows[groupId] ?? []).map(Expense.fromRow),
    [groupExpenseRows, groupId],
  );

  if (!group || !session) {
    return (
      <div className="p-10 text-center text-slate-400">
        Group not found.
        <button onClick={onBack} className="block mt-4 text-emerald-400 font-bold">← Back</button>
      </div>
    );
  }

  const handleLeave = async () => {
    if (!confirm(`Leave "${group.name}"? You'll lose access to its expenses.`)) return;
    try {
      await leave(groupId, session.userId);
      toast.success('Left group');
      onBack();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to leave group');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-5 max-w-5xl mx-auto pb-32 lg:pb-9">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Back to groups
        </button>

        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl gradient-violet flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Users className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{group.name}</h1>
              <p className="text-sm text-slate-400 mt-0.5">{group.description ?? 'Shared group expenses'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" leftIcon={<Share2 className="size-4" />} onClick={() => openModal('group_invite', { groupId })}>
              Invite
            </Button>
            <Button variant="secondary" leftIcon={<Settings2 className="size-4" />} onClick={() => openModal('group_settle_up', { groupId })}>
              Settle up
            </Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => openModal('expense_form', { defaultGroupId: groupId })}>
              Add Expense
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5">
          {(['expenses', 'members'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors capitalize',
                tab === t
                  ? 'text-white border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-white',
              )}
            >
              {t} {t === 'expenses' ? `· ${groupExpenses.length}` : `· ${members.length}`}
            </button>
          ))}
        </div>

        {tab === 'expenses' && (
          <Card padding="none">
            {groupExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No group expenses yet"
                description="Add the first shared bill to kick things off."
                action={<Button onClick={() => openModal('expense_form', { defaultGroupId: groupId })} leftIcon={<Plus className="size-4" />}>Add Expense</Button>}
              />
            ) : (
              <div className="divide-y divide-white/5">
                {groupExpenses.map((e) => {
                  const meta = CATEGORY_META[e.category];
                  const payer = e.paidBy ? memberById.get(e.paidBy) : undefined;
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                      <CategoryIconBadge category={e.category} size="sm" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{e.title}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          {payer?.full_name === session.fullName ? 'You paid' : `${payer?.full_name ?? 'Someone'} paid`}
                          {' · '}
                          {formatRelativeDate(e.expenseDate)} · {meta.label}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-violet-300">{formatVND(e.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {tab === 'members' && (
          <Card padding="none">
            <div className="divide-y divide-white/5">
              {members.map((m) => {
                const isYou = m.id === session.userId;
                const balance = balances.find((b) => b.user.id === m.id)?.net ?? 0;
                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                    <Avatar name={m.full_name} src={m.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{m.full_name}</h4>
                        {isYou && <Badge variant="success">You</Badge>}
                        {group.isAdmin(m.id) && <Badge variant="info">Admin</Badge>}
                      </div>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                    <span
                      className={cn(
                        'text-sm font-bold shrink-0',
                        balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-500',
                      )}
                    >
                      {balance !== 0 ? formatVND(balance, { signed: true }) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/5 text-right">
              <Button variant="ghost" leftIcon={<LogOut className="size-4" />} onClick={handleLeave}>
                Leave group
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
