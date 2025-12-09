
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
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

interface ActionState {
  checkoutUrl?: string;
  error?: string;
}

/**
 * Cria um cliente na Asaas (ou obtém um existente) e depois cria um link de checkout.
 */
export async function createAsaasPaymentAction(
  input: CreatePaymentInput
): Promise<ActionState> {
  const parsed = CreatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
    return { error: `Dados inválidos: ${errorMessages}` };
  }

  const { name, cpfCnpj, email, phone, postalCode, addressNumber, plan, cycle, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trendify-beta.vercel.app';
  
  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  }
  
  try {
    // ETAPA 1: Criar ou obter o cliente na Asaas
    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'access_token': apiKey,
        },
        body: JSON.stringify({
            name,
            email,
            phone,
            cpfCnpj,
            externalReference: userId
        })
    });
    
    const customerData = await customerResponse.json();

    if (!customerResponse.ok) {
        console.error('[Asaas Action] Erro ao criar/obter cliente:', customerData);
        throw new Error(customerData.errors?.[0]?.description || 'Falha ao registrar cliente no gateway de pagamento.');
    }

    const customerId = customerData.id;

    // ETAPA 2: Criar o link de checkout com o ID do cliente
    const price = priceMap[plan][cycle];
    const planName = `${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;

    const checkoutBody = {
        customer: customerId,
        billingType: 'PIX', // Focado em PIX por enquanto
        chargeType: 'DETACHED',
        externalReference: userId,
        callback: {
            successUrl: `${appUrl}/dashboard?checkout=success`,
            autoRedirect: true,
        },
        items: [{
            name: planName,
            description: `Assinatura do plano ${planName} na Trendify`,
            value: price,
            quantity: 1,
        }],
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
        console.error('[Asaas Action] Erro na resposta da API de checkout:', checkoutData);
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o link de checkout.');
    }

    return { checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
