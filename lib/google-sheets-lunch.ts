const SPREADSHEET_ID = process.env.LUNCH_SPREADSHEET_ID || '1z9Ml6fZkDNoBlqJA2GNvQaBKCjni9n5Wywg1wXjOOn0';
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

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

// In-process cache; each entry lives 5 minutes
const cache = new Map<string, { rows: LunchRow[]; at: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function fetchLunchRows(month: number): Promise<LunchRow[]> {
  const cacheKey = String(month);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const sheetName = `受注情報_${month}月`;
  const range = encodeURIComponent(`${sheetName}!A:AC`);
  const url = `${SHEETS_API}/${SPREADSHEET_ID}/values/${range}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sheets API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const values: string[][] = json.values ?? [];
  if (values.length < 2) return [];

  const headers = values[0];
  const idx = (col: string) => headers.indexOf(col);

  const rows: LunchRow[] = values
    .slice(1)
    .filter(row => (row[idx('学校使用日')] || row[idx('商品名')]) && row[idx('商品名')])
    .map(row => ({
      使用日: row[idx('学校使用日')] ?? '',
      納品先: row[idx('納品先名')] ?? '',
      商品名: row[idx('商品名')] ?? '',
      数量: parseFloat(row[idx('数量')]) || 0,
      単位: row[idx('単位')] ?? '',
      発注先: row[idx('発注先')] ?? '',
      納品希望日: row[idx('納品希望日')] ?? '',
      kg換算: parseFloat(row[idx('kg換算')]) || 0,
      納品数: parseFloat(row[idx('納品数')]) || 0,
      納品単位: row[idx('納品単位')] ?? '',
      納品数量表示: row[idx('納品数量表示')] ?? '',
      配送担当: row[idx('配送担当')] ?? '',
    }));

  cache.set(cacheKey, { rows, at: Date.now() });
  return rows;
}

// Convert "6/15", "6月15日(月)" or "今日" to "6月15日" substring for matching
export function toJapaneseDate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '今日') {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  // Already in "X月Y日" format (may include day-of-week)
  const jpMatch = trimmed.match(/^(\d+)月(\d+)日/);
  if (jpMatch) return `${Number(jpMatch[1])}月${Number(jpMatch[2])}日`;
  // "M/D" or "M-D"
  const slashMatch = trimmed.match(/^(\d+)[\/\-](\d+)$/);
  if (slashMatch) return `${Number(slashMatch[1])}月${Number(slashMatch[2])}日`;
  return trimmed;
}

// Extract month number from "6月15日" → 6
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
