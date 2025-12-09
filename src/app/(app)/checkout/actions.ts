
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
  checkoutUrl?: string;
  error?: string;
}

// Placeholder image in Base64 (a simple 1x1 transparent pixel)
const PLACEHOLDER_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";


/**
 * Cria um cliente na Asaas (se não existir) e gera um link de checkout.
 */
export async function createAsaasPaymentAction(
  input: CreatePaymentInput
): Promise<ActionState> {
  const parsed = CreatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
    return { error: `Dados inválidos: ${errorMessages}` };
  }

  const { name, cpfCnpj, email, plan, cycle, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;
  const successUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://trendify-beta.vercel.app'}/dashboard?checkout=success`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://trendify-beta.vercel.app'}/dashboard?checkout=cancel`;


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
    let customerId;

    if (customerResponse.ok) {
        customerId = customerData.id;
    } else if (customerData.errors?.[0]?.code === 'customer_already_exists') {
        // Se o cliente já existe, busca pelo e-mail
        const existingCustomerResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers?email=${email}`, {
            headers: { accept: 'application/json', access_token: apiKey }
        });
        const existingCustomerData = await existingCustomerResponse.json();
        if (existingCustomerData.data && existingCustomerData.data.length > 0) {
            customerId = existingCustomerData.data[0].id;
        } else {
             throw new Error('Cliente já existe, mas não foi possível encontrá-lo pelo e-mail.');
        }
    } else {
        throw new Error(customerData.errors?.[0]?.description || 'Não foi possível criar o cliente na Asaas.');
    }

    if (!customerId) {
        throw new Error('Não foi possível obter o ID do cliente da Asaas.');
    }

    // Passo 2: Criar o checkout
    const checkoutBody = {
        name: `Assinatura Trendify - ${plan}`,
        billingTypes: ['CREDIT_CARD', 'PIX'],
        chargeTypes: ['DETACHED'], // Cobrança avulsa
        value: priceMap[plan][cycle],
        description: `Acesso ao plano ${plan} (${cycle}) da plataforma Trendify.`,
        customer: customerId,
        externalReference: userId,
        callback: {
            successUrl: successUrl,
            cancelUrl: cancelUrl,
        },
        items: [{
            name: `Plano ${plan} - ${cycle}`,
            description: `Assinatura do plano ${plan} da Trendify.`,
            quantity: 1,
            value: priceMap[plan][cycle],
            imageBase64: PLACEHOLDER_IMAGE_BASE64,
        }],
    };

    const checkoutResponse = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify(checkoutBody),
    });

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
        throw new Error(checkoutData.errors[0]?.description || 'Não foi possível criar o checkout.');
    }

    return { customerId: customerId, checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
