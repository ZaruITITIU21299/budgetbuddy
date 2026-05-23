import { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Modal, Button, Input, Select, Badge } from '@/components/ui';
import { useAuthStore, useExpenseStore, useUIStore } from '@/stores';
import { format, startOfMonth } from 'date-fns';
import { CATEGORY_META } from '@/constants/categories';
import { formatVND } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ExportModal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const session = useAuthStore((s) => s.session);
  const allExpenses = useExpenseStore((s) => s.expenses);

  const [fromDate, setFromDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [scope, setScope] = useState<'all' | 'personal' | 'group'>('all');

  const expenses = useMemo(() => {
    return allExpenses
      .filter((e) => e.expenseDate >= new Date(fromDate) && e.expenseDate <= new Date(toDate + 'T23:59:59'))
      .filter((e) => (scope === 'all' ? true : scope === 'personal' ? !e.isGroupExpense() : e.isGroupExpense()));
  }, [allExpenses, fromDate, toDate, scope]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  if (modal !== 'export_modal' || !session) return null;

  const exportCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount (VND)', 'Note', 'Group'];
    const rows = expenses.map((e) => [
      format(e.expenseDate, 'yyyy-MM-dd'),
      escapeCSV(e.title),
      CATEGORY_META[e.category].label,
      e.amount,
      escapeCSV(e.note ?? ''),
      e.isGroupExpense() ? 'group' : 'personal',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgetbuddy-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const exportPDF = () => {
    // Use the browser's print dialog with a special stylesheet.
    // Users pick "Save as PDF" as destination.
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      toast.error('Pop-up blocked. Allow pop-ups to export PDF.');
      return;
    }
    win.document.write(buildPrintHTML({
      fromDate,
      toDate,
      userName: session.fullName,
      expenses: expenses.map((e) => ({
        date: format(e.expenseDate, 'MMM d, yyyy'),
        title: e.title,
        category: CATEGORY_META[e.category].label,
        amount: e.amount,
        note: e.note ?? '',
        isGroup: e.isGroupExpense(),
      })),
      total,
    }));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <Modal
      open
      onClose={close}
      title="Export Report"
      subtitle="Generate a CSV file or print-ready PDF report."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button variant="secondary" leftIcon={<Printer className="size-4" />} onClick={exportPDF}>PDF</Button>
          <Button leftIcon={<Download className="size-4" />} onClick={exportCSV}>CSV</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <Select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
          <option value="all">All expenses</option>
          <option value="personal">Personal only</option>
          <option value="group">Group only</option>
        </Select>

        <div className="rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileText className="size-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{expenses.length} expense{expenses.length === 1 ? '' : 's'} match</p>
              <p className="text-xs text-slate-400">Total {formatVND(total)}</p>
            </div>
          </div>
          <Badge variant="success">Ready</Badge>
        </div>
      </div>
    </Modal>
  );
}

function escapeCSV(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildPrintHTML(input: {
  fromDate: string;
  toDate: string;
  userName: string;
  total: number;
  expenses: Array<{ date: string; title: string; category: string; amount: number; note: string; isGroup: boolean }>;
}): string {
  const rows = input.expenses
    .map(
      (e) => `<tr>
        <td>${escapeHTML(e.date)}</td>
        <td>${escapeHTML(e.title)}</td>
        <td>${escapeHTML(e.category)}</td>
        <td style="text-align:right;font-weight:600">${e.amount.toLocaleString('de-DE')} ₫</td>
        <td>${escapeHTML(e.note)}</td>
        <td>${e.isGroup ? 'Group' : 'Personal'}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>BudgetBuddy report ${input.fromDate} – ${input.toDate}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #0F172A; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #475569; margin-bottom: 24px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #F1F5F9; text-align: left; padding: 10px 8px; }
  td { padding: 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  .total { margin-top: 24px; text-align: right; font-weight: 700; font-size: 16px; }
  .brand { font-weight: 700; color: #10B981; }
</style></head>
<body>
  <h1><span class="brand">BudgetBuddy</span> · Expense Report</h1>
  <p class="meta">User: ${escapeHTML(input.userName)} · Period: ${input.fromDate} → ${input.toDate} · Generated ${new Date().toLocaleString()}</p>
  <table>
    <thead><tr><th>Date</th><th>Title</th><th>Category</th><th style="text-align:right">Amount</th><th>Note</th><th>Type</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${input.total.toLocaleString('de-DE')} ₫</p>
</body></html>`;
}

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
