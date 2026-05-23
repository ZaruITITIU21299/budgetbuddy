import { useEffect, useState } from 'react';
import { Sparkles, RefreshCcw, X, Lightbulb, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { AIInsightsRepo } from '@/lib/storage';
import { getAIClient } from '@/lib/ai';
import { useAuthStore } from '@/stores';
import { useMonthlySummary } from '@/hooks';
import { getCurrentMonthYear } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { useMonthlyHistory } from '@/hooks';
import type { AIInsightRow } from '@/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const TYPE_META = {
  spending_pattern: { Icon: TrendingUp, color: 'text-rose-300', label: 'Pattern' },
  budget_forecast: { Icon: AlertTriangle, color: 'text-amber-300', label: 'Forecast' },
  saving_tip: { Icon: Lightbulb, color: 'text-emerald-300', label: 'Tip' },
} as const;

interface AIInsightsPanelProps {
  className?: string;
}

export function AIInsightsPanel({ className }: AIInsightsPanelProps) {
  const session = useAuthStore((s) => s.session);
  const current = useMonthlySummary();
  const history = useMonthlyHistory(4);
  const [insights, setInsights] = useState<AIInsightRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void AIInsightsRepo.listForUser(session.userId).then((rows) => {
      if (!cancelled) setInsights(rows.slice(0, 3));
    });
    return () => { cancelled = true; };
  }, [session]);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const ai = getAIClient();
      const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
      const previous = history.find((h) => h.monthYear === lastMonth);
      const previousSummary = previous
        ? {
            monthYear: previous.monthYear,
            totalSpent: previous.totalSpent,
            totalBudget: 0,
            totalIncome: 0,
            byCategory: previous.byCategory as never,
            expenseCount: 0,
            avgPerDay: 0,
          }
        : undefined;
      const items = await ai.generateInsights({ current, previous: previousSummary });

      const existing = await AIInsightsRepo.listForUser(session.userId);
      await Promise.all(existing.map((old) => AIInsightsRepo.dismiss(old.id)));

      const newRows = await Promise.all(
        items.map((item) =>
          AIInsightsRepo.create({
            user_id: session.userId,
            insight: item.insight,
            insight_type: item.type,
            metadata: item.metadata,
          }),
        ),
      );
      setInsights(newRows);
      toast.success(`Generated ${newRows.length} fresh insight${newRows.length === 1 ? '' : 's'}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate insights.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = async (id: string) => {
    await AIInsightsRepo.dismiss(id);
    setInsights((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className={cn(
        'rounded-3xl p-6 border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/5 relative overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="size-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold leading-tight">AI Insights</h3>
            <p className="text-[11px] text-slate-400">
              Week of {format(new Date(), 'MMM d')} · {getCurrentMonthYear()}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
          aria-label="Refresh insights"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {insights.length === 0 && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-slate-400 p-4 rounded-2xl bg-white/5 border border-white/5"
            >
              Tap refresh to generate personalised tips from your latest activity.
            </motion.div>
          )}
          {insights.map((insight) => {
            const meta = TYPE_META[insight.insight_type];
            const Icon = meta.Icon;
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded-2xl bg-white/5 border border-white/5 relative group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('size-7 shrink-0 rounded-lg bg-white/5 flex items-center justify-center', meta.color)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('text-[10px] uppercase font-bold tracking-wider', meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mt-0.5 leading-relaxed">{insight.insight}</p>
                  </div>
                  <button
                    onClick={() => dismiss(insight.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    aria-label="Dismiss insight"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
