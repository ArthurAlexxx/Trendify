
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

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
      'Análise detalhada dos primeiros 3 segundos do vídeo (o gancho). Avalie se ele é eficaz em prender a atenção, considerando tanto os elementos visuais quanto o áudio.'
    ),
  contentAnalysis: z
    .string()
    .describe(
      'Análise do conteúdo principal do vídeo. Avalie a qualidade da informação, entretenimento, edição, ritmo e retenção, usando a transcrição e os frames.'
    ),
  ctaAnalysis: z
    .string()
    .describe(
      'Análise da chamada para ação (Call to Action). Verifique se é clara, eficaz e alinhada com os objetivos de um criador de conteúdo, considerando o que foi dito e mostrado.'
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
    const prompt = `Você é um "AI Video Strategist", um especialista em conteúdo viral para criadores no Instagram e TikTok. Sua tarefa é analisar um vídeo, considerando tanto seus frames (imagens) quanto a transcrição do áudio, para fornecer um feedback construtivo e acionável.

    Analise o vídeo fornecido e retorne um JSON estruturado com base no schema.

    Vídeo para análise: {{media url=${input.videoUrl}}}

    Diretrizes para a análise:
    - overallScore: Dê uma nota de 0 a 10 para o potencial de viralização. Seja crítico e baseie-se em todos os aspectos (visual, áudio, ritmo, mensagem).
    - hookAnalysis: Foque nos primeiros 3 segundos. O gancho visual é forte? A primeira frase dita prende a atenção? A combinação de imagem e som é eficaz?
    - contentAnalysis: O conteúdo visual (frames) é interessante e bem editado? A transcrição do áudio mostra que a mensagem é clara, valiosa e bem estruturada? O ritmo da fala e da edição funcionam bem juntos?
    - ctaAnalysis: O que o vídeo pede para o espectador fazer? O CTA é claro tanto visualmente (ex: texto na tela) quanto no áudio?
    - improvementPoints: Dê dicas práticas que combinem melhorias visuais e de roteiro. Ex: "Adicionar legendas dinâmicas nos primeiros 5s para reforçar o gancho de áudio" ou "Encurtar a introdução falada para ir direto ao ponto mostrado no frame inicial".`;
    
    const { output } = await ai.generate({
        prompt,
        model: 'googleai/gemini-1.5-flash-latest',
        output: { schema: VideoAnalysisOutputSchema },
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
    // Usamos .run() para iniciar a operação e obter o objeto da operação.
    const operation = await analysisFlow.run(parsed.data);

    // Retornamos o nome (ID) da operação para o cliente.
    return { operationId: operation.name };
  } catch (e) {
    console.error('[analyzeVideoAction] Error starting analysis:', e);
    const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao iniciar a análise do vídeo: ${errorMessage}` };
  }
}

export async function checkAnalysisStatus(operationId: string) {
    try {
        const operation = await ai.checkOperation(operationId);
        
        if (operation.done) {
            if (operation.error) {
              // Log detalhado do erro da operação no servidor
              console.error(`[checkAnalysisStatus] Erro na operação ${operationId}:`, JSON.stringify(operation.error, null, 2));
              // Retorna a mensagem de erro para ser exibida no cliente
              return { done: true, error: { message: operation.error.message || 'Erro desconhecido na operação.' } };
            }
            // Se a operação foi concluída com sucesso
            return {
                done: true,
                result: operation.output as VideoAnalysisOutput,
            };
        }
        // Se a operação ainda está em andamento
        return { done: false };
    } catch(e) {
        // Erro ao tentar verificar o status (ex: problema de rede)
        console.error(`[checkAnalysisStatus] Erro ao verificar o status da operação ${operationId}:`, e);
        const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido ao verificar status.';
        return { done: true, error: { message: errorMessage } };
    }
}
