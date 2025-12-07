import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Plan } from '@/lib/types';

// Webhook para lidar com eventos de pagamento da Asaas

async function logWebhook(firestore: ReturnType<typeof getFirestore>, event: any, isSuccess: boolean) {
  try {
    const logData = {
      receivedAt: Timestamp.now(),
      eventType: event.event || 'unknown',
      payload: event,
      isSuccess,
      amount: event.payment?.value ? event.payment.value * 100 : null, // Asaas sends value as float
      customerEmail: null, // Asaas customer object does not have email directly
    };

    // Attempt to get customer details
    if (event.payment?.customer) {
        try {
            const customerResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers/${event.payment.customer}`, {
                headers: { 'access_token': process.env.ASAAS_API_KEY! }
            });
            const customerData = await customerResponse.json();
            if (customerData.email) {
                logData.customerEmail = customerData.email;
            }
        } catch(e) {
            console.warn(`[Asaas Webhook] Could not fetch customer details for ${event.payment.customer}`);
        }
    }

    await firestore.collection('webhookLogs').add(logData);
  } catch (error) {
    console.error('[Webhook Log] Failed to write log to Firestore:', error);
  }
}

export async function POST(req: NextRequest) {
  let event;
  const firestore = initializeFirebaseAdmin().firestore;

  try {
    event = await req.json();
  } catch (error) {
    console.error('[Asaas Webhook] Error parsing JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // TODO: Implement Asaas signature verification for security in production
  // const asaasSignature = req.headers.get('asaas-webhook-signature');
  // const secret = process.env.ASAAS_WEBHOOK_SECRET;
  // if (secret && !verifySignature(body, asaasSignature, secret)) {
  //   await logWebhook(firestore, event, false);
  //   return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
  // }

  // Log all incoming events for auditing
  await logWebhook(firestore, event, event.event === 'PAYMENT_CONFIRMED');

  if (event.event === 'PAYMENT_CONFIRMED') {
    const payment = event.payment;
    const customerId = payment?.customer;
    // Extract plan and cycle from metadata if available
    const plan = payment?.externalReference as Plan | undefined;
    const cycle = payment?.description?.toLowerCase().includes('anual') ? 'annual' : 'monthly';
    const paymentId = payment?.id;

    if (!customerId || !plan) {
        console.warn('[Asaas Webhook] Received payment confirmation without a customer ID or plan in externalReference.', payment);
        return NextResponse.json({ success: true, message: 'Event received, but missing customer ID or plan metadata.' });
    }

    try {
      // Find the user by the Asaas customer ID.
      // This assumes we will save the Asaas customerId on the user's profile in a future step.
      const usersRef = firestore.collection('users');
      const q = usersRef.where('subscription.paymentId', '==', customerId).limit(1);
      const userSnapshot = await q.get();

      if (userSnapshot.empty) {
        console.error(`[Asaas Webhook] CRITICAL: No user found with Asaas customerId: ${customerId}`);
        return NextResponse.json({ success: false, message: 'User not found for this customer.' });
      }

      const userDoc = userSnapshot.docs[0];
      const userRef = userDoc.ref;
      
      const now = new Date();
      let expiresAt: Date;

      if (cycle === 'annual') {
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
      } else { // monthly
        expiresAt = new Date(now.setMonth(now.getMonth() + 1));
      }

      const updatePayload = {
        'subscription.status': 'active',
        'subscription.plan': plan,
        'subscription.cycle': cycle,
        'subscription.expiresAt': Timestamp.fromDate(expiresAt),
        // We don't update paymentId here because the paymentId is the Asaas customer ID
      };

      await userRef.update(updatePayload);
       console.log(`[Asaas Webhook] SUCCESS: Subscription for user ${userDoc.id} updated to ${plan} (${cycle}).`);

    } catch (error) {
      console.error(`[Asaas Webhook] CRITICAL: Failed to update subscription in Firestore for customer ${customerId}:`, error);
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Webhook received.' });
}
