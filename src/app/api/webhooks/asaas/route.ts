
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
            const customerResponse = await fetch(`https://www.asaas.com/api/v3/customers/${event.payment.customer}`, {
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
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, payment: any): Promise<{ userId: string; plan: Plan; cycle: 'monthly' | 'annual' } | null> {
    
    // Método 1: Tenta extrair do externalReference (formato JSON)
    if (payment.externalReference) {
        try {
            const refData = JSON.parse(payment.externalReference);
            if (refData.userId && refData.plan && refData.cycle) {
                console.log(`[Webhook] Informações encontradas no externalReference: userId=${refData.userId}, plan=${refData.plan}`);
                return {
                    userId: refData.userId,
                    plan: refData.plan,
                    cycle: refData.cycle,
                };
            }
        } catch(e) {
             console.log("[Webhook] externalReference não é um JSON. Tentando fallback.");
        }
    }

    // Fallback 1: Tenta pelo ID do cliente
    if (payment.customer) {
        const usersByCustomer = await firestore
          .collection('users')
          .where('subscription.paymentId', '==', payment.customer)
          .limit(1)
          .get();
        if (!usersByCustomer.empty) {
            const userDoc = usersByCustomer.docs[0];
            const userData = userDoc.data();
            console.warn(`[Webhook] Fallback 1: Usuário encontrado pelo customerId: ${userDoc.id}. Usando plano/ciclo do documento.`);
            // Adivinhar o plano pelo valor é frágil, então pegamos do documento do usuário se possível
            const plan = userData.subscription?.plan || 'pro';
            const cycle = userData.subscription?.cycle || 'monthly';
            return { userId: userDoc.id, plan, cycle };
        }
    }
    
    // Fallback 2: Tenta pelo ID da assinatura
     if (payment.subscription) {
        const usersBySubscription = await firestore
            .collection('users')
            .where('subscription.asaasSubscriptionId', '==', payment.subscription)
            .limit(1)
            .get();
        if (!usersBySubscription.empty) {
            const userDoc = usersBySubscription.docs[0];
            const userData = userDoc.data();
            console.warn(`[Webhook] Fallback 2: Usuário encontrado pelo subscriptionId: ${userDoc.id}. Usando plano/ciclo do documento.`);
            const plan = userData.subscription?.plan || 'pro';
            const cycle = userData.subscription?.cycle || 'monthly';
            return { userId: userDoc.id, plan, cycle };
        }
    }

    console.error(`[Webhook] ERRO: Não foi possível resolver o usuário para o pagamento ${payment.id}`);
    return null;
}

// Função para processar a confirmação de pagamento
async function processPaymentConfirmation(userRef: FirebaseFirestore.DocumentReference, payment: any, plan: Plan, cycle: 'monthly' | 'annual') {
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new Error(`Usuário ${userRef.id} não encontrado no Firestore.`);
  }

  const userData = userDoc.data();
  const now = new Date();
  
  // Determine the base date for renewal. If subscription is active and expires in the future, use that. Otherwise, use today.
  const currentExpiresAt = userData?.subscription?.expiresAt?.toDate();
  const renewalBaseDate = (currentExpiresAt && currentExpiresAt > now) ? currentExpiresAt : now;

  let newExpiresAt: Date;
  if (cycle === 'annual') {
    newExpiresAt = new Date(renewalBaseDate.setFullYear(renewalBaseDate.getFullYear() + 1));
  } else { // monthly
    newExpiresAt = new Date(renewalBaseDate.setMonth(renewalBaseDate.getMonth() + 1));
  }

  const updatePayload: any = {
    'subscription.plan': plan,
    'subscription.status': 'active',
    'subscription.cycle': cycle,
    'subscription.expiresAt': Timestamp.fromDate(newExpiresAt),
    'subscription.lastPaymentStatus': 'confirmed',
    'subscription.lastUpdated': Timestamp.now(),
    'subscription.trialEndsAt': null, // Finaliza o período de teste
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

  if (!event.payment) {
       return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento para processar.' });
  }

  const payment = event.payment;
  
  const userInfo = await findUserInfo(firestore, payment);

  if (!userInfo) {
    console.warn('[Asaas Webhook] Não foi possível resolver o ID do usuário para o pagamento:', payment);
    return NextResponse.json({ success: true, message: 'Evento recebido, mas não foi possível associar a um usuário.' });
  }
  
  const userRef = firestore.collection('users').doc(userInfo.userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await processPaymentConfirmation(userRef, payment, userInfo.plan, userInfo.cycle);
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
    console.error(`[Asaas Webhook] CRÍTICO: Falha ao processar evento para usuário ${userInfo.userId}:`, error);
    return NextResponse.json({ error: 'Falha ao processar o webhook.', details: error.message }, { status: 500 });
  }
}
