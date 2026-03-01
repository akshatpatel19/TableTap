import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { cafeId } = await request.json();
        if (!cafeId) {
            return NextResponse.json({ error: 'Missing cafe ID' }, { status: 400 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Verify user owns the cafe
        const cafeDoc = await adminDb.collection('cafes').doc(cafeId).get();
        if (!cafeDoc.exists || cafeDoc.data()?.email !== decodedToken.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Set cookie
        (await cookies()).set('staff_session', cafeId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12, // 12 hours
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in staff session bypass:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
