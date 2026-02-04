'use client';

import { Product, CartItem } from '@/types';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  cartItem?: CartItem;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export default function ProductCard({ product, cartItem, onQuantityChange }: ProductCardProps) {
  const quantity = cartItem?.quantity || 0;

  const handleDecrease = () => {
    if (quantity > 0) {
      onQuantityChange(product.id, quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < product.stock) {
      onQuantityChange(product.id, quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty input (will be treated as 0)
    if (value === '') {
      onQuantityChange(product.id, 0);
      return;
    }

    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      // Clamp between 0 and stock
      const clampedValue = Math.max(0, Math.min(num, product.stock));
      onQuantityChange(product.id, clampedValue);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-square relative bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
        <p className="text-xl font-bold text-green-600">
          ¥{product.price.toLocaleString()} / {product.unit}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          残り: {product.stock}{product.unit}
        </p>
        {product.comment && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.comment}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleDecrease}
            disabled={quantity === 0}
            className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xl font-bold"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            max={product.stock}
            value={quantity}
            onChange={handleInputChange}
            className="w-16 h-10 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleIncrease}
            disabled={quantity >= product.stock}
            className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center text-xl font-bold"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
