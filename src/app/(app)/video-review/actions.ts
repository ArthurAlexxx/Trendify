
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

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

const formSchema = z.object({
  videoDataUri: z.string().describe(
    "A video file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});

type ActionState = {
  data?: VideoAnalysisOutput;
  error?: string;
} | null;

const analysisFlow = ai.defineFlow(
  {
    name: 'videoAnalysisFlow',
    inputSchema: formSchema,
    outputSchema: VideoAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `Você é um "AI Video Strategist", um especialista em conteúdo viral para criadores no Instagram e TikTok. Sua tarefa é analisar um vídeo, considerando tanto seus frames (imagens) quanto a transcrição do áudio, para fornecer um feedback construtivo e acionável.

    Analise o vídeo fornecido e retorne um JSON estruturado com base no schema.

    Vídeo para análise: {{media url=videoDataUri}}

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

export async function analyzeVideoAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const videoDataUri = formData.get('videoDataUri') as string;
  const parsed = formSchema.safeParse({ videoDataUri });

  if (!parsed.success) {
    const error = parsed.error.issues.map((i) => i.message).join(', ');
    return { error };
  }

  try {
    const result = await analysisFlow(parsed.data);
    return { data: result };
  } catch (e: any) {
    const errorMessage = e.message || 'Ocorreu um erro desconhecido durante a análise.';
    console.error(`[analyzeVideoAction] Erro ao executar o flow: ${errorMessage}`);
    return { error: `Falha ao analisar o vídeo: ${errorMessage}` };
  }
}
