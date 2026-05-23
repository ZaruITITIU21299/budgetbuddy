import {
  Utensils, Bus, Home, Zap, GraduationCap, HeartPulse, Film,
  ShoppingBag, Sparkles, Plane, PiggyBank, Package,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ExpenseCategory } from '@/types';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  color: string;       // hex for charts
  bgClass: string;     // tailwind bg
  textClass: string;   // tailwind text
  borderClass: string; // tailwind border
}

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  food_drink: {
    id: 'food_drink',
    label: 'Food & Drink',
    icon: Utensils,
    color: '#F59E0B',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  transport: {
    id: 'transport',
    label: 'Transport',
    icon: Bus,
    color: '#0EA5E9',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/30',
  },
  housing: {
    id: 'housing',
    label: 'Housing',
    icon: Home,
    color: '#8B5CF6',
    bgClass: 'bg-violet-500/15',
    textClass: 'text-violet-400',
    borderClass: 'border-violet-500/30',
  },
  utilities: {
    id: 'utilities',
    label: 'Utilities',
    icon: Zap,
    color: '#EAB308',
    bgClass: 'bg-yellow-500/15',
    textClass: 'text-yellow-400',
    borderClass: 'border-yellow-500/30',
  },
  education: {
    id: 'education',
    label: 'Education',
    icon: GraduationCap,
    color: '#3B82F6',
    bgClass: 'bg-blue-500/15',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  health: {
    id: 'health',
    label: 'Health',
    icon: HeartPulse,
    color: '#EF4444',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
  entertainment: {
    id: 'entertainment',
    label: 'Entertainment',
    icon: Film,
    color: '#EC4899',
    bgClass: 'bg-pink-500/15',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500/30',
  },
  shopping: {
    id: 'shopping',
    label: 'Shopping',
    icon: ShoppingBag,
    color: '#F43F5E',
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
  },
  personal_care: {
    id: 'personal_care',
    label: 'Personal Care',
    icon: Sparkles,
    color: '#A78BFA',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
  },
  travel: {
    id: 'travel',
    label: 'Travel',
    icon: Plane,
    color: '#06B6D4',
    bgClass: 'bg-cyan-500/15',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
  },
  savings: {
    id: 'savings',
    label: 'Savings',
    icon: PiggyBank,
    color: '#10B981',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  other: {
    id: 'other',
    label: 'Other',
    icon: Package,
    color: '#94A3B8',
    bgClass: 'bg-slate-500/15',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORY_META);
