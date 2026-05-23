/**
 * Number / currency / date / string formatters shared across the app.
 * All currency output follows Vietnamese conventions (dot-separated thousands, ₫).
 */
import { format, formatDistanceToNow, isSameMonth, isSameDay, isYesterday } from 'date-fns';

export function formatVND(value: number, options: { compact?: boolean; signed?: boolean } = {}): string {
  const { compact = false, signed = false } = options;
  const sign = signed && value > 0 ? '+' : value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));

  if (compact && abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M ₫`;
  }
  if (compact && abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K ₫`;
  }

  const formatted = abs.toLocaleString('de-DE'); // dot-separated thousands
  return `${sign}${formatted} ₫`;
}

export function parseVNDInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function formatPercentage(ratio: number, decimals = 0): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isSameDay(d, new Date())) {
    return `Today, ${format(d, 'h:mm a')}`;
  }
  if (isYesterday(d)) {
    return `Yesterday, ${format(d, 'h:mm a')}`;
  }
  return format(d, 'MMM d, yyyy');
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatMonthYear(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value + (value.length === 7 ? '-01' : '')) : value;
  return format(d, 'MMMM yyyy');
}

export function getCurrentMonthYear(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthYearOf(d: Date): string {
  return format(d, 'yyyy-MM');
}

export function isCurrentMonth(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isSameMonth(d, new Date());
}

export function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
