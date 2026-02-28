import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { cafeId, paymentId, adminId, approved, adminPassword } = await request.json();

        if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!cafeId || !paymentId || !adminId || approved === undefined) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const cafeRef = adminDb.collection('cafes').doc(cafeId);
        const cafeSnap = await cafeRef.get();

        if (!cafeSnap.exists) {
            return new NextResponse('Cafe not found', { status: 404 });
        }

        const cafeData = cafeSnap.data();
        const verificationTime = Date.now();

        // Find the specific monthly payment
        const paymentsRef = adminDb.collection('subscription_payments');
        const paymentQuery = paymentsRef
            .where('cafeId', '==', cafeId)
            .where('id', '==', paymentId);

        const querySnapshot = await paymentQuery.get();

        const batch = adminDb.batch();

        if (!querySnapshot.empty) {
            const paymentDoc = querySnapshot.docs[0];
            batch.update(paymentDoc.ref, {
                status: approved ? 'paid' : 'rejected',
                verifiedBy: adminId,
                verifiedAt: verificationTime,
            });
        }

        const nextMonthlyDue = approved
            ? (cafeData?.nextMonthlyPaymentDueDate || Date.now()) + 30 * 24 * 60 * 60 * 1000
            : cafeData?.nextMonthlyPaymentDueDate;

        const updateData: any = {
            nextMonthlyPaymentDueDate: nextMonthlyDue,
            upcomingPaymentEmailSentAt: null,
            overduePaymentEmailSentAt: null,
            suspensionWarningEmailSentAt: null,
        };

        if (approved) {
            updateData.lastMonthlyPaymentDate = verificationTime;
        }

        batch.update(cafeRef, updateData);

        await batch.commit();

        return NextResponse.json({ success: true, approved });

    } catch (error) {
        console.error('Error verifying monthly payment:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
