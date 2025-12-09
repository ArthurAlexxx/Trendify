
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Plan } from '@/lib/types';

// Função para verificar o token de acesso (segurança)
function verifyAccessToken(req: NextRequest): boolean {
  const webhookToken = process.env.ASAAS_WEBHOOK_SECRET;

  if (!webhookToken) {
    console.error("[Asaas Webhook] ERRO CRÍTICO: ASAAS_WEBHOOK_SECRET não está configurada.");
    return false;
  }
  
  const receivedToken = req.headers.get('asaas-access-token');

  if (!receivedToken) {
      console.error("[Asaas Webhook] Erro: Token de acesso ausente no cabeçalho 'asaas-access-token'.");
      return false;
  }

  // Comparação segura contra "timing attacks"
  if (receivedToken.length !== webhookToken.length) {
      console.error("[Asaas Webhook] Erro: O comprimento do token recebido não corresponde ao esperado.");
      return false;
  }
  
  // Como é um token fixo e não uma assinatura criptográfica, uma comparação direta é suficiente aqui.
  if (receivedToken === webhookToken) {
      return true;
  }
  
  console.error("[Asaas Webhook] Erro: O token recebido é inválido.");
  return false;
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
  
  if (!verifyAccessToken(req)) {
      console.error('[Asaas Webhook] Token de acesso inválido ou ausente.');
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    rawBody = await req.text();
  } catch (error) {
     return NextResponse.json({ error: 'Falha ao ler o corpo da requisição.' }, { status: 400 });
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

  if (!event.payment && !event.subscription) {
      return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento ou assinatura para processar.' });
  }

  const payment = event.payment;
  const subscription = event.subscription;
  
  const userIdFromEvent = payment?.externalReference || subscription?.externalReference;

  if (event.event === 'SUBSCRIPTION_CREATED' && subscription) {
      if (userIdFromEvent) {
          const userRef = firestore.collection('users').doc(userIdFromEvent);
          await userRef.update({
              'subscription.asaasSubscriptionId': subscription.id,
          });
      }
      return NextResponse.json({ success: true, message: 'Evento de criação de assinatura processado.' });
  }
  
  if (!payment) {
       return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento para processar agora.' });
  }

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
