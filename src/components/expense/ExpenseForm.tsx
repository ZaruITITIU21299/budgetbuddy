import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  Loader2,
  RefreshCcw,
  Sparkles,
  Users,
  Wallet,
  Repeat,
  Trash2,
} from 'lucide-react';
import { useAuthStore, useExpenseStore, useGroupStore, useUIStore } from '@/stores';
import { Modal, Button, Input, Textarea, Select, CategoryIconBadge } from '@/components/ui';
import { CATEGORY_LIST, CATEGORY_META } from '@/constants/categories';
import { EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseCategory, ExpenseSplitRow, ExpenseRow, SplitMethod } from '@/types';
import { ExpenseSchema } from '@/lib/validation/schemas';
import { Expense, SplitCalculator } from '@/models';
import { ReceiptStorage, AIFeedbackRepo } from '@/lib/storage';
import { getAIClient } from '@/lib/ai';
import { format } from 'date-fns';
import { formatVND, parseVNDInput, cn, validateReceiptFile } from '@/lib/utils';
import toast from 'react-hot-toast';

type Mode = 'create' | 'edit';

interface ExpenseFormPayload {
  expense?: Expense | null;
  defaultGroupId?: string;
  initial?: {
    title?: string;
    amount?: number;
    category?: ExpenseCategory;
    note?: string;
    receiptUrl?: string;
  };
}

export function ExpenseFormModal() {
  const modal = useUIStore((s) => s.modal);
  const payload = useUIStore((s) => s.modalPayload) as ExpenseFormPayload | null;
  const close = useUIStore((s) => s.closeModal);

  if (modal !== 'expense_form' && modal !== 'expense_edit') return null;

  const editing = modal === 'expense_edit';
  const mode: Mode = editing ? 'edit' : 'create';

  return <ExpenseFormBody mode={mode} payload={payload ?? null} onClose={close} />;
}

function ExpenseFormBody({
  mode,
  payload,
  onClose,
}: {
  mode: Mode;
  payload: ExpenseFormPayload | null;
  onClose: () => void;
}) {
  const session = useAuthStore((s) => s.session);
  const addExpense = useExpenseStore((s) => s.add);
  const updateExpense = useExpenseStore((s) => s.update);
  const removeExpense = useExpenseStore((s) => s.remove);
  const groups = useGroupStore((s) => s.groups);
  const membersByGroup = useGroupStore((s) => s.membersByGroup);

  const existing = payload?.expense ?? null;
  const initial = payload?.initial;

  const [title, setTitle] = useState(existing?.title ?? initial?.title ?? '');
  const [amount, setAmount] = useState<number>(existing?.amount ?? initial?.amount ?? 0);
  const [category, setCategory] = useState<ExpenseCategory>(
    existing?.category ?? initial?.category ?? 'other',
  );
  const [expenseDate, setExpenseDate] = useState<string>(
    existing ? format(existing.expenseDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
  );
  const [note, setNote] = useState(existing?.note ?? initial?.note ?? '');
  const [groupId, setGroupId] = useState<string | undefined>(
    existing?.groupId ?? payload?.defaultGroupId,
  );
  const [isRecurring, setIsRecurring] = useState<boolean>(existing?.isRecurring ?? false);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(
    existing?.receiptUrl ?? initial?.receiptUrl,
  );
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [predictedCategory, setPredictedCategory] = useState<{ category: ExpenseCategory; confidence: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const selectedMembers = selectedGroup ? membersByGroup[selectedGroup.id] ?? [] : [];

  const previewSplit = useMemo(() => {
    if (!selectedGroup || amount <= 0 || splitMethod !== 'equal') return null;
    const calc = new SplitCalculator(
      amount,
      selectedGroup.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        groupId: m.groupId,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      'equal',
    );
    return calc.calculateEqualSplit();
  }, [selectedGroup, amount, splitMethod]);

  useEffect(() => {
    // when title changes (debounced), maybe auto-suggest
    if (mode !== 'create') return;
    if (!title.trim()) {
      setPredictedCategory(null);
      return;
    }
    const handle = setTimeout(() => {
      autoSuggest();
    }, 700);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const autoSuggest = async () => {
    if (!title.trim()) return;
    setAiLoading(true);
    try {
      const ai = getAIClient();
      const result = await ai.categorize({ title, amount, note });
      setPredictedCategory({ category: result.category, confidence: result.confidence });
      if (result.confidence >= 0.75 && mode === 'create') {
        setCategory(result.category);
      }
    } catch {
      // silent
    } finally {
      setAiLoading(false);
    }
  };

  const onCategoryChange = (next: ExpenseCategory) => {
    if (session && predictedCategory && next !== predictedCategory.category) {
      // user disagreed with the AI — record feedback (fire and forget)
      void AIFeedbackRepo.record({
        user_id: session.userId,
        expense_id: existing?.id,
        predicted_value: predictedCategory.category,
        actual_value: next,
        feedback_type: 'category',
      });
    }
    setCategory(next);
  };

  const handleReceiptUpload = async (file: File) => {
    if (!session) return;
    const valid = validateReceiptFile(file);
    if (!valid.ok) {
      toast.error(valid.error ?? 'Invalid file');
      return;
    }
    try {
      const url = await ReceiptStorage.upload(session.userId, file);
      setReceiptUrl(url);
      toast.success('Receipt attached');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Receipt upload failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrors({});

    const parsed = ExpenseSchema.safeParse({
      title,
      amount,
      category,
      expenseDate: new Date(expenseDate),
      note,
      groupId: groupId,
      isRecurring,
      receiptUrl,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        errs[path] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'> = {
        user_id: session.userId,
        group_id: groupId || undefined,
        title: parsed.data.title,
        amount: parsed.data.amount,
        category: parsed.data.category,
        category_confidence: predictedCategory?.confidence,
        note: parsed.data.note,
        expense_date: parsed.data.expenseDate.toISOString().slice(0, 10),
        receipt_url: receiptUrl,
        is_recurring: parsed.data.isRecurring,
        paid_by: groupId ? session.userId : undefined,
      };

      if (mode === 'edit' && existing) {
        await updateExpense(existing.id, payload);
        toast.success('Expense updated');
      } else {
        let splits: Array<Omit<ExpenseSplitRow, 'id' | 'created_at' | 'expense_id'>> = [];
        if (selectedGroup && previewSplit) {
          splits = Array.from(previewSplit.entries()).map(([userId, owed]) => ({
            user_id: userId,
            amount_owed: owed,
            split_method: 'equal',
            status: userId === session.userId ? 'settled' : 'pending',
            percentage: undefined,
            shares: undefined,
            settled_at: undefined,
          }));
        }
        await addExpense(payload, splits);
        toast.success(`Expense added: ${formatVND(parsed.data.amount)}`);
      }

      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!confirm(`Delete "${existing.title}"? This cannot be undone.`)) return;
    try {
      // The store handles repo deletion + split cleanup (cascade in Supabase,
      // explicit cleanup in local mode via ExpensesRepo.remove).
      await removeExpense(existing.id);
      toast.success('Expense deleted');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={mode === 'create' ? 'Add Expense' : 'Edit Expense'}
      subtitle={mode === 'create' ? 'Log a new spending or income entry' : 'Update the details below'}
      footer={
        <>
          {mode === 'edit' && (
            <Button variant="ghost" leftIcon={<Trash2 className="size-4" />} onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit} type="submit">
            {mode === 'create' ? 'Save Expense' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="What did you spend on?"
          placeholder="e.g. Phở bò, Grab to campus, Học phí HK2…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors['title']}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (VND)"
            inputMode="numeric"
            value={amount > 0 ? amount.toLocaleString('de-DE') : ''}
            onChange={(e) => setAmount(parseVNDInput(e.target.value))}
            leftIcon={<Wallet className="size-4" />}
            placeholder="0"
            error={errors['amount']}
          />
          <Input
            label="Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            leftIcon={<Calendar className="size-4" />}
            error={errors['expenseDate']}
          />
        </div>

        {/* Category grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Category</label>
            <button
              type="button"
              onClick={autoSuggest}
              disabled={aiLoading || !title.trim()}
              className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 disabled:opacity-40 disabled:hover:text-violet-300 flex items-center gap-1.5"
            >
              {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              Auto-categorize
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CATEGORY_LIST.map((meta) => {
              const isActive = meta.id === category;
              const isPredicted = predictedCategory?.category === meta.id && predictedCategory.confidence >= 0.6;
              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => onCategoryChange(meta.id)}
                  className={cn(
                    'p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all',
                    isActive
                      ? `${meta.bgClass} ${meta.borderClass} ${meta.textClass}`
                      : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5',
                  )}
                >
                  <CategoryIconBadge category={meta.id} size="sm" className="!size-7" />
                  <span className="text-center leading-tight">{meta.label}</span>
                  {isPredicted && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300">
                      AI {Math.round(predictedCategory!.confidence * 100)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="e.g. Lunch with study group; split 4 ways"
          error={errors['note']}
        />

        {/* Group selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="size-3.5" />
            Group (optional)
          </label>
          <Select value={groupId ?? ''} onChange={(e) => setGroupId(e.target.value || undefined)}>
            <option value="">Personal expense</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.members.length} members
              </option>
            ))}
          </Select>
        </div>

        {selectedGroup && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Split</span>
              <select
                value={splitMethod}
                onChange={(e) => setSplitMethod(e.target.value as SplitMethod)}
                className="text-xs bg-transparent text-slate-300 font-semibold border-none focus:outline-none"
              >
                <option value="equal">Equal split</option>
              </select>
            </div>
            {previewSplit && (
              <div className="text-xs text-slate-300 space-y-1">
                {selectedMembers.map((m) => (
                  <div key={m.id} className="flex justify-between">
                    <span className="truncate">{m.id === session?.userId ? 'You' : m.full_name}</span>
                    <span className="font-semibold text-white">{formatVND(previewSplit.get(m.id) ?? 0, { compact: true })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Receipt & recurring */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors text-sm text-slate-200">
            <Camera className="size-4 text-slate-400" />
            <span className="truncate">{receiptUrl ? 'Receipt attached ✓' : 'Attach receipt'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleReceiptUpload(file);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors',
              isRecurring
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10',
            )}
          >
            <Repeat className="size-4" />
            <span>{isRecurring ? 'Recurring' : 'One-time'}</span>
          </button>
        </div>

        {predictedCategory && (
          <div className="rounded-2xl px-3 py-2.5 bg-violet-500/10 border border-violet-500/20 text-[11px] text-slate-300 flex items-center gap-2">
            <RefreshCcw className="size-3.5 text-violet-300" />
            AI suggests <span className="font-bold text-violet-200">{CATEGORY_META[predictedCategory.category].label}</span>
            {' '}with {Math.round(predictedCategory.confidence * 100)}% confidence.
            {predictedCategory.category !== category && ' Your selection was recorded as feedback to improve accuracy.'}
          </div>
        )}
      </form>
    </Modal>
  );
}

// keep eslint happy
void EXPENSE_CATEGORIES;
