
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
// This ensures it's only initialized once.
if (!getApps().length) {
    // Check if running in Vercel production environment
    // and the JSON key is provided as a stringified environment variable.
    if (process.env.VERCEL_ENV && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
            const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            initializeApp({
                credential: cert(serviceAccount)
            });
        } catch (e) {
            console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
            // Fallback for local development or if JSON parsing fails
            initializeApp();
        }
    } else {
        // Fallback for local development using Application Default Credentials
        initializeApp();
    }
}

const firestore = getFirestore();

export async function POST(req: NextRequest) {
  const abacateSignature = req.headers.get('abacate-signature');
  const body = await req.text();
  const WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('ABACATE_WEBHOOK_SECRET is not set.');
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
  }

  if (!abacateSignature) {
    return NextResponse.json({ error: 'Signature missing.' }, { status: 400 });
  }

  // Verify the signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(body).digest('hex');
  
  if (digest !== abacateSignature) {
     return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
  }
  
  const event = JSON.parse(body);

  // Process only successful PIX QR code payments
  if (event.object === 'pix_qr_code' && event.event === 'pix_qr_code.paid') {
    const paymentData = event.data;
    const userId = paymentData.metadata?.externalId;
    const paymentId = paymentData.id;

    if (!userId) {
      console.warn('Webhook received for payment without userId in metadata.', paymentId);
      // Return 200 to acknowledge receipt and prevent retries
      return NextResponse.json({ success: true, message: 'Event received, but no userId found.' });
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      
      // Calculate expiration date (31 days from now)
      const now = new Date();
      const expiresAt = new Date(now.setDate(now.getDate() + 31));

      // Update user document
      await userRef.update({
        'subscription.status': 'active',
        'subscription.plan': 'pro',
        'subscription.expiresAt': Timestamp.fromDate(expiresAt),
        'subscription.paymentId': paymentId,
      });

      console.log(`User ${userId} subscription activated successfully.`);

    } catch (error) {
      console.error(`Failed to update subscription for user ${userId}:`, error);
      // Return 500 to indicate a server error, Abacate Pay might retry.
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  }

  // Acknowledge receipt of the webhook
  return NextResponse.json({ success: true });
}
