
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';

// Mapeamento de planos e preços
const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 29, annual: 299 },
    premium: { monthly: 39, annual: 399 },
};

const CreatePaymentSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

interface ActionState {
  customerId?: string;
  paymentLink?: string;
  error?: string;
}

/**
 * Cria um cliente na Asaas (se não existir) e gera uma cobrança (link de pagamento).
 */
export async function createAsaasPaymentAction(
  input: CreatePaymentInput
): Promise<ActionState> {
  const parsed = CreatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Dados inválidos: ' + parsed.error.format() };
  }

  const { name, cpfCnpj, email, plan, cycle, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    console.error('[Asaas Action] Erro: Chave de API da Asaas não configurada.');
    return { error: 'Erro de configuração do servidor. A chave de pagamento não foi encontrada.' };
  }

  try {
    // Passo 1: Criar ou obter o cliente na Asaas
    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({ name, cpfCnpj, email }),
    });

    const customerData = await customerResponse.json();
    if (!customerResponse.ok && customerData.errors[0]?.code !== 'customer_already_exists') {
        throw new Error(customerData.errors[0]?.description || 'Não foi possível criar o cliente na Asaas.');
    }

    const customerId = customerData.id || (await (await fetch(`https://api-sandbox.asaas.com/v3/customers?email=${email}`, { headers: { access_token: apiKey }})).json()).data[0].id;

    if (!customerId) {
        throw new Error('Não foi possível obter o ID do cliente da Asaas.');
    }

    // Passo 2: Criar a cobrança (link de pagamento)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

    const paymentBody = {
      customer: customerId,
      billingType: 'UNDEFINED', // Permite Pix e Cartão
      dueDate: dueDate.toISOString().split('T')[0],
      value: priceMap[plan][cycle],
      description: `Assinatura Trendify - Plano ${plan} (${cycle})`,
      externalReference: userId, // ID do nosso usuário para referência no webhook
    };

    const paymentResponse = await fetch('https://api-sandbox.asaas.com/v3/payments', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify(paymentBody),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
        throw new Error(paymentData.errors[0]?.description || 'Não foi possível criar a cobrança.');
    }

    return { customerId: customerId, paymentLink: paymentData.invoiceUrl };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de pagamento:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
