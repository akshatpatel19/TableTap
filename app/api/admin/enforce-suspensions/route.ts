import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { adminPassword } = await request.json();

        // This could be triggered by a Cron Job, so passing admin password/secret validates it.
        // If your host supports Cron Secrets, you should verify those too.
        if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const cafesRef = adminDb.collection('cafes');

        // Optimizing our query: just get active cafes. (Firestore can't easily compound `<` with `==` on different fields securely in a single sweep without a composite index sometimes, so we do in memory if needed).
        // Since we have an index on isActive, we grab those, and then iterate.
        const activeCafesQuery = cafesRef.where('isActive', '==', true);
        const querySnapshot = await activeCafesQuery.get();

        const cafes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

        const now = Date.now();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

        let processed = 0;
        let suspended = 0;

        // Since we are server-side, we should also check if base URL is defined to fetch
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const batch = adminDb.batch();
        const emailsToSend = [];

        for (const cafe of cafes) {
            if (cafe.setupFeeStatus !== 'paid') continue;

            const dueDate = cafe.nextMonthlyPaymentDueDate;
            if (!dueDate) continue;

            const cafeRef = adminDb.collection('cafes').doc(cafe.id);

            // 1. Upcoming Warning (3 days before due)
            if (now >= dueDate - THREE_DAYS_MS && now < dueDate && !cafe.upcomingPaymentEmailSentAt) {
                emailsToSend.push({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'upcoming' });
                batch.update(cafeRef, { upcomingPaymentEmailSentAt: now });
                processed++;
            }

            // 2. Overdue Warning (Day 0)
            if (now >= dueDate && now < dueDate + THIRTY_DAYS_MS - THREE_DAYS_MS && !cafe.overduePaymentEmailSentAt) {
                emailsToSend.push({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'overdue' });
                batch.update(cafeRef, { overduePaymentEmailSentAt: now });
                processed++;
            }

            // 3. Final Suspension Warning (Day 27 overdue, 3 days before block)
            if (now >= dueDate + THIRTY_DAYS_MS - THREE_DAYS_MS && now < dueDate + THIRTY_DAYS_MS && !cafe.suspensionWarningEmailSentAt) {
                emailsToSend.push({ cafeName: cafe.name, cafeEmail: cafe.email, notificationType: 'suspension_warning' });
                batch.update(cafeRef, { suspensionWarningEmailSentAt: now });
                processed++;
            }

            // 4. Execution Block
            if (now >= dueDate + THIRTY_DAYS_MS) {
                batch.update(cafeRef, { isActive: false });
                suspended++;
                processed++;
            }
        }

        if (processed > 0) {
            await batch.commit();
        }

        // Send all emails synchronously or fire-and-forget
        for (const email of emailsToSend) {
            try {
                await fetch(`${baseUrl}/api/admin/send-system-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(email)
                });
            } catch (err) {
                console.error('Failed to send email to', email.cafeEmail, err);
            }
        }

        return NextResponse.json({ success: true, processed, suspended });

    } catch (error) {
        console.error('Error enforcing suspensions:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
