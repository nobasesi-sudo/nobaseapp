'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { OrderWithItems, Order } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: '未処理',
  completed: '完了',
  cancelled: 'キャンセル',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (error) {
        console.error('Failed to fetch order:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleStatusChange = async (status: Order['status']) => {
    if (!order) return;

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setOrder({ ...order, status });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center py-8">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">注文が見つかりませんでした</p>
            <Link
              href="/admin/orders"
              className="text-green-600 hover:text-green-700 underline"
            >
              注文一覧に戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <Link
            href="/admin/orders"
            className="text-green-600 hover:text-green-700 mb-4 inline-block"
          >
            ← 注文一覧に戻る
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            注文詳細
          </h1>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-lg font-semibold text-gray-800">{order.customer_name}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="border-t border-b py-4 mb-4">
            <h2 className="font-semibold text-gray-700 mb-3">注文内容</h2>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.product_name} × {item.quantity}{item.unit}
                  </span>
                  <span className="text-gray-600">
                    ¥{item.subtotal.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-lg font-bold mb-6">
            <span>合計</span>
            <span className="text-green-600">¥{order.total_amount.toLocaleString()}</span>
          </div>

          {order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('completed')}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
              >
                完了にする
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t text-sm text-gray-500">
            <p>注文ID: {order.id}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
