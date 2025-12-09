
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
  customerId?: string;
  checkoutUrl?: string;
  error?: string;
}

/**
 * Cria um cliente e um link de checkout na Asaas em uma única chamada.
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
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  if (appUrl.includes('localhost')) {
    appUrl = 'https://example.com';
  }

  if (!apiKey) {
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Erro de configuração do servidor. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Adicione-a nas variáveis de ambiente do seu projeto.'
      : 'Erro de configuração local. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Verifique seu arquivo .env e reinicie o servidor de desenvolvimento.';
    return { error: errorMessage };
  }
  
  try {
    const price = priceMap[plan][cycle];
    const planName = `${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;

    const checkoutBody = {
        billingTypes: ['PIX'], // Simplificado para apenas PIX
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
        }],
        customerData: { // Enviando dados do cliente diretamente
            name,
            cpfCnpj,
            email,
            phone,
            postalCode,
            addressNumber
        }
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
