import { NextResponse } from 'next/server';
import { collection, getDocs, doc, writeBatch, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
    try {
        const payload = await request.json();

        if (!payload || !payload.version || !payload.collections) {
            return new NextResponse('Invalid backup payload', { status: 400 });
        }

        const collectionsToRestore = Object.keys(payload.collections);
        const validCollections = ['cafes', 'menuItems', 'orders', 'subscriptions', 'discounts', 'adminSettings'];

        // Validate payload collections
        for (const col of collectionsToRestore) {
            if (!validCollections.includes(col)) {
                console.warn(`[Restore DB] Unknown collection found in backup: ${col}`);
            }
        }

        // Process chunked batched writes
        let currentBatch = writeBatch(db);
        let operationCount = 0;

        const commitAndReset = async () => {
            if (operationCount > 0) {
                await currentBatch.commit();
                currentBatch = writeBatch(db);
                operationCount = 0;
            }
        };

        // 1. Wipe Existing Data
        for (const collectionName of validCollections) {
            const existingDocs = await getDocs(collection(db, collectionName));
            for (const docSnap of existingDocs.docs) {
                currentBatch.delete(docSnap.ref);
                operationCount++;

                if (operationCount === 450) {
                    await commitAndReset();
                }
            }
        }

        await commitAndReset(); // Ensure all deletions are committed before inserting

        // 2. Restore Old Data
        for (const collectionName of collectionsToRestore) {
            if (!validCollections.includes(collectionName)) continue; // skip unknown metrics

            const items = payload.collections[collectionName] || [];
            for (const item of items) {
                // If the item has an ID defined, reconstruct exactly. Otherwise generate a generic ref.
                const docRef = item.id ? doc(db, collectionName, item.id) : doc(collection(db, collectionName));

                currentBatch.set(docRef, item);
                operationCount++;

                if (operationCount === 450) {
                    await commitAndReset();
                }
            }
        }

        // 3. Commit remaining inserts
        await commitAndReset();

        return new NextResponse('Database restored completely', { status: 200 });

    } catch (error) {
        console.error('[Restore DB] Failed:', error);
        return new NextResponse('Internal Server Error while restoring database', { status: 500 });
    }
}
