
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VideoAnalysisOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo, avaliando se o gancho é forte e gera curiosidade.'),
  conteudo: z.string().describe('Análise do desenvolvimento do vídeo, ritmo e clareza da mensagem.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action) no final do vídeo.'),
  melhorias: z.array(z.string()).describe('Uma lista de 3 dicas práticas para o criador melhorar o vídeo.'),
});

export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;

type ActionState = {
  data?: VideoAnalysisOutput;
  error?: string;
} | null;


const formSchema = z.object({
  videoDataUri: z.string(),
});

/**
 * Server Action to analyze a video provided as a data URI.
 */
export async function analyzeVideo(
  input: { videoDataUri: string }
): Promise<ActionState> {
  
  const parsed = formSchema.safeParse(input);

  if (!parsed.success) {
    const error = 'Dados de entrada inválidos.';
    console.error(error, parsed.error.issues);
    return { error };
  }

  try {
    const analysis = await analyzeVideoFlow(parsed.data);
    return { data: analysis };
  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise:", e);
    const errorMessage = e.message || "Ocorreu um erro desconhecido durante a análise.";
    return { error: errorMessage };
  }
}

// 1. Define o prompt para a IA
const prompt = ai.definePrompt({
  name: 'videoAnalysisExpert',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: z.object({ videoDataUri: z.string() }) },
  output: { schema: VideoAnalysisOutputSchema },
  prompt: `Você é uma IA especialista em conteúdo viral e estrategista para criadores de conteúdo. Sua tarefa é analisar um vídeo e fornecer um diagnóstico completo e acionável em português do Brasil.

Analise o vídeo fornecido e retorne sua análise ESTRITAMENTE no formato JSON solicitado.

Vídeo: {{media url=videoDataUri}}

Diretrizes para a Análise:
- geral: Dê uma nota de 0 a 10 para o potencial de viralização do vídeo, com base em todos os critérios.
- gancho: Avalie os primeiros 3 segundos. O gancho é forte? Gera curiosidade? É rápido o suficiente?
- conteudo: Avalie o desenvolvimento do vídeo. O ritmo é bom? A mensagem é clara? O conteúdo entrega o que o gancho prometeu?
- cta: Avalie a chamada para ação no final. Ela é clara? É relevante para o conteúdo? Incentiva uma ação específica?
- melhorias: Forneça EXATAMENTE 3 dicas práticas e diretas que o criador pode aplicar para melhorar o vídeo. Comece cada dica com um verbo de ação (ex: "Adicione legendas dinâmicas...", "Corte os primeiros 2 segundos...", "Use um gancho mais direto...").`,
});


// 2. Define o fluxo Genkit para a análise
const analyzeVideoFlow = ai.defineFlow(
  {
    name: 'videoAnalysisFlow',
    inputSchema: z.object({ videoDataUri: z.string() }),
    outputSchema: VideoAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("A IA não retornou uma análise.");
    }
    return output;
  }
);
