import * as admin from 'firebase-admin';

// Read service account details from environment variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin details not fully provided in env variables. Admin SDK may fail to initialize correctly.');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const adminDb = admin.firestore();

export { adminDb };
