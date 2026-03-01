import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (e) {
            console.error('Token verification failed:', e);
            return new NextResponse('Invalid token', { status: 401 });
        }

        const ownerEmail = decodedToken.email;

        const { cafeId, staffPassword } = await request.json();
        if (!cafeId || !staffPassword) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const cafeRef = adminDb.collection('cafes').doc(cafeId);
        const cafeSnap = await cafeRef.get();

        if (!cafeSnap.exists) {
            return new NextResponse('Cafe not found', { status: 404 });
        }

        const cafeData = cafeSnap.data();
        if (cafeData?.email !== ownerEmail) {
            return new NextResponse('Forbidden: You do not own this cafe', { status: 403 });
        }

        // Save password in secrets subcollection
        await cafeRef.collection('secrets').doc('staff').set({
            password: staffPassword,
            updatedAt: Date.now()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting staff password:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
