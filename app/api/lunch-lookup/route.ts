import { NextRequest, NextResponse } from 'next/server';
import {
  fetchLunchRows,
  aggregateRows,
  toJapaneseDate,
  monthFromJpDate,
  LunchRow,
} from '@/lib/google-sheets-lunch';

export const dynamic = 'force-dynamic';

function currentMonth() {
  return new Date().getMonth() + 1;
}

// GET /api/lunch-lookup?mode=date&date=6/15&ingredient=キャベツ
// GET /api/lunch-lookup?mode=month&month=6&ingredient=小麦粉
// GET /api/lunch-lookup?mode=supplier&supplier=舟田&date=今日&month=6
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get('mode') ?? 'date';

  try {
    let rows: LunchRow[];
    let filtered: LunchRow[];

    if (mode === 'date') {
      const rawDate = p.get('date') ?? '今日';
      const ingredient = (p.get('ingredient') ?? '').trim();
      const jpDate = toJapaneseDate(rawDate);
      const month = Number(p.get('month')) || monthFromJpDate(jpDate);

      rows = await fetchLunchRows(month);
      filtered = rows.filter(
        r =>
          r.使用日.includes(jpDate) &&
          (!ingredient || r.商品名.includes(ingredient))
      );

      return NextResponse.json({
        mode,
        query: { date: jpDate, ingredient, month },
        result: aggregateRows(filtered),
      });
    }

    if (mode === 'month') {
      const month = Number(p.get('month')) || currentMonth();
      const ingredient = (p.get('ingredient') ?? '').trim();

      rows = await fetchLunchRows(month);
      filtered = ingredient
        ? rows.filter(r => r.商品名.includes(ingredient))
        : rows;

      return NextResponse.json({
        mode,
        query: { month, ingredient },
        result: aggregateRows(filtered),
      });
    }

    if (mode === 'supplier') {
      const supplier = (p.get('supplier') ?? '').trim();
      const rawDate = p.get('date') ?? '今日';
      const jpDate = toJapaneseDate(rawDate);
      const month = Number(p.get('month')) || monthFromJpDate(jpDate) || currentMonth();

      rows = await fetchLunchRows(month);
      filtered = rows.filter(
        r =>
          (!supplier || r.発注先.includes(supplier)) &&
          (!jpDate || r.納品希望日.includes(jpDate))
      );

      return NextResponse.json({
        mode,
        query: { supplier, deliveryDate: jpDate, month },
        result: aggregateRows(filtered),
      });
    }

    return NextResponse.json({ error: 'invalid mode' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
