import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
    try {
        const collectionsToBackup = [
            'cafes',
            'menuItems',
            'orders',
            'subscriptions',
            'discounts',
            'adminSettings'
        ];

        const backupData: Record<string, any[]> = {};

        for (const collectionName of collectionsToBackup) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            backupData[collectionName] = querySnapshot.docs.map(doc => doc.data());
        }

        const payload = {
            version: '1.0',
            timestamp: Date.now(),
            collections: backupData
        };

        const jsonString = JSON.stringify(payload, null, 2);

        return new NextResponse(jsonString, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="tabletap_backup_${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        console.error('[Backup DB] Failed:', error);
        return new NextResponse('Internal Server Error while backing up database', { status: 500 });
    }
}
