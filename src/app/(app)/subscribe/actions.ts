
'use server';

import { z } from 'zod';
import { Plan } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(3, 'O nome completo é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  taxId: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  cellphone: z.string().min(10, 'O celular é obrigatório.'),
  userId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  planId: z.string().min(1, 'O ID do plano é obrigatório.'),
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

const planDetails: Record<string, { amount: number; description: string; plan: Plan, cycle: 'monthly' | 'annual' }> = {
    'pro-monthly': { amount: 2900, description: 'Assinatura Trendify PRO - Mensal', plan: 'pro', cycle: 'monthly' },
    'premium-monthly': { amount: 3900, description: 'Assinatura Trendify PREMIUM - Mensal', plan: 'premium', cycle: 'monthly' },
    'pro-annual': { amount: 29900, description: 'Assinatura Trendify PRO - Anual', plan: 'pro', cycle: 'annual' },
    'premium-annual': { amount: 39900, description: 'Assinatura Trendify PREMIUM - Anual', plan: 'premium', cycle: 'annual' },
};


async function createPixCharge(
  input: z.infer<typeof formSchema>
): Promise<PixChargeResponse> {
  const userId = input.userId;
  const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

  if (!ABACATE_API_KEY) {
    throw new Error('Gateway de pagamento não configurado. Chave de API ausente.');
  }

  const selectedPlan = planDetails[input.planId];
  if (!selectedPlan) {
    throw new Error('Plano selecionado inválido.');
  }
   
  const url = 'https://api.abacatepay.com/v1/pixQrCode/create';

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
      plan: selectedPlan.plan,
      cycle: selectedPlan.cycle,
      planId: input.planId
    },
  };

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

    if (!response.ok || result.error) {
      const errorMessage = result.error?.message || `Erro ${response.status} ao se comunicar com o gateway.`;
      throw new Error(errorMessage);
    }

    const validatedData = PixChargeResponseSchema.parse(result.data);
    return validatedData;
  } catch (error) {
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

  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    return {
      error: 'Dados do formulário inválidos. Verifique os campos e tente novamente.',
    };
  }

  try {
    const result = await createPixCharge(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: errorMessage };
  }
}
