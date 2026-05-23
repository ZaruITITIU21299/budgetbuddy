# BudgetBuddy

> **Smart Expense Tracker for Vietnamese University Students**
> Pre-Thesis project — Vietnam National University HCMC · International University
> Student: Nguyễn Thành Tài · Supervisor: MSc. Le Thanh Son

A Progressive Web App that helps Vietnamese university students track personal spending,
split bills with roommates, and get AI-powered insights — all in VND, mobile-first,
and runnable entirely on your laptop (no cloud account required).

---

## ✨ Highlights

- **5 main views** — Dashboard, Expenses, Groups, Reports, Profile, plus a hidden Metrics view for thesis evaluation
- **AI auto-categorization** of expenses (keyword-based mock or real Google Gemini 1.5 Flash if a key is provided)
- **Receipt scanner** with mock OCR + structured field extraction (merchant, date, total, line items)
- **Smart bill splitting** (equal / percentage / exact / shares) with **debt-simplification algorithm** to minimise pay-back transactions
- **Budget limits per category** with on-add alert triggers (replaces the Supabase `check_budget_on_expense` trigger)
- **Spending forecasts** via linear projection blended with historical mean
- **AI Insights** generated weekly from real spending patterns vs last month
- **PWA installable** on Android / iOS with full offline support
- **Dual-mode storage** — runs against your own **Supabase** (Auth + Postgres + Storage + Realtime) when env vars are set, falls back to a `localStorage` demo otherwise. Same UI, same code paths
- **Multi-tab realtime sync** via Supabase Realtime (or `BroadcastChannel` in local mode)
- **Mobile bottom-nav + desktop sidebar** layout that adapts at 768 px
- **OOP business-logic models** (`Expense`, `Group`, `BudgetCalculator`, `SplitCalculator`, `AIMetrics`) — single source of truth for math + formatting
- **AI metrics page** at Profile → AI Metrics — Precision / Recall / F1 per category, MAE for forecasts, OCR accuracy
- **CSV + PDF export** with date range and scope filtering

---

## 🏛 Architecture

```text
src/
├── App.tsx                 # root, view router, modal host
├── main.tsx
├── index.css               # tailwind v4 + design tokens
├── components/
│   ├── ui/                 # Button, Input, Modal, Card, ProgressBar, …
│   ├── charts/             # Recharts wrappers (Area/Line/Bar/Pie)
│   ├── ai/                 # AIInsightsPanel, SpendingForecastCard
│   ├── expense/            # ExpenseForm, BudgetProgressBar, ReceiptScannerModal, ExportModal, MonthlyBudgetSetup
│   ├── group/              # GroupCreateModal, GroupJoinModal, GroupInviteModal, GroupSettleUpModal
│   ├── layout/             # Sidebar (desktop), MobileBottomNav, NotificationBell, OfflineBanner, ErrorBoundary, OnboardingFlow
│   ├── DashboardView.tsx
│   ├── ExpensesView.tsx
│   ├── GroupsView.tsx
│   ├── ReportsView.tsx
│   ├── ProfileView.tsx
│   ├── MetricsView.tsx
│   └── LoginView.tsx
├── models/                 # OOP domain models (Expense, Group, BudgetCalculator, SplitCalculator, AIMetrics)
├── stores/                 # Zustand stores (auth, expense, group, budget, notification, ui)
├── hooks/                  # useBudgetCalculator, useMonthlySummary, useGroupBalances, useRealtime, useOnlineStatus, useMediaQuery
├── lib/
│   ├── ai/                 # AIClient interface, MockAIClient (default), GeminiAIClient (opt-in), prompts, OCR
│   ├── storage/            # localStorage repository layer (mirrors Supabase schema 1:1)
│   ├── realtime/           # BroadcastChannel bus (mirrors Supabase Realtime API)
│   ├── services/           # budgetAlerts (the trigger), seed (demo data)
│   ├── validation/         # Zod schemas
│   └── utils/              # cn, formatVND, dates, file validation, hashing
├── constants/categories.ts # Category icons + colors
└── types/index.ts          # Type definitions matching DB row shapes
```

See **[`../DatabaseChange.md`](../DatabaseChange.md)** at the repository root for every database / backend deviation
from the original Supabase spec and instructions on how to migrate back to real Supabase later.

---

## 🚀 Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. On the login screen, click **"Continue as Demo User"** — it seeds
a fully-populated account with 25+ realistic VND expenses, two groups, budget limits, and AI insights.

Or register a fresh account with any email + password (≥ 6 chars).

### Default demo credentials

| Email                       | Password   |
| --------------------------- | ---------- |
| `minh.demo@hcmiu.edu.vn`    | `demo1234` |

### Scripts

```bash
npm run dev        # vite dev server on :5173 with HMR
npm run build      # tsc -b + vite build → ./dist
npm run preview    # serve the built bundle
npm run lint       # eslint
```

### Environment variables (optional)

Copy `.env.local.example` to `.env.local` (Vite ONLY reads `.env.local`, not the example):

```env
# --- Use real Gemini AI instead of the deterministic mock ---
VITE_USE_REAL_AI=true
VITE_GEMINI_API_KEY=AIzaSy...your-key-here

# --- Use your own Supabase project ---
# Run supabase/schema.sql in your project first, then fill these in.
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

VITE_APP_URL=http://localhost:5173
```

> When `VITE_USE_REAL_AI=false` (default), every AI call is handled locally by `MockAIClient` —
> no network, no API quota, deterministic results suitable for thesis evaluation.

> When both Supabase env vars are absent the app uses a `localStorage`-only mode (visible as
> a "Local" badge on the login screen + profile). Set both variables and restart `npm run dev`
> to switch to your Supabase project (badge becomes "Supabase"). The first sign-up creates a
> row in `auth.users` and the `handle_new_user` trigger populates `profiles` automatically.

> ⚠️ **Email confirmation**: by default a new Supabase project requires email verification on
> sign-up. For the demo, disable it at *Authentication → Settings → Email Auth → "Confirm email"*
> (off). Otherwise the demo button will instruct you to confirm by email first.

---

## 🧠 OOP business logic

The five model classes hold every business rule. Components stay dumb.

| Class                | Responsibility                                                                       |
| -------------------- | ------------------------------------------------------------------------------------ |
| `Expense`            | Domain object · `formatAmount()` · `isGroupExpense()` · `monthYear()` · row mapping  |
| `Group`              | Members · `isAdmin()` · invite link generation                                       |
| `BudgetCalculator`   | Spent vs limit per category · usage % · forecast (linear) · risk ranking             |
| `SplitCalculator`    | Equal / pct / exact / shares splits · **`simplifyDebts()` greedy algorithm**         |
| `AIMetrics`          | Precision / Recall / F1 per category · macro-F1 · MAE / MAPE for forecasts · export  |

Each is fully unit-testable in isolation (no React, no Zustand, no DOM).

---

## 🤖 AI architecture

```
ExpenseForm  ──┐
ReceiptModal ──┼──▶  getAIClient()  ──▶  { MockAIClient | GeminiAIClient }
InsightsPanel ─┘                          (chosen at boot via VITE env)
```

`AIClient` is a single interface with four methods:

- `categorize(input)` — keyword-based local OR Gemini JSON-mode
- `generateInsights(input)` — pattern detection vs last month, saving tips
- `predictMonthlyBudget(input)` — linear forecast blended with 3-month history
- `parseReceiptText(text)` — extract merchant / date / total / items from OCR output

The current build defaults to the **mock client**. To use real Gemini, set both
`VITE_USE_REAL_AI=true` AND `VITE_GEMINI_API_KEY` in `.env.local`.

> ⚠️ The Gemini client calls the API directly from the browser, which exposes your key.
> Fine for local development / thesis demos; for production proxy via a backend.

---

## 📊 Thesis-evaluation metrics

The Profile page exposes an **AI Metrics** dashboard that computes:

- **Categorization** — Accuracy, Macro-F1, plus per-category Precision/Recall/F1/Support
- **Budget forecast** — MAE (VND) and MAPE (%) across all month-pairs available
- **OCR** — % of receipts where the predicted total matched the user-confirmed total

Every time a user **changes the category** suggested by the AI in `ExpenseForm`, the original
prediction is logged to the `ai_feedback` table (kept in localStorage). The metrics
page re-computes all numbers live and lets you download a JSON report for your appendix.

---

## 🗄️ Data layer

The storage layer is **dual-mode** — the same `*Repo` API drives either a Supabase project
or a `localStorage` mock, picked at module load time:

```
src/lib/storage/
├── index.ts             ← picks the backend, re-exports
├── localRepos.ts        ← localStorage (offline demo)
├── supabaseRepos.ts     ← @supabase/supabase-js
├── jsonTable.ts         ← local engine
└── ...

src/lib/supabase/
└── client.ts            ← singleton + isSupabaseEnabled()
```

Both implementations expose the same async signatures:
`.list*()`, `.get()`, `.create()`, `.update()`, `.remove()`. Consumers (`stores`, `hooks`,
`components`) only import from `@/lib/storage` and never need to know which backend is active.

### Schema setup for Supabase mode

1. Paste `supabase/schema.sql` into your Supabase SQL Editor and run it (idempotent).
   It creates all 13 tables, RLS policies, views, triggers, the `receipts` + `avatars`
   storage buckets, the `join_group_by_code` RPC, and the realtime publications.
2. (Optional) Disable email confirmation in *Authentication → Settings* for instant demos.
3. Copy your URL + anon key to `.env.local`.
4. Restart `npm run dev` and watch the login badge flip from **Local** → **Supabase**.

See **[`../DatabaseChange.md`](../DatabaseChange.md)** for the full deviation log, schema
additions (income tracking, rollover budgets, currency code), and per-file responsibilities.

---

## 📱 PWA

- `public/manifest.json` declares the standalone display, theme color, icons.
- Installable on Android / iOS via the browser "Add to Home Screen" prompt.
- Bottom navigation appears automatically on screens narrower than `lg` (1024 px).
- Camera capture for receipts uses `<input type="file" capture="environment">`.
- All data lives on-device — works fully offline. An amber banner appears when the network goes down.

---

## 🎨 Design system

- **Font**: Be Vietnam Pro (designed for Vietnamese diacritics) with Plus Jakarta Sans fallback.
- **Palette**: Deep navy (`#060B1B`) background · Emerald (`#10B981`) accent for positive · Rose (`#F43F5E`) for negative · Amber (`#F59E0B`) for warnings · Sky (`#0EA5E9`) for info · Violet (`#8B5CF6`) for AI features.
- **Currency formatter** — `1.250.000 ₫` (dot-separated, Vietnamese convention).
- **Icons**: lucide-react throughout (tree-shaken).
- **Charts**: Recharts (Area / Line / Bar / Pie).
- **Animations**: Motion (framer-motion successor) for transitions.

---

## 🧪 Reset the demo

Profile → Reset All Data wipes:

- **Local mode**: every `bb:db:*` key in `localStorage`.
- **Supabase mode**: every row in Postgres owned by the current user (RLS-scoped). The
  `auth.users` row itself is not deleted — sign out + sign in again or use the
  Supabase dashboard to drop the user.

---

## 📦 Stack

| Tool          | Version | Use                                       |
| ------------- | ------- | ----------------------------------------- |
| React         | 19      | UI                                        |
| TypeScript    | 5.9     | Type safety                                |
| Vite          | 7       | Dev server + build                         |
| Tailwind CSS  | 4       | Utility-first styling                      |
| Zustand       | latest  | Global state                               |
| Zod           | latest  | Form + API validation                      |
| Recharts      | 3       | Charts                                     |
| lucide-react  | latest  | Icons                                      |
| Motion        | 12      | Animations                                 |
| react-hot-toast | latest | Toast notifications                      |
| date-fns      | latest  | Date utilities                             |
| @supabase/supabase-js | 2 | Postgres + Auth + Storage + Realtime client |

---

## 📄 License

Built as an academic project for IU-VNU HCMC. Code is for thesis / educational use.
