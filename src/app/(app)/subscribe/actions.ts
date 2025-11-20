
'use server';

import { z } from 'zod';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';
import { firebaseConfig } from '@/firebase/config';

console.log('[actions.ts] File loaded.');

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
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
function initializeAdmin() {
  if (getApps().length) {
    return getApp();
  }

  // Vercel environment.
  if (process.env.VERCEL_ENV && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.log('[actions.ts] Vercel environment detected. Initializing with service account.');
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // Fallback for local development or other environments
  console.log('[actions.ts] Local environment detected. Initializing with config object.');
  return initializeApp({
    credential: cert(firebaseConfig),
  });
}

async function createPixCharge(
  input: z.infer<typeof formSchema>,
  userId: string
): Promise<PixChargeResponse> {
  console.log('[createPixCharge] Iniciando criação de cobrança PIX...');
  const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

  if (!ABACATE_API_KEY) {
    console.error(
      '[createPixCharge] Erro: Chave de API do Abacate Pay não configurada.'
    );
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
      cellphone: input.cellphone,
    },
    metadata: {
      externalId: userId, // Passa o Firebase UID
      product: 'trendify-pro-monthly',
    },
  };

  console.log(
    '[createPixCharge] Payload enviado para Abacate Pay:',
    JSON.stringify(payload, null, 2)
  );

  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ABACATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    console.log(
      '[createPixCharge] Resposta recebida da Abacate Pay:',
      JSON.stringify(result, null, 2)
    );

    if (result.error) {
      console.error('[createPixCharge] Erro da API Abacate Pay:', result.error);
      throw new Error(
        result.error.message ||
          'Ocorreu um erro ao se comunicar com o gateway de pagamento.'
      );
    }

    // Validate response with Zod
    const validatedData = PixChargeResponseSchema.parse(result.data);
    console.log('[createPixCharge] Cobrança PIX criada com sucesso.');
    return validatedData;
  } catch (error) {
    console.error('[createPixCharge] Erro crítico ao criar cobrança PIX:', error);
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

  let userId: string;
  try {
    const adminApp = initializeAdmin();
    const auth = getAuth(adminApp);
    const sessionCookie = cookies().get('__session')?.value;

    if (!sessionCookie) {
      throw new Error('Sessão não encontrada. Faça login novamente.');
    }
    
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    userId = decodedToken.uid;
    console.log(`[createPixChargeAction] Token verificado com sucesso para o UID: ${userId}`);
  } catch (e: any) {
    console.error('[createPixChargeAction] Falha na verificação da sessão:', e.message);
    return { error: 'Sessão inválida ou expirada. Por favor, faça login novamente.' };
  }

  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    console.error(
      '[createPixChargeAction] Erro de validação do formulário:',
      parsed.error.issues
    );
    return {
      error:
        'Dados do formulário inválidos. Verifique os campos e tente novamente.',
    };
  }

  console.log('[createPixChargeAction] Dados do formulário validados:', parsed.data);

  try {
    const result = await createPixCharge(parsed.data, userId);
    console.log('[createPixChargeAction] Ação concluída com sucesso.');
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    console.error(
      `[createPixChargeAction] Erro ao chamar createPixCharge: ${errorMessage}`
    );
    return { error: errorMessage };
  }
}

    