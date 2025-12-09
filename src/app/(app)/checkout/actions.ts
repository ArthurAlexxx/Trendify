
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
 * Cria um cliente na Asaas (se não existir).
 * ETAPA 1 do fluxo de pagamento.
 */
export async function createAsaasPaymentAction(
  input: CreatePaymentInput
): Promise<ActionState> {
  const parsed = CreatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map(issue => issue.message).join(' ');
    return { error: `Dados inválidos: ${errorMessages}` };
  }

  const { name, cpfCnpj, email, plan, cycle, userId } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  // Verificação de ambiente aprimorada para depuração
  if (!apiKey) {
    console.error('[Asaas Action] Erro: A variável de ambiente ASAAS_API_KEY não está configurada no servidor.');
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Erro de configuração do servidor. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Adicione-a nas variáveis de ambiente do seu projeto na Vercel (ou outro provedor).'
      : 'Erro de configuração local. A chave de pagamento (ASAAS_API_KEY) não foi encontrada. Verifique seu arquivo .env.local e reinicie o servidor de desenvolvimento.';
    return { error: errorMessage };
  }

  try {
    // Passo 1: Criar ou obter o cliente na Asaas
    const customerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: apiKey,
      },
      body: JSON.stringify({ name, cpfCnpj, email }),
    });

    const customerData = await customerResponse.json();
    let customerId;

    if (customerResponse.ok) {
        customerId = customerData.id;
    } else if (customerData.errors?.[0]?.code === 'customer_already_exists') {
        // Se o cliente já existe, busca pelo CPF/CNPJ que é um identificador único
        const existingCustomerResponse = await fetch(`https://api-sandbox.asaas.com/v3/customers?cpfCnpj=${cpfCnpj}`, {
            headers: { accept: 'application/json', access_token: apiKey }
        });
        const existingCustomerData = await existingCustomerResponse.json();
        if (existingCustomerData.data && existingCustomerData.data.length > 0) {
            customerId = existingCustomerData.data[0].id;
        } else {
             throw new Error('Cliente já existe, mas não foi possível encontrá-lo pelo CPF/CNPJ.');
        }
    } else {
        throw new Error(customerData.errors?.[0]?.description || 'Não foi possível criar o cliente na Asaas.');
    }

    if (!customerId) {
        throw new Error('Não foi possível obter o ID do cliente da Asaas.');
    }

    // Retorna o ID do cliente para depuração, em vez de criar o checkout
    return { customerId: customerId };

  } catch (e: any) {
    console.error('[Asaas Action] Erro no fluxo de criação de cliente:', e);
    return { error: e.message || 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
