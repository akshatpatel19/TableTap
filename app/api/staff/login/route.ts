import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { cafeCode, password } = await request.json();

        if (!cafeCode || !password) {
            return NextResponse.json({ error: 'Missing cafe code or password' }, { status: 400 });
        }

        // Find cafe by cafeCode
        const cafesSnapshot = await adminDb.collection('cafes').where('cafeCode', '==', cafeCode).limit(1).get();
        if (cafesSnapshot.empty) {
            return NextResponse.json({ error: 'Invalid cafe code or password' }, { status: 401 });
        }

        const cafeDoc = cafesSnapshot.docs[0];
        const cafeId = cafeDoc.id;
        const cafeData = cafeDoc.data();

        // Get staff password from secrets subcollection
        const secretSnap = await adminDb.collection('cafes').doc(cafeId).collection('secrets').doc('staff').get();

        if (!secretSnap.exists) {
            return NextResponse.json({ error: 'Staff login not configured for this cafe' }, { status: 401 });
        }

        const secretData = secretSnap.data();
        if (secretData?.password !== password) {
            return NextResponse.json({ error: 'Invalid cafe code or password' }, { status: 401 });
        }

        // Create response
        const response = NextResponse.json({
            success: true,
            cafeSlug: cafeData.slug,
            cafeId: cafeId
        });

        // Set a secure HTTP-only cookie
        (await cookies()).set('staff_session', cafeId, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12, // 12 hours
            sameSite: 'lax',
        });

        return response;
    } catch (error) {
        console.error('Error in staff login:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
