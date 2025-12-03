
'use server';

import { z } from 'zod';

const CreateCustomerSchema = z.object({
  name: z.string().min(3, 'O nome é obrigatório.'),
  cpfCnpj: z.string().min(11, 'O CPF/CNPJ é obrigatório.'),
  email: z.string().email('O e-mail é inválido.'),
});

type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

interface ActionState {
  customerId?: string;
  error?: string;
}

export async function createAsaasCustomerAction(
  input: CreateCustomerInput
): Promise<ActionState> {
  const parsed = CreateCustomerSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Dados inválidos: ' + parsed.error.format() };
  }

  const { name, cpfCnpj, email } = parsed.data;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    console.error('[Asaas Action] Erro: Chave de API da Asaas não configurada.');
    return { error: 'Erro de configuração do servidor. A chave de pagamento não foi encontrada.' };
  }

  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: apiKey,
    },
    body: JSON.stringify({
      name,
      cpfCnpj,
      email,
    }),
  };

  try {
    const response = await fetch('https://api-sandbox.asaas.com/v3/customers', options);
    const data = await response.json();

    if (!response.ok) {
      console.error('[Asaas Action] Erro da API Asaas:', data);
      const errorMessage = data.errors?.[0]?.description || 'Não foi possível criar o cliente.';
      return { error: errorMessage };
    }

    // Retorna o ID do cliente criado
    return { customerId: data.id };
  } catch (e) {
    console.error('[Asaas Action] Erro de rede/fetch:', e);
    return { error: 'Ocorreu um erro de comunicação com o provedor de pagamento.' };
  }
}
