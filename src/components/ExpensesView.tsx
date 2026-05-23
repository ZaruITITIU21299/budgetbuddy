import { useMemo, useState } from 'react';
import { Plus, Search, Scan, Trash2, Pencil } from 'lucide-react';
import { Button, Input, Select, EmptyState, CategoryIconBadge, Badge } from '@/components/ui';
import { useExpenseStore, useUIStore } from '@/stores';
import { CATEGORY_META, CATEGORY_LIST } from '@/constants/categories';
import { EXPENSE_CATEGORIES } from '@/types';
import type { ExpenseCategory } from '@/types';
import { formatRelativeDate, formatVND, cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { NotificationBell } from '@/components/layout/NotificationBell';

const PAGE_SIZE = 25;

export default function ExpensesView() {
  const expenses = useExpenseStore((s) => s.expenses);
  const removeExpense = useExpenseStore((s) => s.remove);
  const openModal = useUIStore((s) => s.openModal);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [scope, setScope] = useState<'all' | 'personal' | 'group'>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
        if (scope === 'personal' && e.isGroupExpense()) return false;
        if (scope === 'group' && !e.isGroupExpense()) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          if (
            !e.title.toLowerCase().includes(q) &&
            !(e.note ?? '').toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      });
  }, [expenses, categoryFilter, scope, query]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    void removeExpense(id);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="p-5 sm:p-7 lg:p-9 space-y-5 max-w-7xl mx-auto pb-32 lg:pb-9">
        {/* Header */}
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Expenses</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · total {formatVND(total)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="secondary" leftIcon={<Scan className="size-4" />} onClick={() => openModal('receipt_scanner')}>
              Scan
            </Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={() => openModal('expense_form')}>
              Add
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <Input
            label="Search"
            placeholder="Search title or note…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}>
            <option value="all">All categories</option>
            {CATEGORY_LIST.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </Select>
          <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="all">All</option>
            <option value="personal">Personal</option>
            <option value="group">Group</option>
          </Select>
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No expenses match"
            description="Try clearing your filters or adding your first expense."
            action={<Button onClick={() => openModal('expense_form')} leftIcon={<Plus className="size-4" />}>Add Expense</Button>}
          />
        ) : (
          <div className="rounded-3xl card-elevated overflow-hidden">
            <div className="divide-y divide-white/5">
              {visible.map((e) => {
                const meta = CATEGORY_META[e.category];
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] group"
                  >
                    <CategoryIconBadge category={e.category} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-sm font-bold text-white truncate">{e.title}</h4>
                        <span
                          className={cn(
                            'text-sm font-bold shrink-0',
                            e.isGroupExpense() ? 'text-violet-300' : 'text-white',
                          )}
                        >
                          {formatVND(e.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-0.5">
                        <p className="text-xs text-slate-400 truncate">
                          {formatRelativeDate(e.expenseDate)} · {meta.label}
                          {e.note ? ` · ${e.note}` : ''}
                        </p>
                        {e.isGroupExpense() && <Badge variant="info">Group</Badge>}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal('expense_edit', { expense: e })}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id, e.title)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {/* mobile: tap row opens edit */}
                    <button
                      onClick={() => openModal('expense_edit', { expense: e })}
                      className="sm:hidden absolute inset-0"
                      aria-label="Edit expense"
                    />
                  </motion.div>
                );
              })}
            </div>

            {hasMore && (
              <div className="px-5 py-4 border-t border-white/5 text-center">
                <Button variant="ghost" onClick={() => setPage((p) => p + 1)}>
                  Show more · {filtered.length - visible.length} remaining
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => openModal('expense_form')}
        className="lg:hidden fixed bottom-20 right-5 z-30 size-14 rounded-full gradient-emerald shadow-2xl shadow-emerald-500/30 flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Add expense"
      >
        <Plus className="size-6 text-white" />
      </button>
    </div>
  );
}

void EXPENSE_CATEGORIES;
