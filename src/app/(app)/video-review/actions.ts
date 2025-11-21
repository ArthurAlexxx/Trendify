
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Schema para a saída da análise de vídeo
const VideoAnalysisOutputSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'Uma nota geral de 0 a 10 para o potencial de viralização do vídeo.'
    ),
  hookAnalysis: z
    .string()
    .describe(
      'Análise detalhada dos primeiros 3 segundos do vídeo (o gancho). Avalie se ele é eficaz em prender a atenção.'
    ),
  contentAnalysis: z
    .string()
    .describe(
      'Análise do conteúdo principal do vídeo. Avalie a qualidade da informação, entretenimento, edição, ritmo e retenção.'
    ),
  ctaAnalysis: z
    .string()
    .describe(
      'Análise da chamada para ação (Call to Action). Verifique se é clara, eficaz e alinhada com os objetivos de um criador de conteúdo.'
    ),
  improvementPoints: z
    .array(z.string())
    .describe(
      'Uma lista de 3 a 4 pontos de melhoria acionáveis e específicos para o criador aplicar em vídeos futuros.'
    ),
});

export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;

// Schema para a entrada do formulário
const formSchema = z.object({
  videoUrl: z.string().url('A URL do vídeo é obrigatória.'),
});

export type VideoAnalysisState = {
  operationId?: string;
  error?: string;
};

// Definição do flow do Genkit
const analysisFlow = ai.defineFlow(
  {
    name: 'videoAnalysisFlow',
    inputSchema: z.object({ videoUrl: z.string() }),
    outputSchema: VideoAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `Você é um "AI Video Strategist", um especialista em conteúdo viral para criadores no Instagram e TikTok. Sua tarefa é analisar um vídeo e fornecer um feedback construtivo e acionável.

    Analise o vídeo fornecido e retorne um JSON estruturado com base no schema.

    Vídeo para análise: {{media url=${input.videoUrl}}}

    Diretrizes para a análise:
    - overallScore: Dê uma nota de 0 a 10, onde 10 é um vídeo com altíssimo potencial de viralização. Seja crítico.
    - hookAnalysis: Foque nos primeiros 3 segundos. O gancho é forte? Gera curiosidade? É rápido o suficiente?
    - contentAnalysis: O vídeo entrega o que promete? O ritmo é bom? A edição ajuda a reter a atenção? A mensagem é clara?
    - ctaAnalysis: O que o vídeo pede para o espectador fazer? É um bom CTA para crescimento (seguir, comentar, salvar) ou para vendas?
    - improvementPoints: Dê dicas práticas. Ex: "Adicionar legendas dinâmicas nos primeiros 5s" ou "Encurtar a introdução para ir direto ao ponto".`;
    
    const { output } = await ai.generate({
        prompt,
        model: googleAI.model('gemini-pro-vision'),
        output: { schema: VideoAnalysisOutputSchema },
        config: {
            temperature: 0.5,
        },
    });

    if (!output) {
      throw new Error('A IA não retornou uma análise.');
    }
    return output;
  }
);

// Ação do servidor que será chamada pelo formulário
export async function analyzeVideoAction(
  prevState: VideoAnalysisState | null,
  formData: FormData
): Promise<VideoAnalysisState> {
  const parsed = formSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: 'URL do vídeo inválida.' };
  }

  try {
    const { operation } = await analysisFlow.run(parsed.data);

    if (!operation.done) {
      return { operationId: operation.name };
    }

    return { error: 'A análise não pôde ser iniciada.' };
  } catch (e) {
    console.error('[analyzeVideoAction] Error:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao iniciar a análise do vídeo: ${errorMessage}` };
  }
}

export async function checkAnalysisStatus(operationId: string) {
    try {
        const operation = await ai.checkOperation(operationId);
        if (operation.done) {
            return {
                done: true,
                result: operation.output as VideoAnalysisOutput,
                error: operation.error,
            };
        }
        return { done: false };
    } catch(e) {
        console.error(`[checkAnalysisStatus] Error checking operation ${operationId}`, e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return { done: true, error: { message: errorMessage } };
    }
}
