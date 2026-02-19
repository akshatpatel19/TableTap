import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { orderId, customerEmail, cafeName, cafeSlug, items, totalAmount } = await req.json();

        if (!orderId || !customerEmail || !cafeName || !cafeSlug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // SMTP configuration
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const trackingLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/${cafeSlug}/order-confirmation?orderId=${orderId}`;

        const itemsHtml = items
            .map(
                (item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${(
                        item.price * item.quantity
                    ).toFixed(2)}</td>
      </tr>
    `
            )
            .join('');

        const mailOptions = {
            from: process.env.SMTP_FROM || `"TableTap" <noreply@tabletaps.com>`,
            to: customerEmail,
            subject: `Order Placed Successfully - ${cafeName}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #ea580c; text-align: center;">Order Placed!</h2>
          <p>Hi there,</p>
          <p>Your order has been successfully placed at <strong>${cafeName}</strong>. Thank you for using TableTap!</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9rem; color: #6b7280;">Order ID:</p>
            <p style="margin: 0; font-weight: bold; font-family: monospace;">${orderId}</p>
          </div>

          <h3 style="border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
            <tr>
              <td style="padding: 12px 8px; font-weight: bold; font-size: 1.1rem;">Total</td>
              <td style="padding: 12px 8px; font-weight: bold; font-size: 1.1rem; text-align: right; color: #ea580c;">₹${totalAmount.toFixed(
                2
            )}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingLink}" style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Your Order</a>
          </div>

          <p style="font-size: 0.85rem; color: #9ca3af; text-align: center; margin-top: 40px;">
            If you didn't make this order, please ignore this email.
          </p>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('[API] Error sending order email:', error);
        return NextResponse.json(
            { error: 'Failed to send email', details: error.message },
            { status: 500 }
        );
    }
}
