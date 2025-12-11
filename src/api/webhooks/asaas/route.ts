
import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { Plan } from '@/lib/types';
import fetch from 'node-fetch';


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
      amount: event.payment?.value || event.subscription?.value || null,
      customerEmail: null, 
    };
    
    const customerId = event.payment?.customer || event.subscription?.customer;

    if (customerId) {
        try {
            const customerResponse = await fetch(`https://sandbox.asaas.com/api/v3/customers/${customerId}`, {
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

// Função para encontrar o userId e os detalhes do plano
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, eventPayload: any): Promise<{ userId: string; plan?: Plan; cycle?: 'monthly' | 'annual' } | null> {
    
    const checkoutId = eventPayload?.checkoutSession;

    if (checkoutId) {
        console.log(`[Webhook] Procurando usuário pelo checkoutId: ${checkoutId}`);
        const usersRef = firestore.collection('users');
        const q = usersRef.where('subscription.asaasCheckoutId', '==', checkoutId).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            const plan = userData.subscription?.pendingPlan;
            const cycle = userData.subscription?.pendingCycle;

            if (plan && cycle) {
                 console.log(`[Webhook] Usuário ${userDoc.id} encontrado via checkoutId com plano ${plan} e ciclo ${cycle}.`);
                 return { userId: userDoc.id, plan, cycle };
            }
            console.warn(`[Webhook] Usuário ${userDoc.id} encontrado via checkoutId, mas sem plano/ciclo pendente.`);
            return { userId: userDoc.id };
        }
    }
    
    // Fallback para customerId se o checkoutId falhar
    const customerId = eventPayload?.customer;
    if (customerId) {
        console.warn(`[Webhook] Fallback: Procurando usuário pelo customerId: ${customerId}`);
        const usersRef = firestore.collection('users');
        const q = usersRef.where('subscription.paymentId', '==', customerId).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
             return { 
                userId: userDoc.id, 
                plan: userData.subscription?.plan, // Usa o plano já salvo
                cycle: userData.subscription?.cycle,
            };
        }
    }


    console.error(`[Webhook] ERRO CRÍTICO: Não foi possível resolver o usuário para o evento.`);
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
    'subscription.asaasCheckoutId': null, // Limpa o ID de checkout após o uso
    'subscription.pendingPlan': null,
    'subscription.pendingCycle': null,
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
  
  // A entidade principal pode ser `payment` ou `subscription` dependendo do evento.
  const mainEntity = event.payment || event.subscription;
  
  const userInfo = await findUserInfo(firestore, mainEntity);

  if (!userInfo || !userInfo.userId) {
    console.warn('[Asaas Webhook] Não foi possível resolver o ID do usuário para o evento:', (mainEntity.id));
    return NextResponse.json({ success: true, message: 'Evento recebido, mas não foi possível associar a um usuário.' });
  }
  
  const userRef = firestore.collection('users').doc(userInfo.userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        if (!userInfo.plan || !userInfo.cycle) {
             throw new Error(`Plano (${userInfo.plan}) ou ciclo (${userInfo.cycle}) não encontrados para o usuário ${userInfo.userId}.`);
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
        console.log(`[Asaas Webhook] Evento não tratado: ${event.event}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[Asaas Webhook] CRÍTICO: Falha ao processar evento para usuário ${userInfo.userId}:`, error);
    return NextResponse.json({ error: 'Falha ao processar o webhook.', details: error.message }, { status: 500 });
  }
}
