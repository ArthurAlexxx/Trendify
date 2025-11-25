
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';

const VideoAnalysisOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
});

export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;

type ActionState = {
  data?: VideoAnalysisOutput;
  error?: string;
} | null;


const formSchema = z.object({
  videoUrl: z.string().url(),
});

async function urlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${response.statusText}`);
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
  input: { videoUrl: string }
): Promise<ActionState> {
  
  const parsed = formSchema.safeParse(input);

  if (!parsed.success) {
    const error = 'Dados de entrada inválidos.';
    console.error(error, parsed.error.issues);
    return { error };
  }

  try {
    const videoDataUri = await urlToDataUri(parsed.data.videoUrl);
    const analysis = await analyzeVideoFlow({ videoDataUri: videoDataUri });
    return { data: analysis };
  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise:", e);
    const errorMessage = `Não foi possível acessar o vídeo para análise. Verifique se o caminho do arquivo está correto. Detalhe: ${e.message || "Ocorreu um erro desconhecido durante a análise."}`;
    return { error: errorMessage };
  }
}

// 1. Define o prompt para a IA
const prompt = ai.definePrompt({
  name: 'videoAnalysisExpert',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: z.object({ videoDataUri: z.string() }) },
  output: { schema: VideoAnalysisOutputSchema },
  prompt: `Você é uma consultora de conteúdo viral e estrategista para criadores de conteúdo. Sua tarefa é fornecer uma análise profunda, profissional e acionável em português do Brasil.

Analise o vídeo fornecido e retorne sua análise ESTRITAMENTE no formato JSON solicitado.

Vídeo: {{media url=videoDataUri}}

Diretrizes para a Análise Profissional:
- geral: Dê uma nota de 0 a 10 para o potencial de viralização. É OBRIGATÓRIO que você forneça uma justificativa clara e concisa para a nota, mesmo que seja 0. Ex: "Nota 3/10: O vídeo tem boa qualidade, mas o gancho é fraco e não cria curiosidade inicial."
- gancho: Dê uma nota de 0 a 10 para os primeiros 3 segundos. Avalie se o gancho é forte, se gera curiosidade ou quebra um padrão. Justifique sua nota. Ex: "Nota 8/10: Excelente. A pergunta inicial cria um loop de curiosidade imediato."
- conteudo: Analise o desenvolvimento. O ritmo é bom? A mensagem é clara? Existem partes lentas onde o usuário pode sair? Aponte um ponto específico que pode estar causando perda de retenção.
- cta: Avalie a chamada para ação. Ela é clara, direta e alinhada com o objetivo do vídeo? (vendas, comentários, seguidores, etc.). Sugira uma alternativa se necessário.
- melhorias: Forneça EXATAMENTE 3 dicas em formato de checklist. As dicas devem ser práticas e focadas nos maiores pontos de melhoria. Comece cada dica com um verbo de ação. Ex: "Adicione legendas dinâmicas para aumentar a retenção", "Corte os primeiros 2 segundos para ir direto ao ponto", "Use um gancho mais polêmico para gerar debate".`,
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
    inputSchema: z.object({ videoDataUri: z.string() }),
    outputSchema: VideoAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("A plataforma não retornou uma análise.");
    }
    return output;
  }
);

    