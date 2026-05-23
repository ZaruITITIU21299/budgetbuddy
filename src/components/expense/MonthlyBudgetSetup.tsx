import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Modal, Button, Input, CategoryIconBadge } from '@/components/ui';
import { useAuthStore, useBudgetStore, useUIStore } from '@/stores';
import { CATEGORY_LIST } from '@/constants/categories';
import { formatVND, parseVNDInput, getCurrentMonthYear, formatMonthYear } from '@/lib/utils';
import type { ExpenseCategory } from '@/types';
import toast from 'react-hot-toast';

export function MonthlyBudgetSetupModal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);
  const limits = useBudgetStore((s) => s.limits);
  const setLimit = useBudgetStore((s) => s.setLimit);
  const monthYear = useBudgetStore((s) => s.monthYear);

  const [draft, setDraft] = useState<Record<string, number>>(() =>
    Object.fromEntries(CATEGORY_LIST.map((m) => [m.id, limits.find((l) => l.category === m.id)?.amount ?? 0])),
  );
  const [saving, setSaving] = useState(false);

  if (modal !== 'budget_setup' || !session) return null;

  const total = Object.values(draft).reduce((s, v) => s + v, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        CATEGORY_LIST.map((meta) =>
          setLimit({
            userId: session.userId,
            category: meta.id as ExpenseCategory,
            amount: draft[meta.id] ?? 0,
            monthYear: getCurrentMonthYear(),
          }),
        ),
      );
      toast.success('Budget limits saved');
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save budgets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={close}
      title="Monthly Budgets"
      subtitle={`Set per-category limits for ${formatMonthYear(monthYear)}`}
      size="md"
      footer={
        <>
          <div className="mr-auto text-xs text-slate-400">
            Total budget: <span className="text-white font-bold text-base">{formatVND(total)}</span>
          </div>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Budgets</Button>
        </>
      }
    >
      <div className="space-y-2">
        {CATEGORY_LIST.map((meta) => (
          <div key={meta.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
            <CategoryIconBadge category={meta.id as ExpenseCategory} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{meta.label}</p>
            </div>
            <div className="w-44">
              <Input
                inputMode="numeric"
                placeholder="0"
                value={draft[meta.id] > 0 ? draft[meta.id].toLocaleString('de-DE') : ''}
                onChange={(e) => setDraft((d) => ({ ...d, [meta.id]: parseVNDInput(e.target.value) }))}
                leftIcon={<Wallet className="size-3.5" />}
                className="!py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
