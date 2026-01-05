
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Plan } from '@/lib/types';
import fetch from 'node-fetch';


// Função para verificar o token de acesso (segurança)
function verifyAccessToken(req: NextRequest): boolean {
  const webhookToken = process.env.ASAAS_WEBHOOK_SECRET;

  if (!webhookToken) {
    console.error("[Asaas Webhook] CRITICAL: ASAAS_WEBHOOK_SECRET not configured.");
    return false;
  }
  
  const receivedToken = req.headers.get('asaas-access-token');

  if (!receivedToken) {
      console.error("[Asaas Webhook] Error: Missing 'asaas-access-token' header.");
      return false;
  }
  
  if (receivedToken === webhookToken) {
      return true;
  }
  
  console.error("[Asaas Webhook] Error: Invalid token received.");
  return false;
}


async function logWebhook(firestore: ReturnType<typeof getFirestore>, event: any, isSuccess: boolean) {
  try {
    const apiUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
    const logData = {
      receivedAt: Timestamp.now(),
      eventType: event.event || 'unknown',
      payload: event,
      isSuccess,
      amount: event.payment?.value || event.subscription?.value || null,
      customerEmail: null, 
    };
    
    const customerId = event.payment?.customer || event.subscription?.customer;

    if (customerId) {
        try {
            const customerResponse = await fetch(`${apiUrl}/customers/${customerId}`, {
                headers: { 'access_token': process.env.ASAAS_API_KEY! }
            });
            if (customerResponse.ok) {
              const customerData: any = await customerResponse.json();
              if (customerData.email) {
                  logData.customerEmail = customerData.email;
              }
            }
        } catch(e) {
            console.warn(`[Asaas Webhook] Could not fetch customer details for ${customerId}`);
        }
    }

    await firestore.collection('webhookLogs').add(logData);
  } catch (error) {
    console.error('[Webhook Log] Failed to write log to Firestore:', error);
  }
}

// Função para encontrar o userId usando diferentes métodos de fallback
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, payment: any): Promise<{ userId: string; plan: Plan; cycle: 'monthly' | 'annual' } | null> {
    
    // 1. Tenta via checkoutSession (quando existir — pagamentos iniciais)
    if (payment.checkoutSession) {
        const doc = await firestore.collection('asaasCheckouts').doc(payment.checkoutSession).get();
        if (doc.exists) {
            console.log(`[Webhook] User found by checkoutSession: ${doc.id}`);
            return doc.data() as { userId: string; plan: Plan; cycle: 'monthly' | 'annual' };
        }
    }

    // 2. Tenta via subscriptionId (pagamentos recorrentes)
    if (payment.subscription) {
        const snap = await firestore.collection('asaasCheckouts').where('asaasSubscriptionId', '==', payment.subscription).limit(1).get();
        if (!snap.empty) {
            console.log(`[Webhook] User found by asaasSubscriptionId: ${payment.subscription}`);
            return snap.docs[0].data() as { userId: string; plan: Plan; cycle: 'monthly' | 'annual' };
        }
    }

    // 3. Tenta via customerId (caso extremo)
    if (payment.customer) {
        const snap = await firestore.collection('asaasCheckouts').where('asaasCustomerId', '==', payment.customer).limit(1).get();
        if (!snap.empty) {
            console.log(`[Webhook] User found by asaasCustomerId: ${payment.customer}`);
            return snap.docs[0].data() as { userId: string; plan: Plan; cycle: 'monthly' | 'annual' };
        }
    }

    console.error(`[Webhook] ERROR: Could not resolve user for event.`);
    return null;
}


// Função para processar a confirmação de pagamento
async function processPaymentConfirmation(userRef: FirebaseFirestore.DocumentReference, payment: any, plan: Plan, cycle: 'monthly' | 'annual') {
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new Error(`User ${userRef.id} not found in Firestore.`);
  }

  const userData = userDoc.data();
  const now = new Date();
  
  const currentExpiresAt = userData?.subscription?.expiresAt?.toDate();
  const renewalBaseDate = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;

  let newExpiresAt: Date;
  if (cycle === 'annual') {
    newExpiresAt = new Date(renewalBaseDate);
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
  } else { // monthly
    newExpiresAt = new Date(renewalBaseDate);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
  }

  const updatePayload: any = {
    'subscription.plan': plan,
    'subscription.status': 'active',
    'subscription.cycle': cycle,
    'subscription.expiresAt': Timestamp.fromDate(newExpiresAt),
    'subscription.lastPaymentStatus': 'confirmed',
    'subscription.lastUpdated': Timestamp.now(),
    'subscription.trialEndsAt': null,
    'subscription.paymentId': payment.customer,
  };

  if (payment.subscription) {
      updatePayload['subscription.asaasSubscriptionId'] = payment.subscription;
  }
  
  await userRef.update(updatePayload);

  await userRef.collection('paymentHistory').doc(payment.id).set({
    paymentId: payment.id,
    amount: payment.value,
    status: payment.status,
    paymentDate: payment.paymentDate ? Timestamp.fromDate(new Date(payment.paymentDate)) : Timestamp.now(),
    billingType: payment.billingType,
    invoiceUrl: payment.invoiceUrl,
    createdAt: Timestamp.now(),
  });
}


export async function POST(req: NextRequest) {
  const { firestore } = initializeFirebaseAdmin();
  let rawBody;
  
  if (!verifyAccessToken(req)) {
      console.error('[Asaas Webhook] Invalid or missing access token.');
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    rawBody = await req.text();
  } catch (error) {
     return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error('[Asaas Webhook] Error parsing JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const isSuccessEvent = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event.event);
  await logWebhook(firestore, event, isSuccessEvent);
  
  // Apenas processa eventos de pagamento. Outros são logados e ignorados.
  if (!event.payment) {
       return NextResponse.json({ success: true, message: 'Event received, but not a payment event. No action needed.' });
  }
  
  // Passa o payload de pagamento para encontrar o usuário
  const userInfo = await findUserInfo(firestore, event.payment);

  if (!userInfo || !userInfo.userId) {
    console.warn('[Asaas Webhook] Could not resolve user info from payment payload.');
    return NextResponse.json({ success: true, message: 'Event received, but could not associate with a user or plan.' });
  }
  
  const userRef = firestore.collection('users').doc(userInfo.userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        if (!userInfo.plan || !userInfo.cycle) {
          throw new Error(`Plan (${userInfo.plan}) or cycle (${userInfo.cycle}) not found for user ${userInfo.userId}.`);
        }
        await processPaymentConfirmation(userRef, event.payment, userInfo.plan, userInfo.cycle);
        break;
      
      case 'PAYMENT_OVERDUE':
        await userRef.update({
          'subscription.status': 'inactive',
          'subscription.lastPaymentStatus': 'overdue',
          'subscription.lastUpdated': Timestamp.now(),
        });
        break;
      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
        await userRef.update({
          'subscription.status': 'inactive',
          'subscription.lastPaymentStatus': 'refunded',
          'subscription.lastUpdated': Timestamp.now(),
        });
        break;
      default:
        console.log(`[Asaas Webhook] Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[Asaas Webhook] CRITICAL: Failed to process event for user ${userInfo.userId}:`, error);
    return NextResponse.json({ error: 'Failed to process webhook.', details: error.message }, { status: 500 });
  }
}
