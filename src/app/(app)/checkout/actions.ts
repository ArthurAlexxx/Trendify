
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';
import fetch from 'node-fetch';
import { initializeFirebaseAdmin } from '@/firebase/admin';

// ---== ETAPA 1: CRIAR CLIENTE ==---

const CreateCustomerSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

interface CustomerActionState {
  customerId?: string;
  error?: string;
}

export async function createAsaasCustomerAction(input: CreateCustomerInput): Promise<CustomerActionState> {
  const parsed = CreateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
    return { error: `Dados inválidos: ${errorMessages}` };
  }

  const { name, cpfCnpj, email, phone, postalCode, addressNumber, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  
  try {
    const { firestore } = initializeFirebaseAdmin();
    
    // Sempre cria um novo cliente na Asaas a cada transação.
    console.log(`[Asaas Action] Criando um novo cliente na Asaas para o usuário ${userId}...`);
    const customerBody = { name, email, cpfCnpj, phone, postalCode, addressNumber };
    
    const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify(customerBody)
    });
    
    const customerData: any = await customerResponse.json();

    if (!customerResponse.ok || customerData.errors) {
        console.error("[Asaas Customer Action] Erro da API ao criar cliente:", customerData.errors);
        throw new Error(customerData.errors?.[0]?.description || 'Falha ao criar o cliente no gateway de pagamento.');
    }
    
    const customerId = customerData.id;
    console.log(`[Asaas Action] Novo cliente Asaas criado com sucesso: ${customerId}`);
    
    // Salva/Atualiza o ID do cliente e os dados de endereço no perfil do usuário no Firestore
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
        'subscription.paymentId': customerId, // Salva o ID do cliente mais recente
        cpfCnpj: cpfCnpj,
        phone: phone,
        postalCode: postalCode,
        addressNumber: addressNumber,
    });

    return { customerId };

  } catch (e: any) {
    console.error('[Asaas Customer Action] Erro no fluxo:', e);
    return { error: e.message || 'Ocorreu um erro ao interagir com o gateway de pagamento.' };
  }
}


// ---== ETAPA 2: CRIAR CHECKOUT ==---

const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 50, annual: 500 },
    premium: { monthly: 90, annual: 900 },
};

const CreateCheckoutSchema = z.object({
  customerId: z.string().min(1, 'ID do cliente é obrigatório.'),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;

interface CheckoutActionState {
  checkoutUrl?: string;
  error?: string;
}

export async function createAsaasCheckoutAction(input: CreateCheckoutInput): Promise<CheckoutActionState> {
  const parsed = CreateCheckoutSchema.safeParse(input);
  if (!parsed.success) return { error: 'Dados para o checkout inválidos.' };

  const { customerId, plan, cycle, billingType, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  if (!apiKey || !appUrl) return { error: 'Erro de configuração do servidor.' };

  try {
    const { firestore } = initializeFirebaseAdmin();
    
    const price = priceMap[plan][cycle];
    
    const nextDueDate = new Date();
    if (cycle === 'annual') {
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
    } else {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    const checkoutBody: any = {
      customer: customerId,
      billingTypes: [billingType],
      chargeTypes: ["RECURRENT"],
      callback: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        autoRedirect: true,
        cancelUrl: `${appUrl}/subscribe?status=cancel`,
        expiredUrl: `${appUrl}/subscribe?status=expired`,
      },
      subscription: {
        cycle: cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        value: price,
        description: `Assinatura ${plan.toUpperCase()} (${cycle === 'annual' ? 'Anual' : 'Mensal'}) - Trendify`,
        // Passando o externalReference dentro da assinatura para ter o contexto no webhook
        externalReference: JSON.stringify({ userId, plan, cycle }),
      },
      items: [{
        name: `Plano ${plan.toUpperCase()} - ${cycle === 'annual' ? 'Anual' : 'Mensal'}`,
        value: price,
        quantity: 1,
        // Adicionando um placeholder, já que a API parece exigir, mas não temos uma imagem real.
        // Este é um PNG transparente 1x1 em base64.
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      }]
    };
    
    console.log("[Asaas Checkout Action] Corpo da requisição de checkout:", JSON.stringify(checkoutBody, null, 2));

    const checkoutResponse = await fetch('https://sandbox.asaas.com/api/v3/checkouts', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify(checkoutBody)
    });
    
    const checkoutData: any = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
        console.error(`[Asaas Checkout Action] Erro na API:`, checkoutData);
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar o checkout.');
    }
    
    if (!checkoutData.url) {
         console.error('[Asaas Checkout Action] Resposta da API não continha URL:', checkoutData);
         throw new Error('A API da Asaas não retornou uma URL de checkout.');
    }

    // Salva o checkoutId para referência no webhook
    await firestore.collection('users').doc(userId).update({ 'subscription.asaasCheckoutId': checkoutData.id });
    console.log(`[Asaas Action] Checkout ID ${checkoutData.id} salvo para o usuário ${userId}.`);
    
    return { checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Checkout Action] Erro no fluxo:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}

    