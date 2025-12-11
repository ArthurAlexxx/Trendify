
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// Mapeamento de planos e preços
const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 5, annual: 50 },
    premium: { monthly: 5, annual: 90 },
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
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

interface ActionState {
  checkoutUrl?: string;
  checkoutId?: string;
  error?: string;
}

/**
 * Cria um link de checkout na Asaas usando o endpoint /checkouts.
 */
export async function createAsaasPaymentAction(
  input: CreatePaymentInput
): Promise<ActionState> {
  const parsed = CreatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
    return { error: `Dados inválidos: ${errorMessages}` };
  }

  const { name, cpfCnpj, email, phone, postalCode, addressNumber, plan, cycle, billingType, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  }
  
  try {
    const price = priceMap[plan][cycle];
    const planName = `Plano ${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;
    const isRecurrent = billingType === 'CREDIT_CARD';

    const checkoutBody: any = {
      billingTypes: [billingType],
      chargeTypes: [isRecurrent ? "RECURRENT" : "DETACHED"],
      minutesToExpire: 60, // Link expira em 1 hora
      callback: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl: `${appUrl}/subscribe`,
        expiredUrl: `${appUrl}/subscribe`,
      },
      items: [{
        name: planName,
        description: `Acesso ao ${planName} da Trendify.`,
        quantity: 1,
        value: price,
      }],
      customerData: {
        name,
        email,
        cpfCnpj,
        phone,
        postalCode,
        addressNumber,
        complement: '',
        province: '', // Not strictly required by Asaas for checkout but good to have
      },
      externalReference: JSON.stringify({ userId, plan, cycle }),
    };

    if (isRecurrent) {
      checkoutBody.subscription = {
        cycle: cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
      };
    }

    const checkoutResponse = await fetch('https://sandbox.asaas.com/api/v3/checkouts', {
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
        console.error(`[Asaas Action] Erro na resposta da API de checkout:`, checkoutData);
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o checkout.');
    }
    
    if (!checkoutData.id) {
         throw new Error('A API da Asaas não retornou um ID para a sessão de checkout.');
    }

    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${checkoutData.id}`;
    
    // Store the customer ID from Asaas in the user's profile for future reference
    if (checkoutData.customer) {
        const { firestore } = initializeFirebaseAdmin();
        const userRef = firestore.doc(`users/${userId}`);
        await userRef.update({ 'subscription.paymentId': checkoutData.customer });
    }

    return { 
        checkoutUrl: checkoutUrl, 
        checkoutId: checkoutData.id 
    };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
