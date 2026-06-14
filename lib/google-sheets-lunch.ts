const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export interface LunchRow {
  使用日: string;
  納品先: string;
  商品名: string;
  数量: number;
  単位: string;
  発注先: string;
  納品希望日: string;
  kg換算: number;
  納品数: number;
  納品単位: string;
  納品数量表示: string;
  配送担当: string;
}

export interface AggregateResult {
  count: number;
  totalKg: number;
  byUnit: Record<string, { qty: number; count: number }>;
  deliveryByUnit: Record<string, number>;
  rows: LunchRow[];
}

// In-process cache per month, 5-minute TTL
const cache = new Map<string, { rows: LunchRow[]; at: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function fetchLunchRows(month: number): Promise<LunchRow[]> {
  const cacheKey = String(month);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;

  if (!GAS_URL) throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL not set');

  const url = new URL(GAS_URL);
  url.searchParams.set('path', 'lunch-lookup');
  url.searchParams.set('month', String(month));

  const res = await fetch(url.toString(), { redirect: 'follow' });
  const text = await res.text();

  let json: { rows?: LunchRow[]; error?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`GAS returned non-JSON: ${text.slice(0, 200)}`);
  }

  if (json.error) throw new Error(json.error);

  const rows = (json.rows ?? []).filter((r: LunchRow) => r.商品名);
  cache.set(cacheKey, { rows, at: Date.now() });
  return rows;
}

// Convert "6/15", "6月15日(月)" or "今日" → "6月15日" for substring matching
export function toJapaneseDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '今日') {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  const jpMatch = trimmed.match(/^(\d+)月(\d+)日/);
  if (jpMatch) return `${Number(jpMatch[1])}月${Number(jpMatch[2])}日`;
  const slashMatch = trimmed.match(/^(\d+)[\/\-](\d+)$/);
  if (slashMatch) return `${Number(slashMatch[1])}月${Number(slashMatch[2])}日`;
  return trimmed;
}

// Extract month from "6月15日" → 6
export function monthFromJpDate(jpDate: string): number {
  const m = jpDate.match(/^(\d+)月/);
  return m ? Number(m[1]) : new Date().getMonth() + 1;
}

export function aggregateRows(rows: LunchRow[]): AggregateResult {
  const byUnit: Record<string, { qty: number; count: number }> = {};
  const deliveryByUnit: Record<string, number> = {};
  let totalKg = 0;

  for (const r of rows) {
    if (!r.商品名) continue;
    const unit = r.単位 || '-';
    if (!byUnit[unit]) byUnit[unit] = { qty: 0, count: 0 };
    byUnit[unit].qty += r.数量;
    byUnit[unit].count += 1;
    totalKg += r.kg換算 || 0;
    if (r.納品単位) {
      deliveryByUnit[r.納品単位] = (deliveryByUnit[r.納品単位] ?? 0) + r.納品数;
    }
  }

  return { count: rows.length, totalKg, byUnit, deliveryByUnit, rows };
}
