'use client';

import { useState } from 'react';
import Link from 'next/link';
import OrderList from '@/components/OrderList';
import { Order } from '@/types';

export default function OrdersPage() {
  const [customerName, setCustomerName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!customerName.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/orders?customer_name=${encodeURIComponent(customerName.trim())}`);
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to search orders:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <Link
            href="/"
            className="text-green-600 hover:text-green-700 mb-4 inline-block"
          >
            ← 商品一覧に戻る
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            注文履歴検索
          </h1>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            お名前で検索
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="山田太郎"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !customerName.trim()}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold rounded-md transition-colors"
            >
              {isSearching ? '検索中...' : '検索'}
            </button>
          </div>
        </div>

        {hasSearched && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              検索結果: {orders.length}件
            </h2>
            <OrderList orders={orders} />
          </div>
        )}
      </div>
    </main>
  );
}
