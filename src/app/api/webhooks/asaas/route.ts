
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';
import type { Plan } from '@/lib/types';

// Função para verificar a assinatura do webhook (segurança)
function verifyWebhookSignature(
  requestBody: string,
  signature: string | null
): boolean {
  const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn("[Asaas Webhook] ASAAS_WEBHOOK_SECRET não está configurada. Pulando verificação em ambiente de não produção.");
    if (process.env.NODE_ENV === 'production') {
        return false;
    }
    return true; 
  }
  
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(requestBody).digest('hex');
  
  // A API da Asaas pode enviar o signature sem o 'sha256='
  const signatureWithoutPrefix = signature.startsWith('sha256=') ? signature.substring(7) : signature;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureWithoutPrefix));
}


async function logWebhook(firestore: ReturnType<typeof getFirestore>, event: any, isSuccess: boolean) {
  try {
    const logData = {
      receivedAt: Timestamp.now(),
      eventType: event.event || 'unknown',
      payload: event,
      isSuccess,
      amount: event.payment?.value ? event.payment.value * 100 : null,
      customerEmail: null, 
    };

    if (event.payment?.customer) {
        try {
            const customerResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers/${event.payment.customer}`, {
                headers: { 'access_token': process.env.ASAAS_API_KEY! }
            });
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              if (customerData.email) {
                  logData.customerEmail = customerData.email;
              }
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

// Função para encontrar o userId usando diferentes métodos de fallback
async function findUserId(firestore: ReturnType<typeof getFirestore>, payment: any): Promise<string | null> {
    // 1. Tenta pelo externalReference (método principal)
    if (payment.externalReference) {
        return payment.externalReference;
    }

    // 2. Fallback: Tenta pelo customerId
    if (payment.customer) {
        const usersByCustomer = await firestore
          .collection('users')
          .where('subscription.paymentId', '==', payment.customer)
          .limit(1)
          .get();
        if (!usersByCustomer.empty) {
          return usersByCustomer.docs[0].id;
        }
    }

    // 3. Fallback: Tenta pelo checkoutId
    if (payment.checkoutSession) {
        const usersByCheckout = await firestore
          .collection('users')
          .where('subscription.checkoutId', '==', payment.checkoutSession)
          .limit(1)
          .get();
        if (!usersByCheckout.empty) {
          return usersByCheckout.docs[0].id;
        }
    }

    return null;
}

// Função para processar a confirmação de pagamento
async function processPaymentConfirmation(userRef: FirebaseFirestore.DocumentReference, payment: any) {
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new Error(`Usuário ${userRef.id} não encontrado no Firestore.`);
  }

  const planValue = payment.value;
  let plan: Plan = 'pro';
  let cycle: 'monthly' | 'annual' = 'monthly';

  if (planValue === 399) { cycle = 'annual'; plan = 'pro'; }
  else if (planValue === 499) { cycle = 'annual'; plan = 'premium'; }
  else if (planValue === 49.99) { cycle = 'monthly'; plan = 'premium'; }
  else if (planValue === 39.99) { cycle = 'monthly'; plan = 'pro'; }

  const now = new Date();
  const expiresAt = cycle === 'annual' 
    ? new Date(now.setFullYear(now.getFullYear() + 1))
    : new Date(now.setMonth(now.getMonth() + 1));

  const updatePayload: any = {
    'subscription.plan': plan,
    'subscription.status': 'active',
    'subscription.cycle': cycle,
    'subscription.expiresAt': Timestamp.fromDate(expiresAt),
    'subscription.lastPaymentStatus': 'confirmed',
    'subscription.lastUpdated': Timestamp.now(),
  };

  // Se o pagamento for de uma assinatura, salve o ID da assinatura
  if (payment.subscription) {
      updatePayload['subscription.asaasSubscriptionId'] = payment.subscription;
  }
  
  await userRef.update(updatePayload);


  await userRef.collection('paymentHistory').doc(payment.id).set({
    paymentId: payment.id,
    amount: payment.value,
    status: payment.status,
    paymentDate: Timestamp.fromDate(new Date(payment.paymentDate)),
    billingType: payment.billingType,
    invoiceUrl: payment.invoiceUrl,
    createdAt: Timestamp.now(),
  });
}


export async function POST(req: NextRequest) {
  const { firestore } = initializeFirebaseAdmin();
  let rawBody;
  
  try {
    rawBody = await req.text();
  } catch (error) {
     return NextResponse.json({ error: 'Falha ao ler o corpo da requisição.' }, { status: 400 });
  }
  
  const signature = req.headers.get('asaas-webhook-signature');
  if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('[Asaas Webhook] Assinatura inválida');
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
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

  if (!event.payment) {
      return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento.' });
  }

  const { payment } = event;
  const userId = await findUserId(firestore, payment);

  if (!userId) {
    console.warn('[Asaas Webhook] Received payment confirmation without a resolvable user ID.', payment);
    return NextResponse.json({ success: true, message: 'Event received, but could not resolve user ID.' });
  }
  
  const userRef = firestore.collection('users').doc(userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await processPaymentConfirmation(userRef, payment);
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
        console.log(`[Asaas Webhook] Evento não tratado: ${event.event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[Asaas Webhook] CRITICAL: Falha ao processar evento para usuário ${userId}:`, error);
    return NextResponse.json({ error: 'Falha ao processar o webhook.', details: error.message }, { status: 500 });
  }
}
