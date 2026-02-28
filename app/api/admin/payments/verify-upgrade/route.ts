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

        const upgradePaymentsRef = adminDb.collection('table_upgrade_payments');
        const paymentQuery = upgradePaymentsRef
            .where('cafeId', '==', cafeId)
            .where('id', '==', paymentId);

        const querySnapshot = await paymentQuery.get();

        if (querySnapshot.empty) {
            return new NextResponse('Payment not found', { status: 404 });
        }

        const paymentDoc = querySnapshot.docs[0];
        const upgradePayment = paymentDoc.data();
        const verificationTime = Date.now();

        const batch = adminDb.batch();

        batch.update(paymentDoc.ref, {
            status: approved ? 'paid' : 'rejected',
            verifiedBy: adminId,
            verifiedAt: verificationTime,
        });

        if (approved) {
            batch.update(cafeRef, {
                tables: upgradePayment.newTableCount,
            });
        }

        await batch.commit();

        return NextResponse.json({ success: true, approved });

    } catch (error) {
        console.error('Error verifying upgrade payment:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
