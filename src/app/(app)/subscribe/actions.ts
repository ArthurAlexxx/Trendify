
'use server';

import { z } from 'zod';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseServerConfig } from '@/firebase/config';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
});

const PixChargeResponseSchema = z.object({
    id: z.string(),
    brCode: z.string(),
    brCodeBase64: z.string(),
    expiresAt: z.string(),
});

export type PixChargeResponse = z.infer<typeof PixChargeResponseSchema>;

type ActionState = {
  data?: PixChargeResponse;
  error?: string;
} | null;


// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: {
        projectId: firebaseServerConfig.projectId,
        clientEmail: firebaseServerConfig.clientEmail,
        privateKey: firebaseServerConfig.privateKey,
      },
    });
    console.log('[actions.ts] Firebase Admin initialized successfully.');
  } catch (e) {
    console.error('[actions.ts] Firebase Admin initialization error:', e);
  }
}
const auth = getAuth();
const firestore = getFirestore();


async function createPixCharge(
  input: z.infer<typeof formSchema>,
  userId: string,
): Promise<PixChargeResponse> {

  const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

  if (!ABACATE_API_KEY) {
    console.error('[createPixCharge] Abacate Pay API key is not configured.');
    throw new Error('Abacate Pay API key is not configured.');
  }

  const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
  
  const payload = {
    amount: 4900, // R$49,00 em centavos
    expiresIn: 3600, // 1 hora
    description: 'Assinatura Trendify PRO - 1 Mês',
    customer: {
      name: input.name,
      email: input.email,
      taxId: input.taxId,
      cellphone: '(99) 99999-9999', // Placeholder as it is required but not collected
    },
    metadata: {
      externalId: userId, // Passa o Firebase UID
      product: 'trendify-pro-monthly',
    },
  };

  console.log('[createPixCharge] Payload para Abacate Pay:', JSON.stringify(payload, null, 2));
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ABACATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log('[createPixCharge] Resposta recebida da Abacate Pay:', JSON.stringify(result, null, 2));
    
    if (result.error) {
        console.error('[createPixCharge] Abacate Pay Error:', result.error);
        throw new Error(result.error.message || 'Ocorreu um erro ao se comunicar com o gateway de pagamento.');
    }
    
    // Validate response with Zod
    const validatedData = PixChargeResponseSchema.parse(result.data);
    console.log('[createPixCharge] Cobrança PIX criada com sucesso. ID:', validatedData.id);
    return validatedData;

  } catch (error) {
    console.error('[createPixCharge] Erro na chamada da API para criar cobrança PIX:', error);
    if (error instanceof Error) {
        throw new Error(`Falha ao criar cobrança PIX: ${error.message}`);
    }
    throw new Error('Falha ao criar cobrança PIX: Erro desconhecido.');
  }
}

export async function createPixChargeAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  console.log('[createPixChargeAction] Ação iniciada.');

  // Get current user from server-side context
  const token = formData.get('__token') as string | null;
  if (!token) {
      console.error('[createPixChargeAction] Token de autorização não encontrado.');
      return { error: 'Usuário não autenticado.' };
  }

  let decodedToken;
  try {
      decodedToken = await auth.verifyIdToken(token);
      console.log(`[createPixChargeAction] Token verificado com sucesso para o UID: ${decodedToken.uid}`);
  } catch (e) {
      console.error('[createPixChargeAction] Falha na verificação do token:', e);
      return { error: 'Sessão inválida. Por favor, faça login novamente.' };
  }
  const userId = decodedToken.uid;


  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    console.error('[createPixChargeAction] Dados do formulário inválidos:', parsed.error.flatten());
    return { error: 'Dados do formulário inválidos. Verifique os campos e tente novamente.' };
  }
  
  console.log('[createPixChargeAction] Dados do formulário validados com sucesso.');

  try {
    const result = await createPixCharge(parsed.data, userId);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    console.error('[createPixChargeAction] Erro ao executar createPixCharge:', errorMessage);
    return { error: errorMessage };
  }
}
