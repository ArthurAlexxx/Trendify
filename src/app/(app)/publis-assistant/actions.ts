'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const AiSuggestedVideoScriptsOutputSchema = z.object({
  videoScript: z.string().describe('Roteiro de vídeo gerado pela IA, otimizado para a marca e o produto, incluindo gancho e CTA.'),
  proposalDraft: z.string().describe('Minuta de proposta gerada pela IA para a colaboração com a marca.'),
});
export type AiSuggestedVideoScriptsOutput = z.infer<typeof AiSuggestedVideoScriptsOutputSchema>;

const formSchema = z.object({
  productDescription: z.string().min(10, 'Product description is too short.'),
  brandDetails: z.string().min(10, 'Brand details are too short.'),
  trendingTopic: z.string().optional(),
});

type PublisAssistantState = {
  data?: AiSuggestedVideoScriptsOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAiSuggestedVideoScripts(input: z.infer<typeof formSchema>): Promise<AiSuggestedVideoScriptsOutput> {
  const systemPrompt = `Você é um assistente de IA especialista em criar parcerias de sucesso entre criadores de conteúdo e marcas.
  Seu objetivo é gerar roteiros de vídeo autênticos e propostas comerciais persuasivas.
  Você DEVE responder em um objeto JSON válido que se conforme estritamente ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON.`;
  
  const userPrompt = `
  Com base nas informações a seguir, gere um roteiro de vídeo e uma minuta de proposta comercial.

  - Descrição do Produto: ${input.productDescription}
  - Detalhes da Marca: ${input.brandDetails}
  - Tópico em Alta (Opcional): ${input.trendingTopic}

  Diretrizes para cada campo do JSON:
  - videoScript:
    - Crie um roteiro de vídeo que soe autêntico para um criador de conteúdo, não um anúncio forçado.
    - Comece com um gancho forte que se conecte com a audiência do criador.
    - Integre o produto de forma natural, mostrando seus benefícios na prática.
    - Se um tópico em alta foi fornecido, incorpore-o de forma criativa.
    - Finalize com uma chamada para ação (CTA) clara e genuína.
    - Formate o roteiro com indicações de cena (ex: "[CENA: Unboxing do produto com luz natural]").

  - proposalDraft:
    - Escreva um rascunho de e-mail ou mensagem direta para a marca.
    - O tom deve ser profissional, mas com personalidade.
    - Apresente a ideia do vídeo de forma sucinta e empolgante.
    - Destaque os benefícios para a marca (ex: alcance, engajamento, associação com autenticidade).
    - Sugira os próximos passos, como "Adoraria discutir como podemos alinhar esta ideia à sua estratégia de marketing para o próximo trimestre."
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const parsedJson = JSON.parse(content);
    return AiSuggestedVideoScriptsOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to generate AI assets.');
  }
}

export async function getAiSuggestedVideoScriptsAction(
  prevState: PublisAssistantState,
  formData: FormData
): Promise<PublisAssistantState> {
  const parsed = formSchema.safeParse({
    productDescription: formData.get('productDescription'),
    brandDetails: formData.get('brandDetails'),
    trendingTopic: formData.get('trendingTopic'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.root?.join(', ') || 'Invalid input.' };
  }

  try {
    const result = await getAiSuggestedVideoScripts(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate assets: ${errorMessage}` };
  }
}
