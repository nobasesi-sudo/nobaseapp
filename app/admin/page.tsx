'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockUpdates, setStockUpdates] = useState<Record<string, string>>({});
  const [updatingStock, setUpdatingStock] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
      // Initialize stock inputs
      const stockMap: Record<string, string> = {};
      data.forEach((p: Product) => {
        stockMap[p.id] = p.stock.toString();
      });
      setStockUpdates(stockMap);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockUpdate = async (productId: string) => {
    const newStock = parseInt(stockUpdates[productId]);
    if (isNaN(newStock) || newStock < 0) return;

    setUpdatingStock(productId);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
        );
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
    } finally {
      setUpdatingStock(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, is_active: !p.is_active } : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeProducts = products.filter((p) => p.is_active);
  const allActiveSelected =
    activeProducts.length > 0 && activeProducts.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds(allActiveSelected ? new Set() : new Set(activeProducts.map((p) => p.id)));
  };

  // 選択した商品を一括でリストから外す(非表示にする)。
  // 先に画面へ反映し(楽観的更新)、リクエストは並列に送る。失敗したものだけ元に戻す。
  const handleBulkHide = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`選択した${ids.length}件をリストから外します。よろしいですか?`)) return;

    setIsBulkUpdating(true);
    setProducts((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, is_active: false } : p))
    );
    setSelectedIds(new Set());

    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: false }),
        }).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        })
      )
    );

    const failedIds = ids.filter((_, i) => results[i].status === 'rejected');
    if (failedIds.length > 0) {
      setProducts((prev) =>
        prev.map((p) => (failedIds.includes(p.id) ? { ...p, is_active: true } : p))
      );
      setSelectedIds(new Set(failedIds));
      alert(`${failedIds.length}件の処理に失敗しました。もう一度お試しください。`);
    }
    setIsBulkUpdating(false);
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <span>⚙️</span> 管理画面
          </h1>
          <Link
            href="/admin/products/new"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
          >
            + 商品を追加
          </Link>
        </header>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">商品がまだ登録されていません</p>
            <Link
              href="/admin/products/new"
              className="text-green-600 hover:text-green-700 underline"
            >
              最初の商品を登録する
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 一括操作バー */}
            <div className="sticky top-0 z-10 bg-white rounded-lg shadow-md p-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allActiveSelected}
                  onChange={toggleSelectAll}
                  disabled={activeProducts.length === 0}
                  className="w-4 h-4"
                />
                表示中をすべて選択
              </label>
              <span className="text-sm text-gray-500">{selectedIds.size}件選択中</span>
              <button
                onClick={handleBulkHide}
                disabled={selectedIds.size === 0 || isBulkUpdating}
                className="ml-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white text-sm font-bold rounded transition-colors"
              >
                {isBulkUpdating ? '処理中...' : '選択したものをリストから外す'}
              </button>
            </div>
            {products.map((product) => (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-md p-4 ${
                  !product.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Select */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      aria-label={`${product.name}を選択`}
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleSelect(product.id)}
                      disabled={!product.is_active || isBulkUpdating}
                      className="w-5 h-5 disabled:opacity-30"
                    />
                  </div>
                  {/* Image */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden relative">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{product.name}</h3>
                        <p className="text-green-600 font-medium">
                          ¥{product.price.toLocaleString()} / {product.unit}
                        </p>
                      </div>
                      {!product.is_active && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                          非表示
                        </span>
                      )}
                    </div>

                    {/* Stock Update */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-gray-600">在庫:</span>
                      <input
                        type="number"
                        min="0"
                        value={stockUpdates[product.id] || ''}
                        onChange={(e) =>
                          setStockUpdates((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={() => handleStockUpdate(product.id)}
                        disabled={updatingStock === product.id}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                      >
                        {updatingStock === product.id ? '更新中...' : '更新'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded transition-colors"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          product.is_active
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {product.is_active ? '非表示にする' : '表示する'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg transition-colors"
          >
            <span>📋</span> 注文一覧を見る
          </Link>
        </div>
      </div>
    </main>
  );
}
