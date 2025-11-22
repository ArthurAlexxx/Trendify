
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

// 1. Define o schema de entrada (que vem do formulário)
const formSchema = z.object({
  videoDataUri: z
    .string()
    .min(1, 'O Data URI do vídeo não pode estar vazio.')
    .describe(
      "O arquivo de vídeo, como um data URI. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

// 2. Define o schema de saída da IA
const VideoAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe('Uma descrição concisa do que está acontecendo no vídeo.'),
});

// 3. Define o tipo de estado que a Ação do Servidor irá gerenciar
type ActionState = {
  data?: z.infer<typeof VideoAnalysisOutputSchema>;
  error?: string;
} | null;

// 4. Define o fluxo Genkit para a análise
const analysisFlow = ai.defineFlow(
  {
    name: 'simpleVideoAnalysisFlow',
    inputSchema: formSchema, // O fluxo agora espera a mesma entrada do formulário
    outputSchema: VideoAnalysisOutputSchema,
  },
  async (input) => {
    // O objeto 'ai' já está configurado globalmente em src/ai/genkit.ts
    // com a chave de API correta das variáveis de ambiente.

    const prompt = `Você é um especialista em análise de vídeo. Analise o vídeo fornecido e descreva seu conteúdo em um parágrafo conciso.

    Vídeo para análise: {{media url=videoDataUri}}`;

    const { output } = await ai.generate({
      prompt,
      model: 'gemini-1.5-flash-latest',
      input: { videoDataUri: input.videoDataUri }, // Passa a entrada para o prompt
      output: { schema: VideoAnalysisOutputSchema },
    });

    if (!output) {
      throw new Error('A IA não retornou uma análise.');
    }
    return output;
  }
);

// 5. Define a Ação do Servidor que será chamada pelo formulário
export async function analyzeVideoAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validated = formSchema.safeParse({
    videoDataUri: formData.get('videoDataUri'),
  });

  if (!validated.success) {
    return { error: validated.error.errors.map((e) => e.message).join(', ') };
  }
  
  if (!validated.data.videoDataUri) {
     return { error: 'Nenhum vídeo foi enviado para análise.' };
  }

  try {
    const result = await analysisFlow(validated.data);
    return { data: result };
  } catch (e: any) {
    const errorMessage =
      e.message || 'Ocorreu um erro desconhecido durante a análise.';
    console.error(`[analyzeVideoAction] Erro ao executar o flow: ${errorMessage}`);
    return { error: `Falha ao analisar o vídeo: ${errorMessage}` };
  }
}
