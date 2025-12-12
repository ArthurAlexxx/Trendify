
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

// Função simplificada para obter informações do usuário a partir do payload do webhook.
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, eventPayload: any): Promise<{ userId: string; plan: Plan; cycle: 'monthly' | 'annual' } | null> {
    
    // Método 1: externalReference (o mais confiável, agora dentro do objeto de assinatura)
    const subscriptionId = eventPayload?.subscription;
    if (subscriptionId) {
        try {
            const response = await fetch(`https://sandbox.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
                 headers: { 'access_token': process.env.ASAAS_API_KEY! }
            });
            if (!response.ok) {
                 console.error(`[Webhook] Falha ao buscar detalhes da assinatura ${subscriptionId} para obter o externalReference.`);
            } else {
                 const subData: any = await response.json();
                 const externalRef = subData.externalReference;
                 if (externalRef) {
                    try {
                        const { userId, plan, cycle } = JSON.parse(externalRef);
                        if (userId && plan && cycle) {
                            console.log(`[Webhook] Informações encontradas no externalReference da assinatura: userId=${userId}, plan=${plan}, cycle=${cycle}`);
                            return { userId, plan, cycle };
                        }
                    } catch (e) {
                        console.warn(`[Webhook] externalReference da assinatura ${subscriptionId} não é um JSON válido.`);
                    }
                }
            }
        } catch (e: any) {
             console.error(`[Webhook] Erro ao buscar detalhes da assinatura ${subscriptionId}:`, e);
        }
    }


    // Método 2: Fallback para buscar pelo checkoutSession ID
    const checkoutId = eventPayload?.checkoutSession;
    if (checkoutId) {
        const usersByCheckout = await firestore
          .collection('users')
          .where('subscription.asaasCheckoutId', '==', checkoutId)
          .limit(1)
          .get();

        if (!usersByCheckout.empty) {
            const userId = usersByCheckout.docs[0].id;
            const userData = usersByCheckout.docs[0].data();
            console.log(`[Webhook] Fallback: Usuário encontrado pelo checkoutId: ${userId}`);

            // Precisamos do plano e ciclo, vamos buscar na assinatura
            if (subscriptionId) {
                try {
                    const response = await fetch(`https://sandbox.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
                         headers: { 'access_token': process.env.ASAAS_API_KEY! }
                    });
                     if (response.ok) {
                        const subData: any = await response.json();
                        const externalRef = subData.externalReference;
                        if (externalRef) {
                            const { plan, cycle } = JSON.parse(externalRef);
                            return { userId, plan, cycle };
                        }
                     }
                } catch(e) { console.error(e) }
            }
        }
    }

    console.error("[Webhook] ERRO: Não foi possível resolver o usuário para o evento.", eventPayload);
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
  
  const mainPaymentEntity = event.payment;
  
  if (!mainPaymentEntity) {
       return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento para processar.' });
  }
  
  const userInfo = await findUserInfo(firestore, mainPaymentEntity);

  if (!userInfo || !userInfo.userId || !userInfo.plan || !userInfo.cycle) {
    console.warn('[Asaas Webhook] Não foi possível resolver as informações do usuário a partir do payload.');
    return NextResponse.json({ success: true, message: 'Evento recebido, mas não foi possível associar a um usuário ou plano.' });
  }
  
  const userRef = firestore.collection('users').doc(userInfo.userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
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

    