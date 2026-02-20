import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAllCafes } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { noticeMessage, subject = 'Important Platform Announcement' } = await request.json();

        if (!noticeMessage) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        const allCafes = await getAllCafes();
        const activeCafeEmails = allCafes.filter(cafe => cafe.isActive && cafe.email).map(cafe => cafe.email);

        if (activeCafeEmails.length === 0) {
            return NextResponse.json({ message: 'No active cafes found to email.' }, { status: 200 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_FROM || '"TableTap Platform" <noreply@tabletap.com>',
            to: activeCafeEmails.join(','),
            subject: subject,
            html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
             <h2 style="margin: 0; color: #0f172a;">Platform Announcement</h2>
          </div>
          <div style="padding: 32px; color: #334155; line-height: 1.6;">
            <p>${noticeMessage.replace(/\n/g, '<br>')}</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
            <p>This is an automated message from the TableTap admin team. Do not reply to this email.</p>
          </div>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: `Email broadcasted to ${activeCafeEmails.length} cafes.`
        });
    } catch (error) {
        console.error('Error broadcasting email:', error);
        return NextResponse.json({ error: 'Failed to broadcast email' }, { status: 500 });
    }
}
