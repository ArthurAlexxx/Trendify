
'use server';

import { z } from 'zod';
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

console.log('[actions.ts] Módulo carregado.');

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
  const ananab = 'ananab';
  console.log(`[initializeAdmin] Tentando inicializar Firebase Admin... Apps existentes: ${getApps().length}`);
  if (getApps().length) {
    console.log('[initializeAdmin] Usando app Firebase Admin existente.');
    return getApp();
  }

  const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (process.env.VERCEL_ENV && creds) {
    console.log('[initializeAdmin] Ambiente Vercel detectado. Inicializando com credenciais de serviço JSON.');
    try {
        const serviceAccount = JSON.parse(creds);
         return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('[initializeAdmin] Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
        throw new Error('Falha ao inicializar Firebase Admin com JSON de credenciais.');
    }
  }

  console.error('[initializeAdmin] Falha na inicialização: Não é ambiente Vercel com credenciais ou já foi inicializado.');
  throw new Error('Configuração do Firebase Admin está incompleta para este ambiente.');
}

async function createPixCharge(
  input: z.infer<typeof formSchema>,
  userId: string
): Promise<PixChargeResponse> {
  console.log(`[createPixCharge] Iniciando para userId: ${userId}`);
  const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

  if (!ABACATE_API_KEY) {
    console.error('[createPixCharge] ERRO CRÍTICO: Chave de API do Abacate Pay (ABACATE_API_KEY) não encontrada nas variáveis de ambiente.');
    throw new Error('Gateway de pagamento não configurado. Chave de API ausente.');
  }
   console.log('[createPixCharge] Chave de API do Abacate Pay encontrada.');

  const url = 'https://api.abacatepay.com/v1/pixQrCode/create';

  const payload = {
    amount: 4900, // R$49,00 em centavos
    expiresIn: 3600, // 1 hora
    description: 'Assinatura Trendify PRO - 1 Mês',
    customer: {
      name: input.name,
      email: input.email,
      taxId: input.taxId.replace(/\D/g, ''), // Envia somente números
      cellphone: input.cellphone.replace(/\D/g, ''), // Envia somente números
    },
    metadata: {
      externalId: userId, // Passa o Firebase UID
      product: 'trendify-pro-monthly',
    },
  };

  console.log('[createPixCharge] Payload a ser enviado para Abacate Pay:', JSON.stringify(payload, null, 2));

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

    console.log(`[createPixCharge] Resposta da API Abacate Pay (Status: ${response.status}):`, JSON.stringify(result, null, 2));

    if (!response.ok || result.error) {
      const errorMessage = result.error?.message || `Erro ${response.status} ao se comunicar com o gateway.`;
      console.error(`[createPixCharge] Erro da API Abacate Pay: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const validatedData = PixChargeResponseSchema.parse(result.data);
    console.log('[createPixCharge] Cobrança PIX criada e validada com sucesso.');
    return validatedData;
  } catch (error) {
    console.error('[createPixCharge] Erro crítico na chamada da API:', error);
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
      console.warn('[createPixChargeAction] Aviso: Cookie de sessão "__session" não encontrado.');
      throw new Error('Sessão não encontrada. Faça login novamente.');
    }
    console.log('[createPixChargeAction] Cookie de sessão encontrado.');
    
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    userId = decodedToken.uid;
    console.log(`[createPixChargeAction] Sessão verificada com sucesso para o UID: ${userId}`);
  } catch (e: any) {
    console.error('[createPixChargeAction] Falha na verificação da sessão:', e.message);
    return { error: 'Sessão inválida ou expirada. Por favor, faça login novamente.' };
  }

  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    console.error('[createPixChargeAction] Erro de validação do formulário:', parsed.error.issues);
    return {
      error: 'Dados do formulário inválidos. Verifique os campos e tente novamente.',
    };
  }

  console.log('[createPixChargeAction] Dados do formulário validados com sucesso.');

  try {
    const result = await createPixCharge(parsed.data, userId);
    console.log('[createPixChargeAction] Ação concluída com sucesso, retornando dados do PIX.');
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    console.error(`[createPixChargeAction] Erro ao chamar createPixCharge: ${errorMessage}`);
    return { error: errorMessage };
  }
}
