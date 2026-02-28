import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Simple in-memory rate limiting map for basic protection.
// In a full production scale with multiple serverless instances, 
// you would use Redis (Upstash) or similar for distributed rate limiting.
const ipRequestCounts = new Map<string, { count: number, resetTime: number }>();
const ipRequestsWindowMs = 60 * 1000; // 1 minute window
const maxRequestsPerIpMinute = 5; // Allow 5 orders per minute per IP to prevent spam

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const now = Date.now();

        if (ip !== 'unknown') {
            const limitRecord = ipRequestCounts.get(ip);

            if (limitRecord) {
                if (now > limitRecord.resetTime) {
                    // Reset window
                    ipRequestCounts.set(ip, { count: 1, resetTime: now + ipRequestsWindowMs });
                } else if (limitRecord.count >= maxRequestsPerIpMinute) {
                    return new NextResponse('Rate limit exceeded. Try again in a minute.', { status: 429 });
                } else {
                    // Increment count
                    limitRecord.count += 1;
                    ipRequestCounts.set(ip, limitRecord);
                }
            } else {
                ipRequestCounts.set(ip, { count: 1, resetTime: now + ipRequestsWindowMs });
            }
        }

        const orderData = await request.json();

        // Validate basic requirements
        if (!orderData.cafeId || !orderData.items || orderData.items.length === 0) {
            return new NextResponse('Invalid order data', { status: 400 });
        }

        const cafeRef = adminDb.collection('cafes').doc(orderData.cafeId);
        const orderRef = adminDb.collection('orders').doc();

        const newOrder = {
            ...orderData,
            id: orderRef.id,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Use a transaction in admin SDK to safely increment counters
        await adminDb.runTransaction(async (transaction) => {
            const cafeDoc = await transaction.get(cafeRef);
            if (!cafeDoc.exists) {
                throw new Error('Cafe not found');
            }

            transaction.set(orderRef, newOrder);

            const data = cafeDoc.data();
            const currentActive = data?.activeOrdersCount || 0;
            const currentTotal = data?.totalOrdersCount || 0;

            transaction.update(cafeRef, {
                activeOrdersCount: currentActive + 1,
                totalOrdersCount: currentTotal + 1,
            });
        });

        return NextResponse.json({ success: true, orderId: orderRef.id, order: newOrder });

    } catch (error) {
        console.error('Error creating order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
