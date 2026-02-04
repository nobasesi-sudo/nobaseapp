'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types';
import Image from 'next/image';

interface ProductFormProps {
  product?: Product;
}

const UNIT_OPTIONS = ['キロ', '袋', '個', '100g', '300g', 'カスタム'];

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>(() => {
    if (product?.unit) {
      return UNIT_OPTIONS.includes(product.unit) ? product.unit : 'カスタム';
    }
    return '';
  });
  const [customUnit, setCustomUnit] = useState<string>(() => {
    if (product?.unit && !UNIT_OPTIONS.slice(0, -1).includes(product.unit)) {
      return product.unit;
    }
    return '';
  });

  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    stock: product?.stock?.toString() || '',
    comment: product?.comment || '',
    is_active: product?.is_active ?? true,
  });

  // Fetch previous price when name changes
  const fetchPreviousPrice = useCallback(async (name: string) => {
    if (!name.trim()) {
      setPreviousPrice(null);
      return;
    }

    try {
      const res = await fetch(`/api/products/history?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (data.found) {
        setPreviousPrice(data.price);
      } else {
        setPreviousPrice(null);
      }
    } catch {
      setPreviousPrice(null);
    }
  }, []);

  // Debounced name change effect
  useEffect(() => {
    // Don't fetch if editing existing product with same name
    if (product && formData.name === product.name) {
      setPreviousPrice(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchPreviousPrice(formData.name);
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, product, fetchPreviousPrice]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const unit = selectedUnit === 'カスタム' ? customUnit : selectedUnit;

      if (!unit) {
        setError('単位を選択してください');
        setIsSubmitting(false);
        return;
      }

      let imageUrl = product?.image_url || null;

      // Upload image if changed
      const fileInput = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
      const file = fileInput?.files?.[0];

      if (file) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!uploadRes.ok) {
          throw new Error('画像のアップロードに失敗しました');
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const payload = {
        name: formData.name,
        price: parseInt(formData.price),
        unit,
        stock: parseInt(formData.stock),
        comment: formData.comment || null,
        image_url: imageUrl,
        is_active: formData.is_active,
      };

      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('保存に失敗しました');
      }

      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          商品名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          単価（税込み） <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            required
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-gray-600">円</span>
        </div>
        {previousPrice !== null && (
          <p className="mt-1 text-sm text-blue-600">
            📝 前回価格: {previousPrice.toLocaleString()}円
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          単位 <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">選択してください</option>
          {UNIT_OPTIONS.map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
        {selectedUnit === 'カスタム' && (
          <input
            type="text"
            placeholder="カスタム単位を入力"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          在庫数 <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min="0"
          value={formData.stock}
          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          コメント（任意）
        </label>
        <textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          画像（任意）
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full"
        />
        {imagePreview && (
          <div className="mt-2 relative w-32 h-32">
            <Image
              src={imagePreview}
              alt="プレビュー"
              fill
              className="object-cover rounded-md"
            />
          </div>
        )}
      </div>

      {product && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            販売中
          </label>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
        >
          {isSubmitting ? '保存中...' : (product ? '更新する' : '登録する')}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
