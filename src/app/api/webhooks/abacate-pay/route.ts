
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeAdmin() {
  if (getApps().length) {
    return getApp();
  }

  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (creds) {
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

  console.error('[webhook-init] Falha na inicialização: Credenciais de serviço não encontradas.');
  throw new Error('Configuração do Firebase Admin está incompleta para este ambiente.');
}

const adminApp = initializeAdmin();
const firestore = getFirestore(adminApp);

/**
 * Verifies if the webhook signature matches the expected HMAC.
 * @param rawBody Raw request body string.
 * @param signatureFromHeader The signature received from `X-Webhook-Signature`.
 * @returns true if the signature is valid, false otherwise.
 */
function verifyAbacateSignature(rawBody: string, signatureFromHeader: string): boolean {
  const ABACATE_PUBLIC_KEY = process.env.ABACATE_PUBLIC_KEY;
  if (!ABACATE_PUBLIC_KEY) {
    console.error("[verifyAbacateSignature] ERRO CRÍTICO: ABACATE_PUBLIC_KEY não está definida.");
    return false;
  }

  const bodyBuffer = Buffer.from(rawBody, "utf8");

  const expectedSig = crypto
    .createHmac("sha256", ABACATE_PUBLIC_KEY)
    .update(bodyBuffer)
    .digest("base64");

  try {
    // Use crypto.timingSafeEqual to prevent timing attacks
    const a = Buffer.from(expectedSig);
    const b = Buffer.from(signatureFromHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false; // Return false if signatureFromHeader is not a valid base64 string
  }
}


export async function POST(req: NextRequest) {
  const body = await req.text();
  console.log('[webhook-post] Recebida nova requisição de webhook.');

  let event;
  try {
    event = JSON.parse(body);
    console.log(`[webhook-post] Evento JSON parseado. Evento: '${event.event}'.`);
  } catch (error) {
     console.error('[webhook-post] ERRO: Corpo da requisição não é um JSON válido.');
     return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // --- Signature Verification ---
  if (event.devMode === true) {
    console.warn('[webhook-post] AVISO: Requisição em devMode. A verificação de assinatura foi pulada.');
  } else {
    const abacateSignature = req.headers.get('x-webhook-signature');
    if (!abacateSignature) {
      console.error('[webhook-post] ERRO: Assinatura "x-webhook-signature" ausente no cabeçalho.');
      return NextResponse.json({ error: 'Signature missing.' }, { status: 400 });
    }
    console.log('[webhook-post] Assinatura "x-webhook-signature" encontrada no cabeçalho.');
    
    if (!verifyAbacateSignature(body, abacateSignature)) {
      console.error('[webhook-post] ERRO: Assinatura inválida. A requisição pode não ser da Abacate Pay.');
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 });
    }
    console.log('[webhook-post] Assinatura verificada com sucesso.');
  }
  
  // --- Event Processing ---
  if (event.event === 'billing.paid') {
    console.log('[webhook-post] Processando evento "billing.paid".');
    const paymentData = event.data;
    const userId = paymentData?.pixQrCode?.metadata?.externalId;
    const paymentId = paymentData?.pixQrCode?.id;

    if (!userId) {
      console.warn(`[webhook-post] AVISO: Webhook 'billing.paid' recebido para paymentId ${paymentId || 'desconhecido'} sem userId nos metadados. Ignorando.`);
      return NextResponse.json({ success: true, message: 'Event received, but no userId found.' });
    }
    console.log(`[webhook-post] userId "${userId}" encontrado nos metadados do pagamento ${paymentId}.`);


    try {
      const userRef = firestore.collection('users').doc(userId);
      
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
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  } else {
    console.log(`[webhook-post] Evento do tipo '${event.event}' recebido. Nenhuma ação configurada para este evento.`);
  }

  return NextResponse.json({ success: true, message: 'Webhook received and processed.' });
}
