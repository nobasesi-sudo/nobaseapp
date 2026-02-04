'use client';

import { CartItem } from '@/types';

interface CartProps {
  items: CartItem[];
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function Cart({ items, customerName, onCustomerNameChange, onSubmit, isSubmitting }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const hasItems = items.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
        <span>🛒</span> カート
      </h2>

      {hasItems ? (
        <>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span>¥{(item.product.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="flex justify-between text-lg font-bold">
              <span>合計</span>
              <span className="text-green-600">¥{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              お名前
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="山田太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting || !customerName.trim()}
            className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {isSubmitting ? '処理中...' : '注文を確定する'}
          </button>
        </>
      ) : (
        <p className="text-gray-500 text-center py-4">カートは空です</p>
      )}
    </div>
  );
}
