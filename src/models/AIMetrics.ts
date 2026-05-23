/**
 * AI quality metrics for the thesis appendix.
 *
 * Stores raw (predicted, actual) pairs for category prediction and budget
 * forecasts, then computes precision / recall / F1 per category, macro-F1,
 * and Mean Absolute Error for budget forecasts.
 */

export interface CategorizationSample {
  predicted: string;
  actual: string;
}

export interface BudgetForecastSample {
  predicted: number;
  actual: number;
}

export interface CategoryMetric {
  category: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export class AIMetrics {
  private categorizations: CategorizationSample[] = [];
  private budgetForecasts: BudgetForecastSample[] = [];
  private ocrSamples: Array<{ predictedTotal: number | null; actualTotal: number; matched: boolean }> = [];

  recordCategorization(predicted: string, actual: string): void {
    this.categorizations.push({ predicted, actual });
  }

  loadCategorizations(samples: CategorizationSample[]): void {
    this.categorizations = [...samples];
  }

  recordBudgetForecast(predicted: number, actual: number): void {
    this.budgetForecasts.push({ predicted, actual });
  }

  loadBudgetForecasts(samples: BudgetForecastSample[]): void {
    this.budgetForecasts = [...samples];
  }

  recordOCR(predictedTotal: number | null, actualTotal: number): void {
    this.ocrSamples.push({
      predictedTotal,
      actualTotal,
      matched: predictedTotal !== null && Math.abs(predictedTotal - actualTotal) < 1,
    });
  }

  getPrecision(category: string): number {
    const tp = this.categorizations.filter((s) => s.predicted === category && s.actual === category).length;
    const fp = this.categorizations.filter((s) => s.predicted === category && s.actual !== category).length;
    return tp + fp === 0 ? 0 : tp / (tp + fp);
  }

  getRecall(category: string): number {
    const tp = this.categorizations.filter((s) => s.predicted === category && s.actual === category).length;
    const fn = this.categorizations.filter((s) => s.predicted !== category && s.actual === category).length;
    return tp + fn === 0 ? 0 : tp / (tp + fn);
  }

  getF1Score(category: string): number {
    const p = this.getPrecision(category);
    const r = this.getRecall(category);
    return p + r === 0 ? 0 : (2 * p * r) / (p + r);
  }

  getSupport(category: string): number {
    return this.categorizations.filter((s) => s.actual === category).length;
  }

  getCategoryMetrics(): CategoryMetric[] {
    const cats = new Set<string>();
    for (const s of this.categorizations) {
      cats.add(s.actual);
      cats.add(s.predicted);
    }
    return Array.from(cats)
      .sort()
      .map((c) => ({
        category: c,
        precision: this.getPrecision(c),
        recall: this.getRecall(c),
        f1: this.getF1Score(c),
        support: this.getSupport(c),
      }));
  }

  getMacroF1(): number {
    const metrics = this.getCategoryMetrics();
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.f1, 0);
    return sum / metrics.length;
  }

  getAccuracy(): number {
    if (this.categorizations.length === 0) return 0;
    const correct = this.categorizations.filter((s) => s.predicted === s.actual).length;
    return correct / this.categorizations.length;
  }

  getMAE(): number {
    if (this.budgetForecasts.length === 0) return 0;
    const sum = this.budgetForecasts.reduce((acc, s) => acc + Math.abs(s.predicted - s.actual), 0);
    return sum / this.budgetForecasts.length;
  }

  getMAPE(): number {
    if (this.budgetForecasts.length === 0) return 0;
    const sum = this.budgetForecasts.reduce((acc, s) => {
      if (s.actual === 0) return acc;
      return acc + Math.abs(s.predicted - s.actual) / s.actual;
    }, 0);
    return sum / this.budgetForecasts.length;
  }

  getOCRAccuracy(): number {
    if (this.ocrSamples.length === 0) return 0;
    return this.ocrSamples.filter((s) => s.matched).length / this.ocrSamples.length;
  }

  exportMetricsReport(): Record<string, unknown> {
    return {
      generated_at: new Date().toISOString(),
      categorization: {
        sample_count: this.categorizations.length,
        accuracy: this.getAccuracy(),
        macro_f1: this.getMacroF1(),
        per_category: this.getCategoryMetrics(),
      },
      budget_forecast: {
        sample_count: this.budgetForecasts.length,
        mae_vnd: this.getMAE(),
        mape: this.getMAPE(),
      },
      ocr: {
        sample_count: this.ocrSamples.length,
        accuracy: this.getOCRAccuracy(),
      },
    };
  }
}
