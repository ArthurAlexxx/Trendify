
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// 1. Define os schemas de entrada e saída
const VideoAnalysisInputSchema = z.object({
  apiKey: z.string().min(1, 'A chave de API do Gemini é obrigatória.'),
  videoDataUri: z
    .string()
    .describe(
      "O arquivo de vídeo, como um data URI. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const VideoAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe('Uma descrição concisa do que está acontecendo no vídeo.'),
});

// Define o tipo de estado que a Ação do Servidor irá gerenciar
type ActionState = {
  data?: z.infer<typeof VideoAnalysisOutputSchema>;
  error?: string;
} | null;

// 2. Define o fluxo Genkit para a análise
const analysisFlow = ai.defineFlow(
  {
    name: 'simpleVideoAnalysisFlow',
    inputSchema: VideoAnalysisInputSchema,
    outputSchema: VideoAnalysisOutputSchema,
  },
  async (input) => {
    // Inicializa o plugin do Google AI com a chave fornecida pelo usuário
    // Isso é feito dinamicamente para cada chamada, usando a chave que o usuário insere na UI.
    const dynamicAi = ai.configure({
      plugins: [googleAI({ apiKey: input.apiKey, apiVersion: 'v1' })],
    });

    // Define o prompt para o modelo
    const prompt = `Você é um especialista em análise de vídeo. Analise o vídeo fornecido e descreva seu conteúdo em um parágrafo conciso.

    Vídeo para análise: {{media url=videoDataUri}}`;

    // Gera o conteúdo usando o modelo Gemini 1.5 Flash
    const { output } = await dynamicAi.generate({
      prompt,
      model: 'gemini-1.5-flash-latest',
      output: { schema: VideoAnalysisOutputSchema },
    });

    if (!output) {
      throw new Error('A IA não retornou uma análise.');
    }
    return output;
  }
);

// 3. Define a Ação do Servidor que será chamada pelo formulário
export async function analyzeVideoAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Extrai e valida os dados do formulário
  const validated = VideoAnalysisInputSchema.safeParse({
    apiKey: formData.get('apiKey'),
    videoDataUri: formData.get('videoDataUri'),
  });

  if (!validated.success) {
    return { error: validated.error.errors.map((e) => e.message).join(', ') };
  }

  try {
    // Executa o fluxo Genkit com os dados validados
    const result = await analysisFlow(validated.data);
    return { data: result };
  } catch (e: any) {
    const errorMessage =
      e.message || 'Ocorreu um erro desconhecido durante a análise.';
    console.error(`[analyzeVideoAction] Erro ao executar o flow: ${errorMessage}`);
    return { error: `Falha ao analisar o vídeo: ${errorMessage}` };
  }
}
