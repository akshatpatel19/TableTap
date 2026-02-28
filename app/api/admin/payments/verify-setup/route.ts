import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const { cafeId, adminId, approved, adminPassword } = await request.json();

        console.log("Verify setup fee route called!");
        console.log("Received adminPassword:", adminPassword);
        console.log("Expected adminPassword:", process.env.NEXT_PUBLIC_ADMIN_PASSWORD);

        if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (!cafeId || !adminId || approved === undefined) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const cafeRef = adminDb.collection('cafes').doc(cafeId);
        const cafeSnap = await cafeRef.get();

        if (!cafeSnap.exists) {
            return new NextResponse('Cafe not found', { status: 404 });
        }

        const verificationTime = Date.now();

        // Find the pending setup payment
        const paymentsRef = adminDb.collection('subscription_payments');
        const pendingPaymentsQuery = paymentsRef
            .where('cafeId', '==', cafeId)
            .where('type', '==', 'setup')
            .where('status', '==', 'pending');

        const querySnapshot = await pendingPaymentsQuery.get();

        const batch = adminDb.batch();

        if (!querySnapshot.empty) {
            const paymentDoc = querySnapshot.docs[0];
            batch.update(paymentDoc.ref, {
                status: approved ? 'paid' : 'rejected',
                verifiedBy: adminId,
                verifiedAt: verificationTime,
            });
        }

        batch.update(cafeRef, {
            setupFeeStatus: approved ? 'paid' : 'rejected',
            setupFeeVerifiedAt: approved ? verificationTime : null, // Fix from undefined to null
        });

        await batch.commit();

        return NextResponse.json({ success: true, approved });

    } catch (error) {
        console.error('Error verifying setup payment:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
