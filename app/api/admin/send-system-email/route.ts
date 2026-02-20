import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { cafeName, cafeEmail, notificationType } = await request.json();

        if (!cafeName || !cafeEmail || !notificationType) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
            console.warn('SMTP credentials not configured. Skipping automated email.');
            return new NextResponse('SMTP not configured', { status: 200 });
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        let subject = '';
        let htmlContent = '';

        if (notificationType === 'upcoming') {
            subject = 'Action Required: Upcoming Subscription Payment - TableTap';
            htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Upcoming Payment Reminder</h2>
          <p>Hi ${cafeName},</p>
          <p>This is a quick reminder that your TableTap platform subscription will renew in <strong>3 days</strong>.</p>
          <p>Please ensure your payment is completed on time to avoid any interruptions to your dashboard or customer ordering flow.</p>
          <br/>
          <p>Best regards,</p>
          <p>The TableTap Team</p>
        </div>
      `;
        } else if (notificationType === 'overdue') {
            subject = 'URGENT: Subscription Payment Overdue - TableTap';
            htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-top: 4px solid #ef4444; padding: 20px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <h2 style="color: #ef4444;">Payment Overdue</h2>
          <p>Hi ${cafeName},</p>
          <p>Your TableTap monthly subscription is now officially <strong>Overdue</strong>.</p>
          <p>Please submit your payment immediately via the Owner Dashboard. Failure to clear the overdue balance within 30 days will result in automated platform suspension.</p>
          <br/>
          <p>Best regards,</p>
          <p>The TableTap Team</p>
        </div>
      `;
        } else if (notificationType === 'suspension_warning') {
            subject = 'FINAL WARNING: Imminent Platform Suspension - TableTap';
            htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fef2f2; border: 1px solid #f87171; padding: 20px; border-radius: 8px;">
          <h2 style="color: #b91c1c; text-align: center;">FINAL SUSPENSION WARNING</h2>
          <p>Hi ${cafeName},</p>
          <p>Your TableTap subscription is severely overdue. Your platform access will be <strong>AUTOMATICALLY SUSPENDED in 3 days</strong>.</p>
          <p>If your account is suspended, neither you nor your customers will be able to access the platform, process orders, or view analytics. Please settle your outstanding balance immediately.</p>
          <br/>
          <p>Best regards,</p>
          <p>The TableTap Team</p>
        </div>
      `;
        } else {
            return new NextResponse('Invalid notification type', { status: 400 });
        }

        await transporter.sendMail({
            from: `"TableTap Admin" <${process.env.SMTP_FROM_EMAIL}>`,
            to: cafeEmail,
            subject,
            html: htmlContent,
        });

        return new NextResponse('Email dispatched successfully', { status: 200 });
    } catch (error) {
        console.error('[System Email] Failed to send:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
