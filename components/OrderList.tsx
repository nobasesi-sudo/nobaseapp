'use client';

import Link from 'next/link';
import { Order } from '@/types';

interface OrderListProps {
  orders: Order[];
  showStatusControls?: boolean;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
}

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

export default function OrderList({ orders, showStatusControls, onStatusChange }: OrderListProps) {
  if (!orders || orders.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">注文がありません</p>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const totalAmount = order.total_amount || 0;
        const status = order.status || 'pending';
        const customerName = order.customer_name || '名前なし';
        const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('ja-JP') : '';

        return (
          <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-gray-800">{customerName}</p>
                <p className="text-sm text-gray-500">{createdAt}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 rounded text-sm font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}`}>
                  {STATUS_LABELS[status] || status}
                </span>
                <span className="font-bold text-green-600">
                  ¥{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Link
                href={showStatusControls ? `/admin/orders/${order.id}` : `/orders/${order.id}`}
                className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm"
              >
                詳細を見る
              </Link>

              {showStatusControls && onStatusChange && status === 'pending' && (
                <>
                  <button
                    onClick={() => onStatusChange(order.id, 'completed')}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors text-sm"
                  >
                    完了
                  </button>
                  <button
                    onClick={() => onStatusChange(order.id, 'cancelled')}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-sm"
                  >
                    キャンセル
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
