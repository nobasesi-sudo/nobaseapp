'use client';

import { useState } from 'react';

type Mode = 'date' | 'month' | 'supplier';

interface Row {
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

interface AggResult {
  count: number;
  totalKg: number;
  byUnit: Record<string, { qty: number; count: number }>;
  deliveryByUnit: Record<string, number>;
  rows: Row[];
}

interface ApiResponse {
  mode: string;
  query: {
    date?: string;
    deliveryDate?: string;
    ingredient?: string;
    month?: number | string;
    supplier?: string;
  };
  result: AggResult;
  error?: string;
}

const TABS: { id: Mode; label: string; desc: string }[] = [
  { id: 'date', label: '日付×食材', desc: '特定日の食材合計を確認' },
  { id: 'month', label: '月別集計', desc: '今月の食材合計を確認' },
  { id: 'supplier', label: '仕入先', desc: '発注先ごとの仕入予定を確認' },
];

function fmt(n: number, decimals = 2) {
  return n % 1 === 0 ? n.toString() : n.toFixed(decimals).replace(/\.?0+$/, '');
}

function SummaryBox({ result }: { result: AggResult }) {
  const unitEntries = Object.entries(result.byUnit).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="space-y-4">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">
            {fmt(result.totalKg)} kg
          </div>
          <div className="text-xs text-green-600 mt-0.5">合計重量</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{result.count}</div>
          <div className="text-xs text-blue-600 mt-0.5">件数（小口数）</div>
        </div>
        {unitEntries.map(([unit, { qty, count }]) => (
          <div
            key={unit}
            className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
          >
            <div className="text-2xl font-bold text-gray-700">
              {fmt(qty)} {unit}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{count}件</div>
          </div>
        ))}
      </div>

      {/* Row table */}
      {result.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-left">
                <th className="px-3 py-2 font-medium border border-gray-200">使用日</th>
                <th className="px-3 py-2 font-medium border border-gray-200">納品先</th>
                <th className="px-3 py-2 font-medium border border-gray-200">商品名</th>
                <th className="px-3 py-2 font-medium border border-gray-200 text-right">数量</th>
                <th className="px-3 py-2 font-medium border border-gray-200">単位</th>
                <th className="px-3 py-2 font-medium border border-gray-200">発注先</th>
                <th className="px-3 py-2 font-medium border border-gray-200">納品希望日</th>
                <th className="px-3 py-2 font-medium border border-gray-200">納品数量</th>
                <th className="px-3 py-2 font-medium border border-gray-200">配送担当</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">
                    {r.使用日}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">
                    {r.納品先}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 font-medium">
                    {r.商品名}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 text-right tabular-nums">
                    {fmt(r.数量)}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200">{r.単位}</td>
                  <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">
                    {r.発注先}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">
                    {r.納品希望日}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap text-gray-600">
                    {r.納品数量表示 || (r.納品数 ? `${fmt(r.納品数)}${r.納品単位}` : '')}
                  </td>
                  <td className="px-3 py-1.5 border border-gray-200 text-gray-500">
                    {r.配送担当}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function LunchLookupPage() {
  const [mode, setMode] = useState<Mode>('date');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);

  // form state
  const [dateInput, setDateInput] = useState('今日');
  const [monthInput, setMonthInput] = useState(String(new Date().getMonth() + 1));
  const [ingredientInput, setIngredientInput] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [supplierDateInput, setSupplierDateInput] = useState('今日');

  async function search() {
    setLoading(true);
    setError('');
    setData(null);
    try {
      let qs = `mode=${mode}`;
      if (mode === 'date') {
        qs += `&date=${encodeURIComponent(dateInput)}&ingredient=${encodeURIComponent(ingredientInput)}`;
      } else if (mode === 'month') {
        qs += `&month=${monthInput}&ingredient=${encodeURIComponent(ingredientInput)}`;
      } else if (mode === 'supplier') {
        qs += `&supplier=${encodeURIComponent(supplierInput)}&date=${encodeURIComponent(supplierDateInput)}`;
        if (monthInput) qs += `&month=${monthInput}`;
      }
      const res = await fetch(`/api/lunch-lookup?${qs}`);
      const json: ApiResponse = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">給食受注 かんたん検索</h1>
          <p className="text-gray-500 text-sm mt-1">スプレッドシートを開かずに受注情報を確認できます</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 rounded-lg p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setMode(tab.id); setData(null); setError(''); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-500 text-sm mb-4">
            {TABS.find(t => t.id === mode)?.desc}
          </p>

          {/* Date × Ingredient */}
          {mode === 'date' && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">使用日</label>
                <input
                  type="text"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  placeholder="6/15 または 今日"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">食材名（空白=全件）</label>
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={e => setIngredientInput(e.target.value)}
                  placeholder="キャベツ、にんじん …"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={search}
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '検索中…' : '検索'}
              </button>
            </div>
          )}

          {/* Monthly aggregate */}
          {mode === 'month' && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">月</label>
                <select
                  value={monthInput}
                  onChange={e => setMonthInput(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">食材名（空白=全件）</label>
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={e => setIngredientInput(e.target.value)}
                  placeholder="小麦粉、キャベツ …"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={search}
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '検索中…' : '検索'}
              </button>
            </div>
          )}

          {/* Supplier */}
          {mode === 'supplier' && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">仕入先名（部分一致）</label>
                <input
                  type="text"
                  value={supplierInput}
                  onChange={e => setSupplierInput(e.target.value)}
                  placeholder="舟田、吉田農園 …"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">納品希望日</label>
                <input
                  type="text"
                  value={supplierDateInput}
                  onChange={e => setSupplierDateInput(e.target.value)}
                  placeholder="今日 または 6/14"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">月（シート選択）</label>
                <select
                  value={monthInput}
                  onChange={e => setMonthInput(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <button
                onClick={search}
                disabled={loading}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '検索中…' : '検索'}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
            <strong>エラー：</strong> {error}
            {error.includes('GOOGLE_API_KEY') && (
              <p className="mt-1 text-red-600">
                環境変数 <code className="bg-red-100 px-1 rounded">GOOGLE_API_KEY</code> が設定されていません。
                Google Cloud Console でAPIキーを作成し、Vercelの環境変数に追加してください。
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                検索結果
                {data.query.date && (
                  <span className="ml-2 text-blue-600">
                    {String(data.query.date)}
                    {data.query.ingredient ? ` / ${data.query.ingredient}` : ''}
                  </span>
                )}
                {data.query.month && !data.query.date && (
                  <span className="ml-2 text-blue-600">
                    {String(data.query.month)}月
                    {data.query.ingredient ? ` / ${data.query.ingredient}` : ''}
                  </span>
                )}
                {data.query.supplier && (
                  <span className="ml-2 text-blue-600">
                    {String(data.query.supplier)} /{' '}
                    {String(data.query.deliveryDate)}
                  </span>
                )}
              </h2>
              {data.result.count === 0 && (
                <span className="text-gray-400 text-sm">該当なし</span>
              )}
            </div>
            {data.result.count > 0 ? (
              <SummaryBox result={data.result} />
            ) : (
              <p className="text-gray-400 text-sm">
                条件に一致するデータが見つかりませんでした。
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
