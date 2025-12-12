
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


// --- Função para buscar endereço pelo CEP ---
async function getAddressFromCep(cep: string): Promise<{ address: string; province: string; city: string; error?: string }> {
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) {
            return { error: "Consulta de CEP falhou.", address: "", province: "", city: "" };
        }
        const data: any = await response.json();
        if (data.erro) {
            return { error: "CEP não encontrado.", address: "", province: "", city: "" };
        }
        return {
            address: data.logradouro || "",
            province: data.bairro || "",
            city: data.localidade + ' - ' + data.uf || "",
        };
    } catch (e) {
        console.error("Erro ao buscar CEP:", e);
        return { error: "Falha na comunicação com serviço de CEP.", address: "", province: "", city: "" };
    }
}


// --- Ação Principal de Checkout ---

const priceMap: Record<Plan, Record<'monthly' | 'annual', number>> = {
    free: { monthly: 0, annual: 0 },
    pro: { monthly: 50, annual: 500 },
    premium: { monthly: 90, annual: 900 },
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
    
    // 1. Enriquecer endereço com ViaCEP
    const addressDetails = await getAddressFromCep(postalCode);
    if (addressDetails.error) {
        return { error: addressDetails.error };
    }
    
    const price = priceMap[plan][cycle];
    
    let chargeTypes: ('DETACHED' | 'RECURRENT')[] = ['DETACHED'];
    if (billingType === 'CREDIT_CARD') { // Recorrência só com Cartão de Crédito
        chargeTypes = ['RECURRENT'];
    }

    const itemName = `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${cycle === 'annual' ? 'Anual' : 'Mensal'})`;
    
    const checkoutBody: any = {
      billingTypes: [billingType],
      chargeTypes: chargeTypes,
      minutesToExpire: 60,
      callback: {
        successUrl: `${appUrl}/dashboard?checkout=success`,
        autoRedirect: true,
        cancelUrl: `${appUrl}/subscribe?status=cancelled`,
        expiredUrl: `${appUrl}/subscribe?status=expired`,
      },
      customerData: { 
          name,
          email,
          cpfCnpj,
          phone,
          postalCode,
          address: addressDetails.address,
          addressNumber,
          province: addressDetails.province,
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

    if (chargeTypes.includes('RECURRENT')) {
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
    
    // Corrigido: Não depender mais de checkoutData.customer. Apenas o ID do checkout é necessário.
    if (!checkoutData.id) {
         console.error('[Asaas Checkout Action] Resposta da API não continha ID de checkout:', checkoutData);
         throw new Error('API da Asaas não retornou os dados necessários.');
    }

    // 2. Salvar o mapeamento da sessão de checkout no Firestore
    const checkoutRef = firestore.collection('asaasCheckouts').doc(checkoutData.id);
    await checkoutRef.set({
      userId,
      plan,
      cycle,
      createdAt: Timestamp.now(),
      asaasSubscriptionId: checkoutData.subscription?.id || null, // Pode ser nulo
      asaasCustomerId: checkoutData.customer, // Salva mesmo que seja nulo, para fallback
      source: 'checkout-session'
    });

    // 3. Salvar os dados de endereço preenchidos no perfil do usuário para uso futuro
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({
        cpfCnpj,
        phone,
        postalCode,
        addressNumber,
        address: addressDetails.address,
        province: addressDetails.province,
        city: addressDetails.city,
    });
    
    return { checkoutUrl: checkoutData.url };

  } catch (e: any) {
    console.error('[Asaas Checkout Action] Erro no fluxo:', e);
    return { error: e.message || 'Erro de comunicação com o provedor de pagamento.' };
  }
}
