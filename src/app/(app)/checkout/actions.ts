
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// Mapeamento de planos e preços
const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 5, annual: 5 },
    premium: { monthly: 5, annual: 5 },
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

  const { name, cpfCnpj, email, phone, postalCode, addressNumber, plan, cycle, billingType, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trendify-beta.vercel.app';
  
  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  }
  
  try {
    // ETAPA 1: Criar ou obter o cliente na Asaas
    const customerResponse = await fetch('https://www.asaas.com/api/v3/customers', {
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

    let customerId = customerData.id;
    // Se o cliente já existe, busca o ID dele
    if (customerData.errors?.[0]?.code === 'invalid_customer') {
        const searchResponse = await fetch(`https://www.asaas.com/api/v3/customers?cpfCnpj=${cpfCnpj}`, {
            headers: { 'access_token': apiKey },
        });
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
        } else {
             throw new Error('Falha ao encontrar cliente existente no gateway de pagamento.');
        }
    } else if (!customerResponse.ok) {
        console.error('[Asaas Action] Erro ao criar/obter cliente:', customerData);
        throw new Error(customerData.errors?.[0]?.description || 'Falha ao registrar cliente no gateway de pagamento.');
    }
    
    const { firestore } = initializeFirebaseAdmin();
    const userRef = firestore.doc(`users/${userId}`);
    await userRef.update({ 'subscription.paymentId': customerId });


    // ETAPA 2: Criar o link de checkout com o ID do cliente
    const price = priceMap[plan][cycle];
    const planName = `${plan.toUpperCase()} - ${cycle === 'monthly' ? 'Mensal' : 'Anual'}`;
    const isRecurrent = billingType === 'CREDIT_CARD';
    
    const checkoutBody: any = {
        customer: customerId,
        billingType: billingType,
        value: price,
        description: `Assinatura do plano ${planName} na Trendify`,
        externalReference: JSON.stringify({ userId, plan, cycle }), // Salva tudo que precisamos
        callback: {
            successUrl: `${appUrl}/dashboard?checkout=success`,
            autoRedirect: true,
        },
        postalService: false,
    };
    
    let endpoint = 'payments';

    if (isRecurrent) {
        endpoint = 'subscriptions';
        checkoutBody.cycle = cycle === 'annual' ? 'YEARLY' : 'MONTHLY';
        // Para cartão, a cobrança é imediata por padrão, não precisamos de 'dueDate'
    } else { // PIX
        checkoutBody.dueDate = new Date().toISOString().split('T')[0];
        checkoutBody.dueDateLimitDays = 1; // Para PIX, mantém um prazo curto
    }
    
    const checkoutResponse = await fetch(`https://www.asaas.com/api/v3/${endpoint}`, {
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
    
    const finalCheckoutUrl = isRecurrent ? (checkoutData.checkoutUrl || `https://www.asaas.com/c/${checkoutData.id}`) : checkoutData.invoiceUrl;

    if (!finalCheckoutUrl || !checkoutData.id) {
         console.error('[Asaas Action] Resposta da API de checkout não continha uma URL ou ID válido:', checkoutData);
         throw new Error('Ocorreu um erro inesperado ao criar o link de checkout.');
    }

    // Salvar o ID da assinatura (se for recorrente) ou do pagamento
    const idField = isRecurrent ? 'subscription.asaasSubscriptionId' : 'subscription.checkoutId';
    await userRef.update({ [idField]: checkoutData.id });

    return { checkoutUrl: finalCheckoutUrl, checkoutId: checkoutData.id };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
