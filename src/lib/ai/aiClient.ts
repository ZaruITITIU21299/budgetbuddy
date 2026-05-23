import type {
  BudgetPrediction,
  ExpenseCategory,
  InsightItem,
  MonthlyHistory,
  MonthlySummary,
  ParsedReceipt,
} from '@/types';

export interface CategorizationResult {
  category: ExpenseCategory;
  confidence: number;
  reasoning: string;
}

/**
 * Pluggable AI client interface. Two implementations:
 *  - MockAIClient (deterministic, keyword-based, free, default)
 *  - GeminiAIClient (real Google Gemini, opt-in via env)
 */
export interface AIClient {
  readonly name: string;

  categorize(input: { title: string; amount: number; note?: string }): Promise<CategorizationResult>;
  generateInsights(input: { current: MonthlySummary; previous?: MonthlySummary }): Promise<InsightItem[]>;
  predictMonthlyBudget(input: { history: MonthlyHistory[]; currentMonth: MonthlySummary; daysElapsed: number; daysInMonth: number }): Promise<BudgetPrediction>;
  parseReceiptText(ocrText: string): Promise<ParsedReceipt>;
  /**
   * Extract structured receipt fields directly from an image/PDF file using a
   * vision-capable model. Avoids the OCR → text-parse round trip.
   */
  parseReceiptImage(file: File): Promise<ParsedReceipt>;
}
