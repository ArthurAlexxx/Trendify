
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

async function getAddressFromCEP(cep: string): Promise<{ address: string; province: string; error?: string }> {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Não foi possível consultar o CEP.');
        const data: any = await response.json();
        if (data.erro) throw new Error('CEP não encontrado.');
        return { address: data.logradouro, province: data.bairro };
    } catch (e: any) {
        console.error(`[ViaCEP Error] ${e.message}`);
        return { error: e.message, address: '', province: '' };
    }
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
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    let customerId = userData?.subscription?.paymentId;

    if (!customerId) {
        console.log(`[Asaas Action] Cliente não encontrado para ${userId}. Criando um novo...`);
        const customerBody = { name, email, cpfCnpj, phone };
        const customerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
            method: 'POST',
            headers: { 'accept': 'application/json', 'content-type': 'application/json', 'access_token': apiKey },
            body: JSON.stringify(customerBody)
        });
        const customerData: any = await customerResponse.json();
        if (!customerResponse.ok) {
            throw new Error(customerData.errors?.[0]?.description || 'Falha ao criar o cliente no gateway.');
        }
        customerId = customerData.id;
    } else {
        console.log(`[Asaas Action] Cliente ${customerId} já existe para ${userId}.`);
    }
    
    // Salva/Atualiza o ID do cliente e os dados de endereço no perfil do usuário
    await userRef.update({
        'subscription.paymentId': customerId,
        cpfCnpj: cpfCnpj,
        phone: phone,
        postalCode: postalCode,
        addressNumber: addressNumber,
    });

    return { customerId };

  } catch (e: any) {
    console.error('[Asaas Customer Action] Erro:', e);
    return { error: e.message || 'Ocorreu um erro ao criar o cliente.' };
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
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) throw new Error("Usuário não encontrado.");
    
    const { postalCode, addressNumber } = userData;
    if (!postalCode || !addressNumber) throw new Error("Endereço do usuário incompleto.");

    const { address, province, error: cepError } = await getAddressFromCEP(postalCode);
    if (cepError) return { error: `Erro no CEP: ${cepError}` };

    const price = priceMap[plan][cycle];
    const externalReference = JSON.stringify({ userId, plan, cycle });
    
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 2);

    const checkoutBody: any = {
      customer: customerId,
      billingType: billingType,
      dueDate: nextDueDate.toISOString().split('T')[0],
      value: price,
      description: `Assinatura do plano ${plan.toUpperCase()} (${cycle === 'annual' ? 'Anual' : 'Mensal'}) na Trendify`,
      externalReference: externalReference,
      callback: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        autoRedirect: true,
        cancelUrl: `${appUrl}/subscribe?status=cancel`,
      },
    };
    
    // Para assinaturas, precisamos enviar a estrutura de subscription
    checkoutBody.operationType = 'SUBSCRIPTION';
    checkoutBody.subscription = {
      cycle: cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
      description: `Assinatura ${plan} ${cycle}`,
    };
    // O valor, vencimento e descrição já estão no corpo principal, então não precisamos repetir dentro de subscription

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
         throw new Error('A API da Asaas não retornou uma URL de checkout.');
    }

    // Salva o checkoutId para referência no webhook
    await firestore.collection('users').doc(userId).update({ 'subscription.asaasCheckoutId': checkoutData.id });
    
    return { checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Checkout Action] Erro no fluxo:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
