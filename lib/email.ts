import { Resend } from 'resend';
import { OrderWithItems } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderNotification(order: OrderWithItems) {
  const itemsList = order.order_items
    .map(item => `・${item.product_name} x ${item.quantity}${item.unit} = ¥${item.subtotal.toLocaleString()}`)
    .join('\n');

  const emailHtml = `
    <h2>新しい注文が入りました</h2>
    <p><strong>注文ID:</strong> ${order.id}</p>
    <p><strong>購入者名:</strong> ${order.customer_name}</p>
    <p><strong>注文日時:</strong> ${new Date(order.created_at).toLocaleString('ja-JP')}</p>
    <h3>注文内容</h3>
    <pre>${itemsList}</pre>
    <p><strong>合計金額:</strong> ¥${order.total_amount.toLocaleString()}</p>
  `;

  try {
    await resend.emails.send({
      from: 'Veggie Market <onboarding@resend.dev>',
      to: ['nobase.si@gmail.com'],
      subject: `【余剰野菜マーケット】新規注文: ${order.customer_name}様`,
      html: emailHtml,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}
