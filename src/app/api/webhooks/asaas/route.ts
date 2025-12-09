
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
      customerEmail: null, 
    };

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

  // Log all incoming events for auditing
  // Determine if the event is a success type for logging
  const isSuccessEvent = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event.event);
  await logWebhook(firestore, event, isSuccessEvent);

  if (isSuccessEvent) {
    const payment = event.payment;
    const userId = payment?.externalReference;
    
    if (!userId) {
        console.warn('[Asaas Webhook] Received payment confirmation without a userId in externalReference.', payment);
        return NextResponse.json({ success: true, message: 'Event received, but missing user ID.' });
    }

    // Extrair plano e ciclo da descrição
    const description = payment?.description?.toLowerCase() || '';
    let plan: Plan | null = null;
    if (description.includes('pro')) plan = 'pro';
    if (description.includes('premium')) plan = 'premium';

    let cycle: 'monthly' | 'annual' | null = null;
    if (description.includes('anual') || description.includes('annual')) cycle = 'annual';
    if (description.includes('mensal') || description.includes('monthly')) cycle = 'monthly';
    
    if (!plan || !cycle) {
        console.warn(`[Asaas Webhook] Could not determine plan or cycle from description: '${description}'`);
        return NextResponse.json({ success: true, message: 'Could not determine plan or cycle.' });
    }

    try {
      const userRef = firestore.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
          console.error(`[Asaas Webhook] CRITICAL: No user found with ID: ${userId}`);
          return NextResponse.json({ success: false, message: 'User not found.' });
      }
      
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
      };

      await userRef.update(updatePayload);
       console.log(`[Asaas Webhook] SUCCESS: Subscription for user ${userId} updated to ${plan} (${cycle}).`);

    } catch (error) {
      console.error(`[Asaas Webhook] CRITICAL: Failed to update subscription in Firestore for user ${userId}:`, error);
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Webhook received.' });
}
