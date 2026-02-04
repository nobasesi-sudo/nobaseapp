import Link from 'next/link';
import ProductForm from '@/components/ProductForm';

export default function NewProductPage() {
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
            商品登録
          </h1>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6">
          <ProductForm />
        </div>
      </div>
    </main>
  );
}
