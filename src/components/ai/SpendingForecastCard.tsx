import { useEffect, useState } from 'react';
import { Brain, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { getAIClient } from '@/lib/ai';
import { useBudgetCalculator, useMonthlyHistory, useMonthlySummary } from '@/hooks';
import { formatVND, formatPercentage } from '@/lib/utils';
import { differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BudgetPrediction } from '@/types';

interface SpendingForecastCardProps {
  className?: string;
}

export function SpendingForecastCard({ className }: SpendingForecastCardProps) {
  const calc = useBudgetCalculator();
  const summary = useMonthlySummary();
  const history = useMonthlyHistory(6);
  const [prediction, setPrediction] = useState<BudgetPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple local forecast always available immediately
  const localForecast = calc.forecastMonthEndTotal();
  const overBudget = summary.totalBudget > 0 && localForecast > summary.totalBudget;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const totalDays = differenceInCalendarDays(end, start) + 1;
    const daysElapsed = Math.max(differenceInCalendarDays(new Date(), start) + 1, 1);

    getAIClient()
      .predictMonthlyBudget({
        history: history.slice(0, -1),
        currentMonth: summary,
        daysElapsed,
        daysInMonth: totalDays,
      })
      .then((res) => {
        if (!cancelled) setPrediction(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.totalSpent, summary.expenseCount, history.length]);

  const display = prediction ?? { predictedTotal: localForecast, confidence: 0.5, reasoning: 'Local linear forecast.' };

  return (
    <div
      className={cn(
        'rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-sky-500/10 to-transparent relative overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="size-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
          <Brain className="size-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-white font-bold leading-tight">Forecast</h3>
          <p className="text-[11px] text-slate-400">Month-end projected total</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {formatVND(display.predictedTotal, { compact: true })}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Currently {formatVND(summary.totalSpent, { compact: true })} spent
          </p>
        </div>
        <div className={cn('text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5',
          overBudget ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300')}>
          {overBudget ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {summary.totalBudget > 0
            ? `${Math.round((display.predictedTotal / summary.totalBudget) * 100)}% of budget`
            : 'no budget'}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px]">
        {loading ? (
          <span className="flex items-center gap-1.5 text-slate-400">
            <Loader2 className="size-3 animate-spin" />
            Refining via {getAIClient().name}…
          </span>
        ) : (
          <span className="text-slate-500">
            Confidence {formatPercentage(display.confidence)} · {display.reasoning}
          </span>
        )}
      </div>
    </div>
  );
}
