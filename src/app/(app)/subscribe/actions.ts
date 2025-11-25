
'use server';

import { z } from 'zod';
import { Plan } from '@/lib/types';

console.log('[actions.ts] Módulo carregado.');

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  plan: z.enum(['pro', 'premium']),
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


const planDetails: Record<Exclude<Plan, 'free'>, { amount: number; description: string }> = {
    pro: {
        amount: 2900, // R$29,00
        description: 'Assinatura Trendify PRO - 1 Mês'
    },
    premium: {
        amount: 3900, // R$39,00
        description: 'Assinatura Trendify PREMIUM - 1 Mês'
    }
}


async function createPixCharge(
  input: z.infer<typeof formSchema>
): Promise<PixChargeResponse> {
  const userId = input.userId;
  console.log(`[createPixCharge] Iniciando para userId: ${userId} no plano ${input.plan}`);
  const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

  if (!ABACATE_API_KEY) {
    console.error('[createPixCharge] ERRO CRÍTICO: Chave de API do Abacate Pay (ABACATE_API_KEY) não encontrada nas variáveis de ambiente.');
    throw new Error('Gateway de pagamento não configurado. Chave de API ausente.');
  }
   console.log('[createPixCharge] Chave de API do Abacate Pay encontrada.');

  const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
  
  const selectedPlan = planDetails[input.plan];

  const payload = {
    amount: selectedPlan.amount,
    expiresIn: 3600, // 1 hora
    description: selectedPlan.description,
    customer: {
      name: input.name,
      email: input.email,
      taxId: input.taxId.replace(/\D/g, ''), // Envia somente números
      cellphone: input.cellphone.replace(/\D/g, ''), // Envia somente números
    },
    metadata: {
      externalId: userId, // Passa o Firebase UID
      product: `trendify-${input.plan}-monthly`,
      plan: input.plan,
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
  formData: z.infer<typeof formSchema>
): Promise<ActionState> {
  console.log('[createPixChargeAction] Ação iniciada.');

  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    console.error('[createPixChargeAction] Erro de validação do formulário:', parsed.error.issues);
    return {
      error: 'Dados do formulário inválidos. Verifique os campos e tente novamente.',
    };
  }

  console.log(`[createPixChargeAction] Dados do formulário validados com sucesso para o usuário ${parsed.data.userId}.`);

  try {
    const result = await createPixCharge(parsed.data);
    console.log('[createPixChargeAction] Ação concluída com sucesso, retornando dados do PIX.');
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    console.error(`[createPixChargeAction] Erro ao chamar createPixCharge: ${errorMessage}`);
    return { error: errorMessage };
  }
}
