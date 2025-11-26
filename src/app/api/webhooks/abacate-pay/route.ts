import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Plan } from '@/lib/types';

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
      console.error('[webhook-init] ERRO CRÍTICO: Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      throw new Error('Falha ao inicializar Firebase Admin com JSON de credenciais.');
    }
  }

  throw new Error('Configuração do Firebase Admin está incompleta. Verifique as variáveis de ambiente.');
}

const adminApp = initializeAdmin();
const firestore = getFirestore(adminApp);

/**
 * Verifies if the webhook signature matches the expected HMAC.
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
    const receivedSigBuffer = Buffer.from(signatureFromHeader, "base64");
    const expectedSigBuffer = Buffer.from(expectedSig, "base64");
    
    if (receivedSigBuffer.length !== expectedSigBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(receivedSigBuffer, expectedSigBuffer);
  } catch (e) {
    console.error('[verifyAbacateSignature] ERRO: Falha ao comparar assinaturas.', e);
    return false;
  }
}

async function logWebhook(event: any, isSuccess: boolean) {
  const logData = {
    receivedAt: Timestamp.now(),
    eventType: event.event || 'unknown',
    payload: event,
    isSuccess,
    amount: event.data?.pixQrCode?.amount || null,
    customerEmail: event.data?.customer?.email || event.data?.pixQrCode?.customer?.email || null,
  };
  await firestore.collection('webhookLogs').add(logData);
}


export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.text();
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read request body.' }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (error) {
     return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // --- Signature Verification ---
  if (event.devMode !== true) {
    const abacateSignature = req.headers.get('x-webhook-signature');
    if (!abacateSignature) {
       await logWebhook(event, false);
       return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 });
    }
    if (!verifyAbacateSignature(body, abacateSignature)) {
      await logWebhook(event, false);
      return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 403 });
    }
  }

  // Log the event before processing
  await logWebhook(event, event.event === 'billing.paid');
  
  // --- Event Processing ---
  if (event.event === 'billing.paid') {
    const paymentData = event.data;
    const userId = paymentData?.pixQrCode?.metadata?.externalId;
    const paymentId = paymentData?.pixQrCode?.id;
    const plan = paymentData?.pixQrCode?.metadata?.plan as Plan | undefined;
    const cycle = paymentData?.pixQrCode?.metadata?.cycle as 'monthly' | 'annual' | undefined;

    if (!userId || !plan || !cycle) {
      return NextResponse.json({ success: true, message: 'Evento recebido, mas metadados incompletos (userId, plan ou cycle ausente).' });
    }
    
    try {
      const userRef = firestore.collection('users').doc(userId);
      const now = new Date();
      let expiresAt: Date;

      if (cycle === 'annual') {
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
        expiresAt.setDate(expiresAt.getDate() + 1); // Add a grace day for leap years etc.
      } else { // monthly
        expiresAt = new Date(now.getTime());
        expiresAt.setDate(expiresAt.getDate() + 31);
      }

      const updatePayload = {
        'subscription.status': 'active',
        'subscription.plan': plan,
        'subscription.cycle': cycle,
        'subscription.expiresAt': Timestamp.fromDate(expiresAt),
        'subscription.paymentId': paymentId,
      };

      await userRef.update(updatePayload);
    } catch (error) {
      console.error(`[webhook-post] ERRO CRÍTICO: Falha ao atualizar a assinatura para o usuário ${userId} no Firestore:`, error);
      return NextResponse.json({ error: 'Falha ao processar a atualização da assinatura.' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Webhook recebido e processado.' });
}
