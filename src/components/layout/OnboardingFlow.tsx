import { useState } from 'react';
import { ArrowRight, Check, PiggyBank, Receipt, Users, Wallet } from 'lucide-react';
import { Modal, Button, Input, CategoryIconBadge } from '@/components/ui';
import { useAuthStore, useBudgetStore, useExpenseStore, useGroupStore, useUIStore } from '@/stores';
import { CATEGORY_LIST } from '@/constants/categories';
import { getCurrentMonthYear, parseVNDInput, formatVND } from '@/lib/utils';
import type { ExpenseCategory, ExpenseRow } from '@/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_BUDGETS: Array<{ category: ExpenseCategory; suggested: number }> = [
  { category: 'food_drink', suggested: 2_000_000 },
  { category: 'transport', suggested: 600_000 },
  { category: 'housing', suggested: 2_000_000 },
  { category: 'utilities', suggested: 500_000 },
  { category: 'education', suggested: 800_000 },
  { category: 'entertainment', suggested: 600_000 },
];

type Step = 1 | 2 | 3 | 'done';

export function OnboardingFlow() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setLimit = useBudgetStore((s) => s.setLimit);
  const addExpense = useExpenseStore((s) => s.add);
  const createGroup = useGroupStore((s) => s.create);

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [budgets, setBudgets] = useState<Record<ExpenseCategory, number>>(() =>
    Object.fromEntries(QUICK_BUDGETS.map((b) => [b.category, b.suggested])) as Record<ExpenseCategory, number>,
  );
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  // Step 2
  const [exTitle, setExTitle] = useState('');
  const [exAmount, setExAmount] = useState<number>(0);
  const [exCategory, setExCategory] = useState<ExpenseCategory>('food_drink');

  // Step 3
  const [groupName, setGroupName] = useState('');

  const [busy, setBusy] = useState(false);

  if (modal !== 'onboarding' || !session) return null;

  const goNext = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (step === 1) {
        for (const b of QUICK_BUDGETS) {
          if (budgets[b.category] > 0) {
            await setLimit({
              userId: session.userId,
              category: b.category,
              amount: budgets[b.category],
              monthYear: getCurrentMonthYear(),
            });
          }
        }
        setStep(2);
      } else if (step === 2) {
        if (exTitle.trim() && exAmount > 0) {
          const payload: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'> = {
            user_id: session.userId,
            title: exTitle,
            amount: exAmount,
            category: exCategory,
            expense_date: new Date().toISOString().slice(0, 10),
            is_recurring: false,
          };
          await addExpense(payload);
        }
        setStep(3);
      } else if (step === 3) {
        if (groupName.trim()) {
          const group = await createGroup({ name: groupName.trim(), userId: session.userId });
          toast.success(`Group "${group.name}" ready — invite code ${group.inviteCode}`);
        }
        await updateProfile({ onboarding_done: true });
        setStep('done');
        setTimeout(close, 1100);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong, try again');
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    try {
      await updateProfile({ onboarding_done: true });
    } catch (e) {
      console.warn('[onboarding] could not update profile', e);
    }
    close();
  };

  return (
    <Modal open onClose={skip} size="lg" title={undefined}>
      <AnimatePresence mode="wait">
        {step === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center"
          >
            <div className="size-16 mx-auto rounded-2xl gradient-emerald flex items-center justify-center mb-4">
              <Check className="size-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">You're all set</h2>
            <p className="text-slate-400 mt-2">Loading your dashboard…</p>
          </motion.div>
        ) : (
          <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 rounded-full transition-all ${
                      n < step ? 'w-6 bg-emerald-500' : n === step ? 'w-8 bg-emerald-500' : 'w-6 bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <button onClick={skip} className="text-xs font-semibold text-slate-400 hover:text-white">
                Skip
              </button>
            </div>

            {step === 1 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="size-12 mx-auto rounded-2xl gradient-emerald flex items-center justify-center mb-3">
                    <PiggyBank className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Set your monthly budget</h2>
                  <p className="text-slate-400 mt-1">Tweak these suggestions for typical Vietnamese student spending.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {QUICK_BUDGETS.map((b) => (
                    <div
                      key={b.category}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <CategoryIconBadge category={b.category} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {CATEGORY_LIST.find((c) => c.id === b.category)?.label}
                        </p>
                      </div>
                      <input
                        inputMode="numeric"
                        value={budgets[b.category] > 0 ? budgets[b.category].toLocaleString('de-DE') : ''}
                        onChange={(e) =>
                          setBudgets((prev) => ({ ...prev, [b.category]: parseVNDInput(e.target.value) }))
                        }
                        className="w-28 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-right text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-slate-400">
                  Total: <span className="text-white font-bold">{formatVND(totalBudget)}</span>
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="size-12 mx-auto rounded-2xl gradient-sky flex items-center justify-center mb-3">
                    <Receipt className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Log your first expense</h2>
                  <p className="text-slate-400 mt-1">Don't worry, it takes 5 seconds.</p>
                </div>

                <Input
                  label="What did you spend on?"
                  placeholder="e.g. Phở bò sáng nay"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                />
                <Input
                  label="Amount (VND)"
                  inputMode="numeric"
                  leftIcon={<Wallet className="size-4" />}
                  value={exAmount > 0 ? exAmount.toLocaleString('de-DE') : ''}
                  onChange={(e) => setExAmount(parseVNDInput(e.target.value))}
                />
                <div>
                  <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Category</p>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_BUDGETS.map((b) => (
                      <button
                        key={b.category}
                        type="button"
                        onClick={() => setExCategory(b.category)}
                        className={`p-2 rounded-xl border text-[10px] font-semibold flex flex-col items-center gap-1 transition-all ${
                          exCategory === b.category
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <CategoryIconBadge category={b.category} size="sm" />
                        {CATEGORY_LIST.find((c) => c.id === b.category)?.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="text-center">
                  <div className="size-12 mx-auto rounded-2xl gradient-violet flex items-center justify-center mb-3">
                    <Users className="size-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Create a group (optional)</h2>
                  <p className="text-slate-400 mt-1">For shared expenses with roommates, friends, classmates.</p>
                </div>
                <Input
                  label="Group Name"
                  placeholder="e.g. Roommates Q302"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <p className="text-xs text-slate-500 text-center">
                  You can always create groups later from the Groups tab.
                </p>
              </div>
            )}

            <Button onClick={goNext} loading={busy} className="w-full" size="lg" rightIcon={<ArrowRight className="size-4" />}>
              {step === 3 ? 'Finish setup' : `Continue to step ${step + 1}`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
