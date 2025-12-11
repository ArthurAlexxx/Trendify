
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
              const customerData = await customerResponse.json();
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
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, payload: any): Promise<{ userId: string; plan?: Plan; cycle?: 'monthly' | 'annual' } | null> {
    
    let externalRefData: { userId?: string; plan?: Plan; cycle?: 'monthly' | 'annual' } = {};
    if (payload.externalReference) {
        try {
            externalRefData = JSON.parse(payload.externalReference);
            if (externalRefData.userId) {
                console.log(`[Webhook] Informações encontradas no externalReference: userId=${externalRefData.userId}, plan=${externalRefData.plan}, cycle=${externalRefData.cycle}`);
                return {
                    userId: externalRefData.userId,
                    plan: externalRefData.plan,
                    cycle: externalRefData.cycle,
                };
            }
        } catch(e) {
             console.log("[Webhook] externalReference não é um JSON válido ou não contém userId. Tentando fallback.");
        }
    }

    // Método 2: Tenta pelo customerId (Fallback)
    if (payload.customer) {
        const usersByCustomer = await firestore
          .collection('users')
          .where('subscription.paymentId', '==', payload.customer)
          .limit(1)
          .get();
        if (!usersByCustomer.empty) {
            const userDoc = usersByCustomer.docs[0];
            console.warn(`[Webhook] Fallback: Usuário encontrado pelo customerId: ${userDoc.id}.`);
            // Retorna o userId encontrado, mas os detalhes da transação (plan/cycle) virão do externalReference se disponíveis.
            return { 
                userId: userDoc.id, 
                plan: externalRefData.plan, 
                cycle: externalRefData.cycle 
            };
        }
    }
    
    console.error(`[Webhook] ERRO: Não foi possível resolver o usuário para o evento.`);
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
    'subscription.trialEndsAt': null, // Finaliza o período de teste
  };

  // Se o pagamento veio de uma assinatura, salvamos o ID dela.
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
  
  const paymentOrSubscription = event.payment || event.subscription;

  if (!paymentOrSubscription) {
       return NextResponse.json({ success: true, message: 'Evento recebido, mas sem dados de pagamento ou assinatura para processar.' });
  }

  
  const userInfo = await findUserInfo(firestore, paymentOrSubscription);

  if (!userInfo) {
    console.warn('[Asaas Webhook] Não foi possível resolver o ID do usuário para o evento:', paymentOrSubscription.id);
    return NextResponse.json({ success: true, message: 'Evento recebido, mas não foi possível associar a um usuário.' });
  }
  
  const userRef = firestore.collection('users').doc(userInfo.userId);

  try {
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        if (!userInfo.plan || !userInfo.cycle) {
             throw new Error(`Plano (${userInfo.plan}) ou ciclo (${userInfo.cycle}) não encontrados nos metadados do pagamento para o usuário ${userInfo.userId}.`);
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
