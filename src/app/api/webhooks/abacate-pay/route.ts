
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeAdmin() {
  console.log('[webhook-init] Tentando inicializar Firebase Admin... Apps existentes:', getApps().length);
  if (getApps().length) {
    console.log('[webhook-init] Firebase Admin já inicializado.');
    return getApp();
  }

  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (creds) {
    console.log('[webhook-init] Ambiente Vercel detectado. Inicializando com credenciais de serviço JSON.');
    try {
      const serviceAccount = JSON.parse(creds);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error('[webhook-init] ERRO CRÍTICO: Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      throw new Error('Falha ao inicializar Firebase Admin com JSON de credenciais.');
    }
  }

  console.error('[webhook-init] ERRO CRÍTICO: Credenciais de serviço não encontradas. Verifique a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON.');
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
    console.error("[verifyAbacateSignature] ERRO CRÍTICO: ABACATE_PUBLIC_KEY não está definida nas variáveis de ambiente.");
    return false;
  }
  console.log("[verifyAbacateSignature] Chave pública encontrada. Iniciando verificação.");


  const bodyBuffer = Buffer.from(rawBody, "utf8");

  const expectedSig = crypto
    .createHmac("sha256", ABACATE_PUBLIC_KEY)
    .update(bodyBuffer)
    .digest("base64");

  try {
    const receivedSigBuffer = Buffer.from(signatureFromHeader, "base64");
    const expectedSigBuffer = Buffer.from(expectedSig, "base64");
    
    if (receivedSigBuffer.length !== expectedSigBuffer.length) {
        console.warn(`[verifyAbacateSignature] Falha na verificação: tamanho das assinaturas não corresponde. Recebida: ${receivedSigBuffer.length}, Esperada: ${expectedSigBuffer.length}`);
        return false;
    }

    const isSignatureValid = crypto.timingSafeEqual(receivedSigBuffer, expectedSigBuffer);
    console.log(`[verifyAbacateSignature] Resultado da verificação (timingSafeEqual): ${isSignatureValid}`);

    return isSignatureValid;
  } catch (e) {
    console.error('[verifyAbacateSignature] ERRO: Falha ao comparar assinaturas. A assinatura recebida pode não ser um base64 válido.', e);
    return false;
  }
}


export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.text();
    console.log(`[webhook-post] Recebida nova requisição. Corpo: ${body}`);
  } catch (error) {
    console.error('[webhook-post] ERRO: Não foi possível ler o corpo da requisição.');
    return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
    console.log(`[webhook-post] Evento JSON parseado com sucesso. Evento: '${event.event}'.`);
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
    console.log('[webhook-post] Assinatura HMAC verificada com sucesso.');
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
      // Adiciona 31 dias para garantir que cobre o mês inteiro, independentemente do mês
      const expiresAt = new Date(now.getTime());
      expiresAt.setDate(expiresAt.getDate() + 31);

      const updatePayload = {
        'subscription.status': 'active',
        'subscription.plan': 'pro',
        'subscription.expiresAt': Timestamp.fromDate(expiresAt),
        'subscription.paymentId': paymentId,
      };

      console.log(`[webhook-post] Preparando para atualizar o documento do usuário ${userId} no Firestore com o payload:`, JSON.stringify(updatePayload));
      
      await userRef.update(updatePayload);

      console.log(`[webhook-post] SUCESSO: Assinatura do usuário ${userId} ativada. Expira em: ${expiresAt.toISOString()}`);

    } catch (error) {
      console.error(`[webhook-post] ERRO CRÍTICO: Falha ao atualizar a assinatura para o usuário ${userId} no Firestore:`, error);
      return NextResponse.json({ error: 'Failed to process subscription update.' }, { status: 500 });
    }
  } else {
    console.log(`[webhook-post] Evento do tipo '${event.event}' recebido. Nenhuma ação configurada para este evento.`);
  }

  console.log('[webhook-post] Processamento do webhook concluído com sucesso.');
  return NextResponse.json({ success: true, message: 'Webhook received and processed.' });
}
