
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

// Função para buscar os detalhes da assinatura (incluindo externalReference)
async function getSubscriptionDetails(subscriptionId: string): Promise<{ userId: string; plan: Plan; cycle: 'monthly' | 'annual'; } | null> {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
        console.error("[getSubscriptionDetails] ERRO CRÍTICO: ASAAS_API_KEY não configurada.");
        return null;
    }
    
    try {
        const response = await fetch(`https://sandbox.asaas.com/api/v3/subscriptions/${subscriptionId}`, {
            headers: { 'access_token': apiKey }
        });

        if (!response.ok) {
            console.error(`[getSubscriptionDetails] Falha ao buscar detalhes da assinatura ${subscriptionId}. Status: ${response.status}`);
            return null;
        }

        const subData: any = await response.json();

        if (subData.externalReference) {
            const externalRefData = JSON.parse(subData.externalReference);
            if (externalRefData.userId && externalRefData.plan && externalRefData.cycle) {
                console.log(`[getSubscriptionDetails] Dados encontrados via API para sub ${subscriptionId}:`, externalRefData);
                return externalRefData;
            }
        }
        
        console.warn(`[getSubscriptionDetails] externalReference não encontrado na assinatura ${subscriptionId}`);
        return null;

    } catch (e: any) {
        console.error(`[getSubscriptionDetails] Erro ao buscar/parsear detalhes da assinatura ${subscriptionId}:`, e);
        return null;
    }
}


// Função para encontrar o userId e os detalhes do plano
async function findUserInfo(firestore: ReturnType<typeof getFirestore>, eventPayload: any): Promise<{ userId: string; plan?: Plan; cycle?: 'monthly' | 'annual' } | null> {
    
    const entity = eventPayload.payment || eventPayload.subscription;

    // Método 1: Tenta extrair do externalReference do evento (mais comum para eventos de assinatura)
    if (entity?.externalReference) {
        try {
            const externalRefData = JSON.parse(entity.externalReference);
            if (externalRefData.userId && externalRefData.plan && externalRefData.cycle) {
                console.log(`[Webhook] Informações encontradas diretamente no externalReference do evento.`);
                return externalRefData;
            }
        } catch(e) {
             console.log("[Webhook] externalReference do evento não é um JSON válido. Tentando fallback.");
        }
    }
    
    // Método 2 (Fallback para Pagamentos de Assinatura):
    // Se o evento é um pagamento e tem um `subscriptionId`, busca os dados na assinatura.
    if (eventPayload.payment?.subscription) {
        console.log(`[Webhook] Pagamento sem externalReference, buscando na assinatura ${eventPayload.payment.subscription}...`);
        const subDetails = await getSubscriptionDetails(eventPayload.payment.subscription);
        if (subDetails) {
            return subDetails;
        }
    }
    
    // Método 3 (Último Recurso): Tenta encontrar o usuário pelo customerId salvo no perfil.
    if (entity?.customer) {
        const usersByCustomer = await firestore
          .collection('users')
          .where('subscription.paymentId', '==', entity.customer)
          .limit(1)
          .get();
        if (!usersByCustomer.empty) {
            const userId = usersByCustomer.docs[0].id;
            console.warn(`[Webhook] Fallback CRÍTICO: Usuário ${userId} encontrado pelo customerId, mas plano/ciclo são desconhecidos.`);
            return { userId }; // Retorna apenas o ID, o que levará a um erro controlado.
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
  
  const userInfo = await findUserInfo(firestore, event);

  if (!userInfo || !userInfo.userId) {
    console.warn('[Asaas Webhook] Não foi possível resolver o ID do usuário para o evento:', (event.payment?.id || event.subscription?.id));
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
