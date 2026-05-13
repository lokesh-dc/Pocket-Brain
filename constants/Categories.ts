import {
  Banknote,
  BookOpen,
  Plane,
  Lightbulb,
  ShoppingBag,
  Activity,
  Circle,
} from 'lucide-react-native';

export const CATEGORY_CONFIG: Record<string, { icon: any; color: string; accent: string }> = {
  expense: { icon: Banknote, color: '#f87171', accent: '#22c55e' }, // Green for expenses
  reading: { icon: BookOpen, color: '#60a5fa', accent: '#f59e0b' }, // Amber
  travel: { icon: Plane, color: '#34d399', accent: '#3b82f6' }, // Blue
  idea: { icon: Lightbulb, color: '#fbbf24', accent: '#a855f7' }, // Purple
  shopping: { icon: ShoppingBag, color: '#a78bfa', accent: '#ec4899' }, // Pink
  health: { icon: Activity, color: '#f472b6', accent: '#ff7043' }, // Coral
  misc: { icon: Circle, color: '#94a3b8', accent: '#94a3b8' }, // Grey
};

export const getCategoryConfig = (name: string = '') => {
  const normalized = name.toLowerCase();
  if (normalized.includes('expense')) return CATEGORY_CONFIG.expense;
  if (normalized.includes('read')) return CATEGORY_CONFIG.reading;
  if (normalized.includes('travel')) return CATEGORY_CONFIG.travel;
  if (normalized.includes('idea')) return CATEGORY_CONFIG.idea;
  if (normalized.includes('shop')) return CATEGORY_CONFIG.shopping;
  if (normalized.includes('health')) return CATEGORY_CONFIG.health;
  return CATEGORY_CONFIG.misc;
};
