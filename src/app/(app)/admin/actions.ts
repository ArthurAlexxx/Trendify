
'use server';

import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { Plan, UserRole } from '@/lib/types';

// Schema for changing a user's plan
const changePlanSchema = z.object({
  targetUserId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  newPlan: z.enum(['free', 'pro', 'premium']),
  newCycle: z.enum(['monthly', 'annual']).optional(),
  adminUserId: z.string().min(1, 'O ID do administrador é obrigatório.'),
});

type ChangePlanInput = z.infer<typeof changePlanSchema>;

const changeRoleSchema = z.object({
  targetUserId: z.string().min(1, 'O ID do usuário é obrigatório.'),
  newRole: z.enum(['user', 'admin']),
  adminUserId: z.string().min(1, 'O ID do administrador é obrigatório.'),
});

type ChangeRoleInput = z.infer<typeof changeRoleSchema>;


interface ActionState {
  success?: boolean;
  error?: string;
  checkoutUrl?: string;
  checkoutId?: string;
}

/**
 * Checks if the calling user has an 'admin' role in Firestore.
 * This is a secure, server-side check.
 * @param auth - The Firebase Admin Auth instance.
 * @param firestore - The Firebase Admin Firestore instance.
 * @param adminUserId - The UID of the user making the request.
 * @returns {Promise<boolean>} - True if the user is an admin.
 */
async function verifyAdminStatus(auth: ReturnType<typeof getAuth>, firestore: ReturnType<typeof getFirestore>, adminUserId: string): Promise<boolean> {
    const userDoc = await firestore.collection('users').doc(adminUserId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return false;
    }
    return true;
}


/**
 * A secure server action for an administrator to change a user's subscription plan.
 */
export async function changeUserPlanAction(
  input: ChangePlanInput
): Promise<ActionState> {
  const parsed = changePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados inválidos.' };
  }

  const { targetUserId, newPlan, newCycle, adminUserId } = parsed.data;

  try {
    const { auth, firestore } = initializeFirebaseAdmin();

    // Verify if the calling user is an admin
    const isCallerAdmin = await verifyAdminStatus(auth, firestore, adminUserId);
    if (!isCallerAdmin) {
      return { error: 'Permissão negada. Apenas administradores podem alterar planos.' };
    }
    
    const userRef = firestore.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();

    let expiresAt: Timestamp | null = null;
    let newStatus: 'active' | 'inactive' = 'inactive';

    if (newPlan !== 'free') {
        const now = new Date();
        newStatus = 'active';
        if (newCycle === 'annual') {
            expiresAt = Timestamp.fromDate(new Date(now.setFullYear(now.getFullYear() + 1)));
        } else { // monthly
            expiresAt = Timestamp.fromDate(new Date(now.setMonth(now.getMonth() + 1)));
        }
    }
    
    const updatePayload = {
      'subscription.plan': newPlan,
      'subscription.status': newPlan === 'free' ? 'inactive' : 'active',
      'subscription.cycle': newPlan === 'free' ? null : newCycle,
      'subscription.expiresAt': expiresAt,
      // Se reverter para free, limpar o paymentId
      'subscription.paymentId': newPlan === 'free' ? null : userDoc.data()?.subscription?.paymentId,
    };
    
    await userRef.update(updatePayload);

    return { success: true };
  } catch (e: any) {
    console.error('[changeUserPlanAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido ao alterar o plano.' };
  }
}


/**
 * A secure server action for an administrator to change a user's role.
 */
export async function changeUserRoleAction(
  input: ChangeRoleInput
): Promise<ActionState> {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Dados da requisição inválidos.' };
  }

  const { targetUserId, newRole, adminUserId } = parsed.data;

   try {
    const { auth, firestore } = initializeFirebaseAdmin();

    const isCallerAdmin = await verifyAdminStatus(auth, firestore, adminUserId);
    if (!isCallerAdmin) {
      return { error: 'Permissão negada. Apenas administradores podem alterar cargos.' };
    }

    const userRef = firestore.collection('users').doc(targetUserId);
    await userRef.update({ role: newRole });

    return { success: true };
  } catch (e: any) {
    console.error('[changeUserRoleAction] Error:', e);
    return { error: e.message || 'Ocorreu um erro desconhecido ao alterar o cargo.' };
  }
}

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
  billingType: z.enum(['PIX', 'CREDIT_CARD']),
  plan: z.enum(['pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
  userId: z.string().min(1, 'ID do usuário é obrigatório.'),
});

type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;


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

  const { name, cpfCnpj, email, phone, postalCode, addressNumber, billingType, plan, cycle, userId } = parsed.data;
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
            postalCode,
            addressNumber,
            externalReference: userId
        })
    });
    
    const customerData = await customerResponse.json();

    if (!customerResponse.ok && customerResponse.status !== 400) { // O erro 400 pode ser 'cliente já existe'
        console.error('[Asaas Action] Erro ao criar/obter cliente:', customerData);
        throw new Error(customerData.errors?.[0]?.description || 'Falha ao registrar cliente no gateway de pagamento.');
    }
    
    let customerId = customerData.id;
    // Se o cliente já existe, busca o ID dele
    if (customerResponse.status === 400 && customerData.errors?.[0]?.code === 'invalid_customer') {
        const searchResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers?cpfCnpj=${cpfCnpj}`, {
            headers: { 'access_token': apiKey },
        });
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
        } else {
             throw new Error('Falha ao encontrar cliente existente no gateway de pagamento.');
        }
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
        billingTypes: [billingType],
        chargeTypes: [isRecurrent ? 'RECURRENT' : 'DETACHED'],
        dueDateLimitDays: isRecurrent ? undefined : 1,
        webhookUrl: `${appUrl}/api/webhooks/asaas`,
        callback: {
            successUrl: `${appUrl}/dashboard?checkout=success`,
            autoRedirect: true,
            cancelUrl: `${appUrl}/dashboard?checkout=cancel`,
            expiredUrl: `${appUrl}/dashboard?checkout=expired`,
        },
        items: [{
            name: planName,
            description: `Assinatura do plano ${planName} na Trendify`,
            value: price,
            quantity: 1,
            externalReference: userId,
        }],
    };

    if (isRecurrent) {
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 5); // 5 years from now

        checkoutBody.subscription = {
            cycle: cycle.toUpperCase(),
            nextDueDate: nextDueDate.toISOString().split('T')[0], // YYYY-MM-DD
            endDate: endDate.toISOString().split('T')[0], // YYYY-MM-DD
        };
    }
    
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
    
    if (!checkoutData.id) {
         console.error('[Asaas Action] Resposta da API de checkout não continha um ID:', checkoutData);
         throw new Error('Ocorreu um erro inesperado ao criar o link de checkout.');
    }

    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${checkoutData.id}`;
    return { checkoutUrl: checkoutUrl, checkoutId: checkoutData.id };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de checkout:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}

const CancelCheckoutSchema = z.object({
  checkoutId: z.string().min(1, 'O ID do checkout é obrigatório.'),
});

/**
 * Cancela um checkout existente na Asaas.
 */
export async function cancelAsaasCheckoutAction(
  input: z.infer<typeof CancelCheckoutSchema>
): Promise<ActionState> {
  const parsed = CancelCheckoutSchema.safeParse(input);

  if (!parsed.success) {
    return { error: `Dados inválidos: ${parsed.error.issues.map(i => i.message).join(', ')}` };
  }

  const { checkoutId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { error: 'Erro de configuração do servidor: ASAAS_API_KEY não encontrada.' };
  }

  try {
    const response = await fetch(`https://api-sandbox.asaas.com/v3/checkouts/${checkoutId}/cancel`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'access_token': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[Asaas Cancel Action] Erro ao cancelar checkout ${checkoutId}:`, errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Falha ao cancelar o checkout.');
    }

    // A resposta de sucesso geralmente é um 200 OK com corpo vazio ou simples.
    return { success: true };

  } catch (e: any) {
    console.error(`[Asaas Cancel Action] Erro no fluxo de cancelamento para ${checkoutId}:`, e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
