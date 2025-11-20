'use server';

import OpenAI from 'openai';
import { z } from 'zod';

// Esquema de saída esperado da IA
const AiSuggestedVideoScriptsOutputSchema = z.object({
  videoScript: z.string().describe('Um roteiro de vídeo detalhado e conciso, com indicações de cena e narração, otimizado para reter a atenção do público-alvo da marca.'),
  proposalDraft: z.string().describe('Um rascunho de proposta persuasiva para a marca, destacando como o vídeo proposto e o perfil do criador podem atender aos objetivos de marketing da marca.'),
});

export type AiSuggestedVideoScriptsOutput = z.infer<
  typeof AiSuggestedVideoScriptsOutputSchema
>;

// Esquema de entrada do formulário
const formSchema = z.object({
  productDescription: z.string().min(10, 'A descrição do produto deve ter pelo menos 10 caracteres.'),
  brandDetails: z.string().min(10, 'Os detalhes da marca devem ter pelo menos 10 caracteres.'),
  trendingTopic: z.string().optional(),
});

type ProposalState = {
  data?: AiSuggestedVideoScriptsOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to extract JSON from a string
function extractJson(text: string) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  return null;
}

async function getAiSuggestedVideoScripts(
  input: z.infer<typeof formSchema>
): Promise<AiSuggestedVideoScriptsOutput> {
  const systemPrompt = `Você é um "AI Partnership Manager", um estrategista de conteúdo especialista em criar propostas de colaboração entre criadores de conteúdo e marcas.
Sua tarefa é gerar um roteiro de vídeo e um rascunho de proposta que sejam irresistíveis para a marca.
Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Gere uma proposta de conteúdo com base nos seguintes requisitos:

  - Detalhes da marca: ${input.brandDetails}
  - Descrição do produto a ser divulgado: ${input.productDescription}
  - (Opcional) Tópico ou tendência para integrar: ${input.trendingTopic || 'N/A'}

  Para cada campo do JSON, siga estas diretrizes:
  - videoScript: Crie um roteiro de vídeo (Reels/TikTok) que apresente o produto de forma autêntica e alinhada com o público da marca. Inclua sugestões de cenas, narração e como o produto será exibido.
  - proposalDraft: Escreva um rascunho de proposta curto e direto para ser enviado à marca. Comece com uma saudação, apresente a ideia de vídeo, destaque os benefícios da colaboração (alcance, engajamento, autenticidade) e sugira os próximos passos (ex: "Adoraria discutir como podemos adaptar esta ideia...").
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const jsonString = extractJson(content);
    if (!jsonString) {
      throw new Error('No valid JSON block found in the AI response.');
    }

    const parsedJson = JSON.parse(jsonString);
    return AiSuggestedVideoScriptsOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    throw new Error(`Failed to generate scripts from AI: ${errorMessage}`);
  }
}

export async function getAiSuggestedVideoScriptsAction(
  prevState: ProposalState,
  formData: FormData
): Promise<ProposalState> {
  const parsed = formSchema.safeParse({
    productDescription: formData.get('productDescription'),
    brandDetails: formData.get('brandDetails'),
    trendingTopic: formData.get('trendingTopic'),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Invalid input.' };
  }

  try {
    const result = await getAiSuggestedVideoScripts(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate scripts: ${errorMessage}` };
  }
}
