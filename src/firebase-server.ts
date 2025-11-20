// IMPORTANT: This file is used for server-side Firebase operations.
// It uses the Firebase Admin SDK, which has different initialization
// and authentication mechanisms than the client-side SDK.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : {};

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const auth = getAuth(getApp());
export const firestore = getFirestore(getApp());
