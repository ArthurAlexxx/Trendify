
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeAdmin() {
  console.log(`[webhook-init] Tentando inicializar Firebase Admin... Apps existentes: ${getApps().length}`);
  if (getApps().length) {
    console.log('[webhook-init] Usando app Firebase Admin existente.');
    return getApp();
  }

  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (process.env.VERCEL_ENV && creds) {
    console.log('[webhook-init] Ambiente Vercel detectado. Inicializando com credenciais de serviço JSON.');
     try {
        const serviceAccount = JSON.parse(creds);
         return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('[webhook-init] Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
        throw new Error('Falha ao inicializar Firebase Admin com JSON de credenciais.');
    }
  }
  
  console.error('[webhook-init] Falha na inicialização: Não é ambiente Vercel com credenciais ou já foi inicializado.');
  throw new Error('Configuração do Firebase Admin está incompleta para este ambiente.');
}

const adminApp = initializeAdmin();
const firestore = getFirestore(adminApp);


export async function POST(req: NextRequest) {
  const abacateSignature = req.headers.get('x-abacate-signature');
  const body = await req.text();
  const WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET;

  console.log('[webhook-post] Recebida nova requisição de webhook.');

  if (!WEBHOOK_SECRET) {
    console.error('[webhook-post] ERRO CRÍTICO: ABACATE_WEBHOOK_SECRET não está definido nas variáveis de ambiente.');
    return NextResponse.json({ error: 'Webhook secret is not configured.' }, { status: 500 });
  }
  console.log('[webhook-post] Webhook secret encontrado.');


  if (!abacateSignature) {
    console.error('[webhook-post] ERRO: Assinatura "x-abacate-signature" ausente no cabeçalho.');
    return NextResponse.json({ error: 'Signature missing.' }, { status: 400 });
  }
  console.log('[webhook-post] Assinatura "x-abacate-signature" encontrada no cabeçalho.');


  // Verify the signature
  try {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = hmac.update(body).digest('hex');
    
    if (digest !== abacateSignature) {
      console.error('[webhook-post] ERRO: Assinatura inválida. A requisição pode não ser da Abacate Pay.');
       return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
    }
  } catch (error) {
    console.error('[webhook-post] ERRO: Falha ao verificar a assinatura HMAC:', error);
    return NextResponse.json({ error: 'Could not verify signature.' }, { status: 500 });
  }
  
  console.log('[webhook-post] Assinatura verificada com sucesso.');
  
  let event;
  try {
    event = JSON.parse(body);
    console.log(`[webhook-post] Evento JSON parseado. Evento: '${event.event}'.`);
    console.log('[webhook-post] Payload completo:', body);
  } catch (error) {
     console.error('[webhook-post] ERRO: Corpo da requisição não é um JSON válido.');
     return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Process only successful payment events
  if (event.event === 'billing.paid') {
    console.log('[webhook-post] Processando evento "billing.paid".');
    const paymentData = event.data;
    const userId = paymentData?.pixQrCode?.metadata?.externalId;
    const paymentId = paymentData?.pixQrCode?.id;

    if (!userId) {
      console.warn(`[webhook-post] AVISO: Webhook 'billing.paid' recebido para paymentId ${paymentId || 'desconhecido'} sem userId nos metadados. Ignorando.`);
      // Return 200 to acknowledge receipt and prevent retries
      return NextResponse.json({ success: true, message: 'Event received, but no userId found.' });
    }
    console.log(`[webhook-post] userId "${userId}" encontrado nos metadados do pagamento ${paymentId}.`);


    try {
      const userRef = firestore.collection('users').doc(userId);
      
      // Calculate expiration date (31 days from now)
      const now = new Date();
      const expiresAt = new Date(now.setDate(now.getDate() + 31));

      console.log(`[webhook-post] Atualizando documento do usuário ${userId} no Firestore...`);
      await userRef.update({
        'subscription.status': 'active',
        'subscription.plan': 'pro',
        'subscription.expiresAt': Timestamp.fromDate(expiresAt),
        'subscription.paymentId': paymentId,
      });

      console.log(`[webhook-post] SUCESSO: Assinatura do usuário ${userId} ativada. Expira em: ${expiresAt.toISOString()}`);

    } catch (error) {
      console.error(`[webhook-post] ERRO CRÍTICO: Falha ao atualizar a assinatura para o usuário ${userId} no Firestore:`, error);
      // Return 500 to indicate a server error, Abacate Pay might retry.
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  } else {
    console.log(`[webhook-post] Evento do tipo '${event.event}' recebido. Nenhuma ação configurada para este evento.`);
  }

  // Acknowledge receipt of the webhook
  return NextResponse.json({ success: true, message: 'Webhook received and processed.' });
}
