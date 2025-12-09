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

/**
 * Cria um cliente na Asaas e depois gera um link de checkout.
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';


  if (!apiKey) {
    console.error('[Asaas Action] Erro: A variável de ambiente ASAAS_API_KEY não está configurada no servidor.');
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Erro de configuração do servidor. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Adicione-a nas variáveis de ambiente do seu projeto.'
      : 'Erro de configuração local. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Verifique seu arquivo .env e reinicie o servidor de desenvolvimento.';
    return { error: errorMessage };
  }

  try {
    // Etapa 1: Criar ou obter o cliente na Asaas
    let customerId;
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

    if (customerResponse.ok) {
        customerId = customerData.id;
    } else if (customerData.errors?.[0]?.code === 'customer_already_exists') {
        const existingCustomerResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers?cpfCnpj=${cpfCnpj}`, {
            headers: { accept: 'application/json', access_token: apiKey }
        });
        const existingCustomerData = await existingCustomerResponse.json();
        if (existingCustomerData.data && existingCustomerData.data.length > 0) {
            customerId = existingCustomerData.data[0].id;
        } else {
             throw new Error('Cliente já existe, mas não foi possível encontrá-lo pelo CPF/CNPJ.');
        }
    } else {
        throw new Error(customerData.errors?.[0]?.description || 'Não foi possível criar o cliente na Asaas.');
    }

    if (!customerId) {
        throw new Error('Não foi possível obter o ID do cliente da Asaas.');
    }

    // Etapa 2: Criar o link de Checkout
    const price = priceMap[plan][cycle];
    const planName = `${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;
    const placeholderImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";


    const checkoutBody = {
        billingTypes: ['PIX', 'CREDIT_CARD'],
        chargeTypes: ['DETACHED'],
        externalReference: userId, // Referência para o webhook
        callback: {
            successUrl: `${appUrl}/dashboard?checkout=success`,
            cancelUrl: `${appUrl}/subscribe`,
        },
        items: [{
            name: planName,
            description: `Assinatura do plano ${planName} na Trendify`,
            value: price,
            quantity: 1,
            imageBase64: placeholderImage,
        }],
        customer: customerId,
    };
    
    const checkoutResponse = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'access_token': apiKey,
        },
        body: JSON.stringify(checkoutBody)
    });

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o link de checkout.');
    }

    return { customerId, checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
