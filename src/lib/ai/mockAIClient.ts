import type {
  BudgetPrediction,
  ExpenseCategory,
  InsightItem,
  MonthlyHistory,
  MonthlySummary,
  ParsedReceipt,
} from '@/types';
import type { AIClient, CategorizationResult } from './aiClient';
import { formatVND } from '@/lib/utils';
import { runOCR } from './ocr';

/**
 * Deterministic keyword-based AI. Designed so that thesis evaluation has a
 * stable baseline and the demo never depends on a live API quota.
 *
 * Keywords are tuned for Vietnamese student spending patterns.
 */

interface CategoryKeyword {
  category: ExpenseCategory;
  keywords: string[];
  baseConfidence: number;
}

const CATEGORY_KEYWORDS: CategoryKeyword[] = [
  {
    category: 'food_drink',
    keywords: ['bún', 'phở', 'cơm', 'bánh', 'trà sữa', 'cafe', 'cà phê', 'highlands', 'starbucks', 'bún bò',
      'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'food', 'restaurant', 'meal', 'eat', 'snack',
      'grab food', 'shopee food', 'baemin', 'be food', 'milk tea', 'gong cha', 'tocotoco', 'phúc long',
      'kfc', 'mcdonald', 'lotteria', 'jollibee', 'cơm tấm', 'phở 24', 'bún chả'],
    baseConfidence: 0.92,
  },
  {
    category: 'transport',
    keywords: ['grab', 'gojek', 'be', 'xe ôm', 'xăng', 'taxi', 'bus', 'metro', 'uber', 'fuel',
      'parking', 'gửi xe', 'vé xe', 'train', 'flight', 'fare', 'transport', 'commute'],
    baseConfidence: 0.9,
  },
  {
    category: 'housing',
    keywords: ['rent', 'tiền trọ', 'tiền nhà', 'tiền phòng', 'dorm', 'ký túc xá', 'ktx', 'deposit', 'thuê nhà'],
    baseConfidence: 0.94,
  },
  {
    category: 'utilities',
    keywords: ['điện', 'nước', 'wifi', 'internet', 'mạng', 'gas', 'electricity', 'water', 'bill',
      'mobile data', '4g', '5g', 'viettel', 'vinaphone', 'mobifone'],
    baseConfidence: 0.9,
  },
  {
    category: 'education',
    keywords: ['học phí', 'tuition', 'textbook', 'sách', 'course', 'class', 'lecture', 'tutor',
      'gia sư', 'tiếng anh', 'ielts', 'toeic', 'udemy', 'coursera', 'school', 'university', 'pen',
      'notebook', 'photocopy', 'stationery'],
    baseConfidence: 0.93,
  },
  {
    category: 'health',
    keywords: ['thuốc', 'pharmacy', 'bác sĩ', 'doctor', 'clinic', 'bệnh viện', 'hospital', 'gym',
      'fitness', 'yoga', 'medicine', 'dental', 'eye', 'health', 'insurance', 'masage', 'massage'],
    baseConfidence: 0.91,
  },
  {
    category: 'entertainment',
    keywords: ['cinema', 'cgv', 'lotte', 'galaxy cinema', 'movie', 'phim', 'spotify', 'netflix',
      'youtube premium', 'game', 'concert', 'karaoke', 'beer', 'bia', 'pub', 'club', 'party'],
    baseConfidence: 0.9,
  },
  {
    category: 'shopping',
    keywords: ['shopee', 'lazada', 'tiki', 'sendo', 'amazon', 'zara', 'h&m', 'uniqlo', 'clothes',
      'quần áo', 'giày', 'shoes', 'bag', 'túi', 'mua sắm', 'shopping', 'gift'],
    baseConfidence: 0.88,
  },
  {
    category: 'personal_care',
    keywords: ['haircut', 'cắt tóc', 'salon', 'spa', 'cosmetic', 'skincare', 'makeup', 'shampoo',
      'soap', 'toothpaste', 'mỹ phẩm', 'guardian', 'medicare'],
    baseConfidence: 0.89,
  },
  {
    category: 'travel',
    keywords: ['vietjet', 'vietnam airlines', 'bamboo', 'hotel', 'khách sạn', 'airbnb', 'booking',
      'agoda', 'trip', 'travel', 'tour', 'beach', 'mountain', 'đà lạt', 'phú quốc', 'sapa', 'hạ long'],
    baseConfidence: 0.91,
  },
  {
    category: 'savings',
    keywords: ['savings', 'tiết kiệm', 'deposit', 'investment', 'stock', 'chứng khoán', 'bitcoin',
      'crypto', 'gold', 'vàng', 'bond'],
    baseConfidence: 0.93,
  },
];

export class MockAIClient implements AIClient {
  readonly name = 'mock';

  async categorize(input: { title: string; amount: number; note?: string }): Promise<CategorizationResult> {
    await this.delay(180);

    const haystack = `${input.title} ${input.note ?? ''}`.toLowerCase();
    let best: { category: ExpenseCategory; confidence: number; matched: string } = {
      category: 'other',
      confidence: 0.4,
      matched: '',
    };

    for (const meta of CATEGORY_KEYWORDS) {
      for (const kw of meta.keywords) {
        if (haystack.includes(kw)) {
          // Longer keyword match → slightly higher confidence
          const confidence = Math.min(meta.baseConfidence + Math.min(kw.length / 100, 0.06), 0.98);
          if (confidence > best.confidence) {
            best = { category: meta.category, confidence, matched: kw };
          }
        }
      }
    }

    // Amount-based fallback heuristic for "other"
    if (best.category === 'other' && input.amount >= 1_000_000) {
      best = { category: 'housing', confidence: 0.55, matched: 'amount-heuristic' };
    }

    return {
      category: best.category,
      confidence: best.confidence,
      reasoning: best.matched
        ? `Matched keyword "${best.matched}" in title/note.`
        : 'No strong keyword match; defaulting to "other".',
    };
  }

  async generateInsights(input: { current: MonthlySummary; previous?: MonthlySummary }): Promise<InsightItem[]> {
    await this.delay(220);
    const insights: InsightItem[] = [];
    const { current, previous } = input;

    // 1. Compare top category vs last month
    const sortedCats = (Object.entries(current.byCategory) as Array<[ExpenseCategory, number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    if (previous && sortedCats.length > 0) {
      const [topCat, topAmount] = sortedCats[0];
      const prev = previous.byCategory[topCat] ?? 0;
      if (prev > 0) {
        const diff = (topAmount - prev) / prev;
        if (Math.abs(diff) > 0.15) {
          const direction = diff > 0 ? 'more' : 'less';
          const pct = Math.round(Math.abs(diff) * 100);
          insights.push({
            type: 'spending_pattern',
            insight: `You spent ${pct}% ${direction} on ${humanize(topCat)} this month compared to last month.`,
            metadata: { category: topCat, change_pct: diff },
          });
        }
      }
    }

    // 2. Budget forecast vs limit
    if (current.totalBudget > 0) {
      const usage = current.totalSpent / current.totalBudget;
      if (usage > 0.8) {
        insights.push({
          type: 'budget_forecast',
          insight: `You have used ${Math.round(usage * 100)}% of your monthly budget. Consider slowing down on discretionary spending.`,
          metadata: { usage },
        });
      } else if (usage < 0.4 && current.expenseCount > 5) {
        insights.push({
          type: 'saving_tip',
          insight: `Great pace! You're on track to save about ${formatVND(current.totalBudget - current.totalSpent)} this month.`,
          metadata: { usage },
        });
      }
    }

    // 3. Saving tip on top category
    if (sortedCats.length > 0) {
      const [topCat] = sortedCats[0];
      const tip = SAVING_TIPS[topCat];
      if (tip) insights.push({ type: 'saving_tip', insight: tip, metadata: { category: topCat } });
    }

    // Fallback if nothing was generated
    if (insights.length === 0) {
      insights.push({
        type: 'saving_tip',
        insight: 'Add a few more expenses this week and the AI coach will surface personalised tips.',
      });
    }

    return insights.slice(0, 3);
  }

  async predictMonthlyBudget(input: {
    history: MonthlyHistory[];
    currentMonth: MonthlySummary;
    daysElapsed: number;
    daysInMonth: number;
  }): Promise<BudgetPrediction> {
    await this.delay(140);

    const dailyAvg = input.daysElapsed > 0 ? input.currentMonth.totalSpent / input.daysElapsed : 0;
    const projected = Math.round(dailyAvg * input.daysInMonth);

    // Blend with historical mean for stability
    const histAvg =
      input.history.length > 0
        ? input.history.reduce((s, h) => s + h.totalSpent, 0) / input.history.length
        : projected;

    const blended = Math.round(projected * 0.7 + histAvg * 0.3);
    const confidence = Math.min(0.4 + input.daysElapsed / input.daysInMonth * 0.5, 0.95);

    return {
      predictedTotal: blended,
      confidence,
      reasoning: `Based on a daily average of ${formatVND(Math.round(dailyAvg))} over the first ${input.daysElapsed} day(s), blended with last ${input.history.length} month(s) of history.`,
    };
  }

  /**
   * Mock vision call — runs the mock OCR pipeline and then the text parser.
   * Lets `ReceiptScannerModal` always call `parseReceiptImage(file)` without
   * branching on the active client.
   */
  async parseReceiptImage(file: File): Promise<ParsedReceipt> {
    const text = await runOCR(file);
    return this.parseReceiptText(text);
  }

  async parseReceiptText(ocrText: string): Promise<ParsedReceipt> {
    await this.delay(160);

    const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
    const merchant = lines[0] ?? null;

    let total: number | null = null;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('tổng') || lower.includes('total') || lower.includes('thành tiền')) {
        const digits = line.replace(/[^\d]/g, '');
        if (digits) {
          total = parseInt(digits, 10);
          break;
        }
      }
    }

    const dateMatch = ocrText.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    let date: string | null = null;
    if (dateMatch) {
      const [, d, m, y] = dateMatch;
      const yyyy = y.length === 2 ? `20${y}` : y;
      date = `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const items: Array<{ name: string; price: number }> = [];
    for (const line of lines) {
      const m = line.match(/^(.+?)\s+(\d{1,3}(?:[.,]\d{3})+|\d{4,})\s*₫?$/);
      if (m) {
        const price = parseInt(m[2].replace(/[^\d]/g, ''), 10);
        if (price > 0 && price < 50_000_000) {
          items.push({ name: m[1].trim(), price });
        }
      }
    }

    const categoryHint = inferCategoryHintFromText(ocrText.toLowerCase());
    return { merchant, date, total, items, categoryHint };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}

function humanize(category: ExpenseCategory): string {
  return category.replace(/_/g, ' & ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferCategoryHintFromText(text: string): ExpenseCategory | null {
  for (const meta of CATEGORY_KEYWORDS) {
    if (meta.keywords.some((k) => text.includes(k))) return meta.category;
  }
  return null;
}

const SAVING_TIPS: Partial<Record<ExpenseCategory, string>> = {
  food_drink: 'Try cooking lunch at home 2 days a week — students typically save 20–30% on food this way.',
  transport: 'A monthly bus pass in HCMC or Hanoi often costs less than 10 Grab rides — worth comparing.',
  entertainment: 'Many cinemas offer a Wednesday student discount (sometimes 30% off).',
  shopping: 'Wait 24 hours before any Shopee/Lazada purchase over 500.000 ₫ — most impulse buys disappear.',
  housing: 'Splitting a 3-person room vs renting a studio can cut housing costs in half.',
  utilities: 'A timed shower and LED bulbs can shave 100–200K ₫ off your monthly utility bill.',
  travel: 'Book domestic flights 6–8 weeks in advance — Vietjet routes are typically cheapest then.',
};
