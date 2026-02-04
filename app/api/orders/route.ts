import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/sheets';
import { sendOrderNotification } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerName = searchParams.get('customer_name') || undefined;
    const data = await getOrders(customerName);
    // Ensure we always return an array
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Failed to get orders:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createOrder({
      customerName: body.customerName,
      items: body.items,
    });

    // Send email notification (don't fail if email fails)
    try {
      await sendOrderNotification(data);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
