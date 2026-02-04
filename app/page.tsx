'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Cart from '@/components/Cart';
import { Product, CartItem } from '@/types';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      // Filter only active products with stock
      setProducts(data.filter((p: Product) => p.is_active && p.stock > 0));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newCart = new Map(cart);
    const product = products.find((p) => p.id === productId);

    if (!product) return;

    if (quantity === 0) {
      newCart.delete(productId);
    } else {
      newCart.set(productId, { product, quantity });
    }

    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || cart.size === 0) return;

    setIsSubmitting(true);

    try {
      const items = Array.from(cart.values());
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items,
        }),
      });

      if (!res.ok) {
        throw new Error('注文の送信に失敗しました');
      }

      const order = await res.json();
      setOrderComplete(order.id);
      setCart(new Map());
      setCustomerName('');
      fetchProducts(); // Refresh products to update stock
    } catch (error) {
      console.error('Failed to submit order:', error);
      alert('注文の送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartItems = Array.from(cart.values());

  if (orderComplete) {
    return (
      <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            ご注文ありがとうございます！
          </h1>
          <p className="text-gray-600 mb-6">
            注文ID: {orderComplete}
          </p>
          <div className="flex flex-col gap-4">
            <Link
              href={`/orders/${orderComplete}`}
              className="inline-block py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
            >
              注文詳細を見る
            </Link>
            <button
              onClick={() => setOrderComplete(null)}
              className="py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
            >
              続けて買い物をする
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span>🥬</span> 余剰野菜マーケット
          </h1>
          <p className="text-gray-600 mt-2">
            農家直送の新鮮野菜をお得にお届けします
          </p>
        </header>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Product List */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-lg shadow-md">
                <p className="text-gray-500">現在販売中の商品はありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 lg:mb-0">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartItem={cart.get(product.id)}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <Cart
                items={cartItems}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />

              <div className="mt-4 text-center">
                <Link
                  href="/orders"
                  className="text-green-600 hover:text-green-700 underline"
                >
                  過去の注文履歴を見る
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
