import type {
  BudgetPrediction,
  ExpenseCategory,
  InsightItem,
  MonthlyHistory,
  MonthlySummary,
  ParsedReceipt,
} from '@/types';
import type { AIClient, CategorizationResult } from './aiClient';
import { EXPENSE_CATEGORIES } from '@/types';
import { readFileAsBase64 } from '@/lib/utils';
import {
  BUDGET_FORECAST_PROMPT,
  CATEGORIZE_PROMPT,
  INSIGHTS_PROMPT,
  RECEIPT_PARSE_PROMPT,
  RECEIPT_VISION_PROMPT,
} from './prompts';

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/**
 * Real Google Gemini client. Opt-in via env (`VITE_USE_REAL_AI=true`).
 *
 * Model is configurable via `VITE_GEMINI_MODEL` (default: `gemini-2.5-flash`).
 * Note: `gemini-1.5-flash` was retired on the v1beta endpoint in 2026 — using
 * it will return a 404. Recommended values: `gemini-2.5-flash` (default),
 * `gemini-2.5-pro` (slower, smarter), `gemini-2.0-flash` (cheaper fallback).
 *
 * SECURITY: In a Vite SPA the API key ends up in the client bundle. This is
 * acceptable for local development / thesis demo, but production deployments
 * MUST proxy these calls through a backend. See DatabaseChange.md §3.
 */
export class GeminiAIClient implements AIClient {
  readonly name: string;
  private endpoint: string;

  constructor(private apiKey: string, model?: string) {
    const m =
      model ??
      (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ??
      'gemini-2.5-flash';
    this.name = m;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
  }

  async categorize(input: { title: string; amount: number; note?: string }): Promise<CategorizationResult> {
    const json = await this.call([
      { text: `${CATEGORIZE_PROMPT}\n\nInput:\n${JSON.stringify(input)}` },
    ]);
    const parsed = safeJSONParse<{ category: string; confidence: number; reasoning: string }>(json);
    const cat = (parsed?.category ?? 'other') as ExpenseCategory;
    return {
      category: (EXPENSE_CATEGORIES as readonly string[]).includes(cat) ? cat : 'other',
      confidence: Math.max(0, Math.min(parsed?.confidence ?? 0.5, 1)),
      reasoning: parsed?.reasoning ?? '',
    };
  }

  async generateInsights(input: { current: MonthlySummary; previous?: MonthlySummary }): Promise<InsightItem[]> {
    const json = await this.call([{ text: `${INSIGHTS_PROMPT}\n\nData:\n${JSON.stringify(input)}` }]);
    const parsed = safeJSONParse<InsightItem[]>(json);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  }

  async predictMonthlyBudget(input: {
    history: MonthlyHistory[];
    currentMonth: MonthlySummary;
    daysElapsed: number;
    daysInMonth: number;
  }): Promise<BudgetPrediction> {
    const json = await this.call([{ text: `${BUDGET_FORECAST_PROMPT}\n\nData:\n${JSON.stringify(input)}` }]);
    const parsed = safeJSONParse<BudgetPrediction>(json);
    return (
      parsed ?? {
        predictedTotal: input.currentMonth.totalSpent,
        confidence: 0.3,
        reasoning: 'Fallback: failed to parse Gemini response.',
      }
    );
  }

  async parseReceiptText(ocrText: string): Promise<ParsedReceipt> {
    const json = await this.call([{ text: `${RECEIPT_PARSE_PROMPT}\n\nReceipt OCR:\n${ocrText}` }]);
    const parsed = safeJSONParse<ParsedReceipt>(json);
    return normalizeParsedReceipt(parsed);
  }

  async parseReceiptImage(file: File): Promise<ParsedReceipt> {
    const data = await readFileAsBase64(file);
    // Gemini accepts image/* and application/pdf via inline_data.
    const mimeType = file.type || 'image/jpeg';
    const json = await this.call([
      { text: RECEIPT_VISION_PROMPT },
      { inline_data: { mime_type: mimeType, data } },
    ]);
    const parsed = safeJSONParse<ParsedReceipt>(json);
    return normalizeParsedReceipt(parsed);
  }

  private async call(parts: GeminiPart[]): Promise<string> {
    const res = await fetch(`${this.endpoint}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { response_mime_type: 'application/json', temperature: 0.2 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini call failed (${res.status}): ${errText}`);
    }
    const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }
}

function normalizeParsedReceipt(parsed: unknown): ParsedReceipt {
  const empty: ParsedReceipt = {
    merchant: null,
    date: null,
    total: null,
    items: [],
    categoryHint: null,
  };
  if (!parsed || typeof parsed !== 'object') return empty;

  // Accept both `categoryHint` (camelCase) and `category_hint` (snake_case)
  // since prompts have shipped with both at various points.
  const obj = parsed as Record<string, unknown> & {
    items?: Array<{ name?: unknown; price?: unknown }>;
  };
  const hintRaw = (obj['categoryHint'] ?? obj['category_hint']) as string | null | undefined;
  const hint =
    hintRaw && (EXPENSE_CATEGORIES as readonly string[]).includes(hintRaw)
      ? (hintRaw as ExpenseCategory)
      : null;

  const items = Array.isArray(obj.items)
    ? obj.items
        .map((it) => ({
          name: typeof it.name === 'string' ? it.name : '',
          price: typeof it.price === 'number' ? it.price : Number(it.price) || 0,
        }))
        .filter((it) => it.name && it.price > 0)
        .slice(0, 20)
    : [];

  return {
    merchant: typeof obj.merchant === 'string' ? obj.merchant : null,
    date: typeof obj.date === 'string' ? obj.date : null,
    total: typeof obj.total === 'number' ? obj.total : null,
    items,
    categoryHint: hint,
  };
}

function safeJSONParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    // Try to extract first JSON object/array from the string
    const match = value.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
