import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Modal, Button, Avatar, EmptyState } from '@/components/ui';
import { useUIStore, useAuthStore, useGroupStore } from '@/stores';
import { useGroupBalances } from '@/hooks';
import { SettlementsRepo, ExpenseSplitsRepo } from '@/lib/storage';
import { formatVND } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SettleUpPayload {
  groupId: string;
}

export function GroupSettleUpModal() {
  const modal = useUIStore((s) => s.modal);
  const payload = useUIStore((s) => s.modalPayload) as SettleUpPayload | null;
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);

  if (modal !== 'group_settle_up' || !payload) return null;

  return <SettleUpBody groupId={payload.groupId} onClose={close} sessionUserId={session?.userId ?? ''} />;
}

function SettleUpBody({ groupId, onClose, sessionUserId }: { groupId: string; onClose: () => void; sessionUserId: string }) {
  const { balances, settlements } = useGroupBalances(groupId);
  const refreshGroup = useGroupStore((s) => s.refreshOne);
  const groupExpenseRows = useGroupStore((s) => s.groupExpenses);
  const groupSplitRows = useGroupStore((s) => s.groupSplits);

  const handleMarkSettled = async (fromId: string, toId: string, amount: number) => {
    try {
      await SettlementsRepo.create({
        group_id: groupId,
        paid_by: fromId,
        paid_to: toId,
        amount,
        note: 'Marked settled from settle-up view',
      });

      const groupExpenses = groupExpenseRows[groupId] ?? [];
      const splits = groupSplitRows[groupId] ?? [];
      const targets = splits.filter((s) => {
        if (s.user_id !== fromId || s.status !== 'pending') return false;
        const exp = groupExpenses.find((e) => e.id === s.expense_id);
        return !!exp && exp.paid_by === toId;
      });
      await Promise.all(targets.map((s) => ExpenseSplitsRepo.markSettled(s.id)));

      await refreshGroup(groupId);
      toast.success(`Marked ${formatVND(amount)} as settled`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Settle-up failed');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Settle Up"
      subtitle="We use a greedy algorithm to minimise the number of payments required."
    >
      <div className="space-y-5">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Net balances</h4>
          {balances.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Everyone is square"
              description="There are no outstanding balances in this group."
            />
          ) : (
            <div className="space-y-2">
              {balances.map((b) => {
                const isYou = b.user.id === sessionUserId;
                const positive = b.net > 0;
                return (
                  <div
                    key={b.user.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={b.user.full_name} size="sm" src={b.user.avatar_url} />
                      <span className="text-sm font-bold text-white">
                        {isYou ? 'You' : b.user.full_name}
                      </span>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        positive ? 'text-emerald-400' : b.net < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {formatVND(b.net)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {settlements.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-300" />
              Suggested payments ({settlements.length})
            </h4>
            <div className="space-y-2">
              {settlements.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-white/10 bg-emerald-500/5"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar name={s.from.full_name} size="xs" src={s.from.avatar_url} />
                    <span className="text-sm font-semibold text-slate-200 truncate">
                      {s.from.id === sessionUserId ? 'You' : s.from.full_name}
                    </span>
                    <ArrowRight className="size-4 text-slate-500 shrink-0" />
                    <Avatar name={s.to.full_name} size="xs" src={s.to.avatar_url} />
                    <span className="text-sm font-semibold text-slate-200 truncate">
                      {s.to.id === sessionUserId ? 'You' : s.to.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-emerald-300 text-sm">{formatVND(s.amount)}</span>
                    <Button size="sm" variant="success" onClick={() => handleMarkSettled(s.from.id, s.to.id, s.amount)}>
                      Settled
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
