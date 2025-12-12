
'use server';

import { z } from 'zod';
import type { Plan } from '@/lib/types';
import fetch from 'node-fetch';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// --- Esquema de Validação para o Formulário ---

const CheckoutFormSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
  cpfCnpj: z.string().min(11, 'O CPF ou CNPJ é obrigatório.'),
  phone: z.string().min(10, 'O telefone é obrigatório.'),
  postalCode: z.string().min(8, 'O CEP é obrigatório.'),
  addressNumber: z.string().min(1, 'O número é obrigatório.'),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>;

interface CheckoutActionState {
  checkoutUrl?: string;
  error?: string;
}


// --- Função para criar ou encontrar cliente na Asaas ---
async function findOrCreateAsaasCustomer(apiKey: string, customerData: { name: string, email: string, cpfCnpj: string, phone: string, postalCode: string, addressNumber: string }): Promise<string> {
    // Tenta encontrar o cliente pelo CPF/CNPJ primeiro
    const searchResponse = await fetch(`https://sandbox.asaas.com/api/v3/customers?cpfCnpj=${customerData.cpfCnpj}`, {
        headers: { 'accept': 'application/json', 'access_token': apiKey },
    });
    const searchData: any = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
        console.log(`[Asaas Customer] Cliente encontrado: ${searchData.data[0].id}`);
        return searchData.data[0].id;
    }
    
    // Se não encontrar, cria um novo cliente
    console.log(`[Asaas Customer] Cliente não encontrado. Criando novo cliente...`);
    const createResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify(customerData),
    });

    const createData: any = await createResponse.json();

    if (!createResponse.ok) {
        console.error(`[Asaas Customer Action] Erro na API ao criar cliente:`, createData);
        throw new Error(createData.errors?.[0]?.description || 'Falha ao criar cliente na Asaas.');
    }
    
    console.log(`[Asaas Customer] Novo cliente criado: ${createData.id}`);
    return createData.id;
}


// --- Ação Principal de Checkout ---

const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 5.00, annual: 5.00 },
    premium: { monthly: 5.00, annual: 5.00 },
};

export async function createAsaasCheckoutAction(input: CheckoutFormInput): Promise<CheckoutActionState> {
  const parsed = CheckoutFormSchema.safeParse(input);
  if (!parsed.success) {
      const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
      return { error: `Dados de checkout inválidos: ${errorMessages}` };
  }

  const {
      userId, name, email, cpfCnpj, phone, postalCode, addressNumber,
      plan, cycle, billingType
  } = parsed.data;

  const apiKey = process.env.ASAAS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  
  if (!apiKey || !appUrl) return { error: 'Erro de configuração do servidor: Chaves de API ou URL da aplicação ausentes.' };

  try {
    const { firestore } = initializeFirebaseAdmin();
    
    // 1. Criar ou encontrar cliente na Asaas
    const asaasCustomerId = await findOrCreateAsaasCustomer(apiKey, { name, email, cpfCnpj, phone, postalCode, addressNumber });
    
    const price = priceMap[plan][cycle];
    
    const isRecurrent = billingType === 'CREDIT_CARD';

    const itemName = `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`;
    
    const checkoutBody: any = {
      customer: asaasCustomerId,
      billingTypes: [billingType],
      chargeTypes: [isRecurrent ? 'RECURRENT' : 'DETACHED'],
      minutesToExpire: 60,
      callback: {
        successUrl: `${appUrl}/checkout/success`,
        autoRedirect: true,
        cancelUrl: `${appUrl}/subscribe?status=cancelled`,
        expiredUrl: `${appUrl}/subscribe?status=expired`,
      },
      items: [
        {
            name: itemName,
            description: `Acesso ao ${itemName} da Trendify`,
            value: price,
            quantity: 1,
        }
      ],
    };
    
    if (isRecurrent) {
        const nextDueDate = new Date();
        if (cycle === 'annual') {
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        } else {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
        
        checkoutBody.subscription = {
          cycle: cycle === 'annual' ? 'YEARLY' : 'MONTHLY',
          nextDueDate: nextDueDate.toISOString().split('T')[0],
        }
    }
    
    const checkoutResponse = await fetch('https://sandbox.asaas.com/api/v3/checkouts', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json', 'access_token': apiKey },
        body: JSON.stringify(checkoutBody)
    });
    
    const checkoutData: any = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
        console.error(`[Asaas Checkout Action] Erro na API:`, checkoutData);
        throw new Error(checkoutData.errors?.[0]?.description || 'Falha ao criar checkout na Asaas.');
    }
    
    if (!checkoutData.id) {
         console.error('[Asaas Checkout Action] Resposta da API não continha ID de checkout:', checkoutData);
         throw new Error('API da Asaas não retornou os dados necessários.');
    }

    // 3. Salvar o mapeamento da sessão de checkout no Firestore
    const checkoutRef = firestore.collection('asaasCheckouts').doc(checkoutData.id);
    await checkoutRef.set({
      userId,
      plan,
      cycle,
      asaasCustomerId,
      asaasSubscriptionId: checkoutData.subscription?.id || null,
      createdAt: Timestamp.now(),
      source: 'checkout-session'
    });

    // 4. Salvar os dados de endereço preenchidos no perfil do usuário para uso futuro
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
        cpfCnpj,
        phone,
        postalCode,
        addressNumber,
    });
    
    const finalCheckoutUrl = `https://sandbox.asaas.com/checkoutSession/show/${checkoutData.id}`;

    return { checkoutUrl: finalCheckoutUrl };

  } catch (e: any) {
    console.error('[Asaas Checkout Action] Erro no fluxo:', e);
    return { error: e.message || 'Erro de comunicação com o provedor de pagamento.' };
  }
}
