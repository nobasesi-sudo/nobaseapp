'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { Product } from '@/types';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center py-8">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">商品が見つかりませんでした</p>
            <Link
              href="/admin"
              className="text-green-600 hover:text-green-700 underline"
            >
              管理画面に戻る
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
            href="/admin"
            className="text-green-600 hover:text-green-700 mb-4 inline-block"
          >
            ← 管理画面に戻る
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            商品編集
          </h1>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <ProductForm product={product} />
        </div>
      </div>
    </main>
  );
}
