
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VideoAnalysisOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).length(3).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
  estimatedHeatmap: z.string().describe("Uma análise textual de onde a retenção do público provavelmente cai, com base no ritmo e estrutura do vídeo. Ex: 'A retenção provavelmente cai entre 8s-12s devido à explicação muito longa.'"),
  comparativeAnalysis: z.string().describe("Uma breve comparação do vídeo analisado com padrões de sucesso do nicho. Ex: 'Comparado a outros vídeos de receita, o seu tem uma ótima fotografia, mas o ritmo é 20% mais lento.'"),
});


export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;

type ActionState = {
  data?: VideoAnalysisOutput;
  error?: string;
  isOverloaded?: boolean;
} | null;


const formSchema = z.object({
  videoUrl: z.string().url(),
  videoDescription: z.string().optional(),
});

async function urlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Falha ao buscar o vídeo da URL: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
}


/**
 * Server Action to analyze a video provided as a data URI.
 */
export async function analyzeVideo(
  input: { videoUrl: string, videoDescription?: string }
): Promise<ActionState> {
  
  const parsed = formSchema.safeParse(input);

  if (!parsed.success) {
    const error = 'URL do vídeo inválida.';
    console.error(error, parsed.error.issues);
    return { error };
  }
  
  const { videoUrl, videoDescription } = parsed.data;

  try {
    const videoDataUri = await urlToDataUri(videoUrl);
    const analysis = await analyzeVideoFlow({ videoDataUri, videoDescription: videoDescription || 'N/A' });
    return { data: analysis };
  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise de vídeo:", e);

    if (e.message && (e.message.includes('503') || e.message.toLowerCase().includes('overloaded') || e.message.toLowerCase().includes('resource has been exhausted'))) {
        return {
            error: 'Ocorreu uma sobrecarga em nossos servidores de IA. Por favor, aguarde alguns instantes e tente novamente. Sua análise não foi consumida.',
            isOverloaded: true,
        };
    }
    
    const errorMessage = e.message.includes('fetch') 
      ? `Não foi possível acessar o vídeo para análise. Verifique se a URL está correta e publicamente acessível. Detalhe: ${e.message}`
      : `Ocorreu um erro durante a análise: ${e.message || "Erro desconhecido."}`;

    return { error: errorMessage };
  }
}

// 1. Define o prompt para a IA
const prompt = ai.definePrompt({
  name: 'videoAnalysisExpert',
  model: 'googleai/gemini-pro-vision',
  input: { schema: z.object({ videoDataUri: z.string(), videoDescription: z.string() }) },
  output: { schema: VideoAnalysisOutputSchema },
  prompt: `Você é uma consultora de conteúdo viral e estrategista para criadores de conteúdo. Sua tarefa é fornecer uma análise profunda, profissional e acionável em português do Brasil.
  Lembre-se, a data atual é dezembro de 2025.

Analise o vídeo fornecido e sua descrição, e retorne sua análise ESTRITAMENTE no formato JSON solicitado.

- Descrição do vídeo/contexto: {{videoDescription}}
- Vídeo: {{media url=videoDataUri}}

Diretrizes para a Análise Profissional:
- geral: Dê uma nota de 0 a 10 para o potencial de viralização. É OBRIGATÓRIO que você forneça uma justificativa clara e concisa para a nota.
- gancho: Dê uma nota de 0 a 10 para os primeiros 3 segundos. Avalie se o gancho é forte, se gera curiosidade ou quebra um padrão. Justifique sua nota.
- conteudo: Analise o desenvolvimento, ritmo e entrega de valor do vídeo. Aponte um ponto específico que pode estar causando perda de retenção.
- cta: Avalie a chamada para ação. Ela é clara, direta e alinhada com o objetivo do vídeo?
- melhorias: Forneça EXATAMENTE 3 dicas em formato de checklist, práticas e acionáveis, para o criador melhorar o vídeo.
- estimatedHeatmap: Estime textualmente onde a retenção provavelmente cai, com base no ritmo e estrutura. Ex: "A retenção deve cair entre 8s-12s devido à explicação longa."
- comparativeAnalysis: Compare o vídeo com padrões de sucesso do nicho. Ex: "Comparado a outros vídeos de receita, o seu tem ótima fotografia, mas o ritmo é 20% mais lento."`,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        }
    ]
  }
});


// 2. Define o fluxo Genkit para a análise
const analyzeVideoFlow = ai.defineFlow(
  {
    name: 'videoAnalysisFlow',
    inputSchema: z.object({ videoDataUri: z.string(), videoDescription: z.string() }),
    outputSchema: VideoAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("A plataforma de IA não retornou uma análise. Tente novamente.");
    }
    return output;
  }
);
