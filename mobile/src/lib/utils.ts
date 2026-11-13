export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDay() === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function parseQuantity(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs?|units?|cups?|tbsp|tsp|packs?)?/i);
  if (!match) return null;
  let value = parseFloat(match[1]);
  const unitRaw = match[2]?.toLowerCase();
  if (unitRaw === 'kg') value *= 1000;
  if (value > 0) return value;
  return null;
}

export function normalizeUnit(text: string): 'g' | 'ml' | 'pcs' {
  const t = text.toLowerCase();
  if (/(kg|gram|g\b)/.test(t)) return 'g';
  if (/(ml|litre|liter|l\b)/.test(t)) return 'ml';
  return 'pcs';
}
