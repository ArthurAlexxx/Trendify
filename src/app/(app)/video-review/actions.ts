'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const VideoReviewOutputSchema = z.object({
  score: z.number().describe('Uma pontuação geral para o vídeo (0-100), refletindo seu potencial de viralização.'),
  hookSuggestions: z.array(z.string()).describe('Sugestões acionáveis para melhorar o gancho do vídeo nos primeiros 2 segundos.'),
  pacingSuggestions: z.string().describe('Sugestões sobre o ritmo, cortes e energia do vídeo para maximizar a retenção.'),
  caption: z.string().describe('Uma legenda otimizada para a plataforma, com hashtags estratégicas e um CTA claro.'),
  scriptVariations: z.array(z.string()).describe('Variações otimizadas do roteiro para melhorar a clareza e o impacto da mensagem.'),
});
export type VideoReviewOutput = z.infer<typeof VideoReviewOutputSchema>;


const formSchema = z.object({
  videoLink: z.string().url('Please enter a valid video URL.'),
});

type VideoReviewState = {
  data?: VideoReviewOutput;
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
  // Fallback for cases where the AI might not use markdown
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // Look for the first '{' and the last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  return null;
}

async function getVideoReview(input: z.infer<typeof formSchema>): Promise<VideoReviewOutput> {
  const systemPrompt = `Você é um "IA Video Coach", um especialista em análise de vídeos de redes sociais com o objetivo de ajudar criadores a viralizar.
  Sua análise deve ser construtiva, detalhada e acionável.
  Embora você não possa acessar o link diretamente, sua tarefa é gerar uma revisão completa e realista como se tivesse assistido ao vídeo. Baseie sua análise nas melhores práticas comuns para vídeos virais no TikTok e Instagram.
  Você DEVE responder com um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON.`;
  
  const userPrompt = `
  Analise o vídeo do seguinte link como se você o tivesse assistido: ${input.videoLink}

  Forneça um diagnóstico completo, seguindo estritamente estas diretrizes para cada campo do JSON:

  - score: Atribua uma "Pontuação de Viralização" de 0 a 100, baseada em uma avaliação simulada de fatores como clareza do gancho, retenção, qualidade audiovisual e engajamento potencial.
  
  - hookSuggestions: Forneça 3 sugestões distintas e específicas para tornar os primeiros 2 segundos do vídeo mais cativantes. Ex: ["Em vez de 'Oi pessoal', comece com 'Você não vai acreditar no que aconteceu...'", "Mostre o resultado final nos primeiros 0.5s antes de começar o tutorial."]. Retorne um array de strings.

  - pacingSuggestions: Comente sobre o ritmo do vídeo. Seja específico. Ex: "O ritmo está um pouco lento entre 5s e 10s. Considere adicionar cortes mais rápidos (B-rolls) ou um efeito de zoom sutil para manter a energia."

  - caption: Escreva uma legenda otimizada. Ela deve ter uma primeira linha que prenda a atenção, um corpo de texto que complemente o vídeo e de 3 a 5 hashtags estratégicas (uma mistura de nicho e hashtags amplas). Finalize com uma pergunta ou CTA para incentivar comentários.

  - scriptVariations: Ofereça 2 variações do roteiro do vídeo. Elas podem ser uma abordagem diferente do mesmo tópico, uma versão mais curta e direta, ou uma com um tom de voz diferente (ex: mais humorístico ou mais sério). Retorne um array de strings.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
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
    return VideoReviewOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const baseMessage = 'Failed to generate AI review. Note: The AI generates a simulated review based on best practices, as it cannot access external video links directly.';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error.';
    throw new Error(`${baseMessage} Details: ${errorMessage}`);
  }
}


export async function getVideoReviewAction(
  prevState: VideoReviewState,
  formData: FormData
): Promise<VideoReviewState> {
  const parsed = formSchema.safeParse({
    videoLink: formData.get('videoLink'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.videoLink?.join(', ') || 'Invalid URL.' };
  }

  try {
    const result = await getVideoReview(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to review video: ${errorMessage}` };
  }
}
