import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/sheets';

export async function GET() {
  try {
    const data = await getProducts();
    // Ensure we always return an array
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Failed to get products:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createProduct({
      name: body.name,
      price: body.price,
      unit: body.unit,
      stock: body.stock,
      comment: body.comment,
      image_url: body.image_url,
      is_active: body.is_active ?? true,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
