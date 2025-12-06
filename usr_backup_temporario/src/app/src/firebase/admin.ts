
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// This function is intended for server-side use only (e.g., API Routes, Server Actions).
export function initializeFirebaseAdmin(): { app: App; auth: ReturnType<typeof getAuth>; firestore: ReturnType<typeof getFirestore> } {
  if (getApps().length > 0) {
    const app = getApps()[0];
    return { app, auth: getAuth(app), firestore: getFirestore(app) };
  }

  // Check if running in a server environment where GOOGLE_APPLICATION_CREDENTIALS_JSON is set (e.g., Vercel)
  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (creds) {
    try {
        const serviceAccount = JSON.parse(creds);
        const app = initializeApp({
            credential: cert(serviceAccount),
        });
        return { app, auth: getAuth(app), firestore: getFirestore(app) };
    } catch (e) {
        console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", e);
        // Fallback or throw an error
    }
  }

  // Fallback for local development or other environments where Application Default Credentials are set
  // e.g., via `gcloud auth application-default login`
  const app = initializeApp();
  return { app, auth: getAuth(app), firestore: getFirestore(app) };
}
