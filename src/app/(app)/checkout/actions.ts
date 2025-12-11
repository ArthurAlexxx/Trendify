
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import fetch from 'node-fetch';


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
 * Busca o endereço a partir do CEP usando a API ViaCEP.
 */
async function getAddressFromCEP(cep: string): Promise<{ address: string; province: string; city: string; error?: string }> {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            throw new Error('Não foi possível consultar o CEP.');
        }
        const data = await response.json() as any;
        if (data.erro) {
            throw new Error('CEP não encontrado.');
        }
        return {
            address: data.logradouro,
            province: data.bairro,
            city: data.localidade,
        };
    } catch (e: any) {
        console.error(`[ViaCEP Error] ${e.message}`);
        return { error: e.message, address: '', province: '', city: '' };
    }
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
   if (!appUrl) {
    return { error: 'Erro de configuração do servidor: NEXT_PUBLIC_APP_URL não encontrada.' };
  }
  
  try {
    const { address, province, city, error: cepError } = await getAddressFromCEP(postalCode);

    if (cepError) {
      return { error: `Erro no CEP: ${cepError}` };
    }

    const price = priceMap[plan][cycle];
    const planName = `Plano ${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;
    const isRecurrent = billingType === 'CREDIT_CARD';

    const checkoutBody: any = {
      billingTypes: [billingType],
      chargeType: isRecurrent ? "RECURRENT" : "DETACHED",
      minutesToExpire: 60, 
      callback: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        cancelUrl: `${appUrl}/subscribe`,
        autoRedirect: true,
      },
      items: [{
        name: planName,
        description: `Acesso ao ${planName} da Trendify.`,
        quantity: 1,
        value: price,
      }],
      customer: {
        name,
        email,
        cpfCnpj,
        phone,
        postalCode,
        address, // Endereço obtido do CEP
        addressNumber,
        complement: '',
        province, // Bairro obtido do CEP
      },
    };
    
    const externalReference = JSON.stringify({ userId, plan, cycle });

    if (isRecurrent) {
      const today = new Date();
      let nextDueDate: Date;

      if (cycle === 'annual') {
        nextDueDate = new Date(today.setFullYear(today.getFullYear() + 1));
      } else { // monthly
        nextDueDate = new Date(today.setMonth(today.getMonth() + 1));
      }

      checkoutBody.subscription = {
        cycle: cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
        description: `Assinatura do plano ${plan.toUpperCase()} (${cycle === 'annual' ? 'Anual' : 'Mensal'}) na Trendify`,
        nextDueDate: nextDueDate.toISOString().split('T')[0], // Formato YYYY-MM-DD
        externalReference: externalReference,
      };
    } else {
        checkoutBody.externalReference = externalReference;
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
    
    const checkoutData: any = await checkoutResponse.json();

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
