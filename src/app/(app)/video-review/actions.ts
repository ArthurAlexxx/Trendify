
'use server';
/**
 * @fileOverview An AI flow to analyze video content.
 *
 * - analyzeVideo - A function that handles the video analysis process.
 * - AnalyzeVideoInput - The input type for the analyzeVideo function.
 * - AnalyzeVideoOutput - The return type for the analyzeVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeVideoInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video file, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeVideoInput = z.infer<typeof AnalyzeVideoInputSchema>;

const VideoAnalysisOutputSchema = z.object({
  geral: z.string().describe("Uma nota geral de 0 a 10 para o potencial de viralização do vídeo."),
  gancho: z.string().describe("Análise do gancho (primeiros 3 segundos), explicando o que funciona ou o que pode ser melhorado para reter a atenção."),
  conteudo: z.string().describe("Análise do conteúdo principal (o 'miolo' do vídeo), avaliando a entrega de valor, ritmo e engajamento."),
  cta: z.string().describe("Análise da chamada para ação (CTA), avaliando se é clara, convincente e alinhada ao objetivo do vídeo."),
  melhorias: z.array(z.string()).describe("Um checklist com 3 sugestões práticas e acionáveis para o criador melhorar o vídeo."),
});
export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;


export async function analyzeVideo(
  input: AnalyzeVideoInput
): Promise<VideoAnalysisOutput> {
  return analyzeVideoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVideoPrompt',
  input: { schema: AnalyzeVideoInputSchema },
  output: { schema: VideoAnalysisOutputSchema },
  model: 'googleai/gemini-2.5-flash',
  prompt: `Você é uma IA especialista em conteúdo viral e estrategista para criadores de conteúdo. Sua tarefa é analisar um vídeo e fornecer um diagnóstico completo e acionável.

Analise o vídeo fornecido e retorne sua análise ESTRITAMENTE no formato JSON solicitado.

Vídeo: {{media url=videoDataUri}}

Diretrizes para a Análise:
- geral: Dê uma nota de 0 a 10 para o potencial de viralização do vídeo, com base em todos os critérios.
- gancho: Avalie os primeiros 3 segundos. O gancho é forte? Gera curiosidade? É rápido o suficiente?
- conteudo: Avalie o desenvolvimento do vídeo. O ritmo é bom? A mensagem é clara? O conteúdo entrega o que o gancho prometeu?
- cta: Avalie a chamada para ação no final. Ela é clara? É relevante para o conteúdo? Incentiva uma ação específica?
- melhorias: Forneça EXATAMENTE 3 dicas práticas e diretas que o criador pode aplicar para melhorar o vídeo. Comece cada dica com um verbo de ação (ex: "Adicione legendas dinâmicas...", "Corte os primeiros 2 segundos...", "Use um gancho mais direto...").`,
});

const analyzeVideoFlow = ai.defineFlow(
  {
    name: 'analyzeVideoFlow',
    inputSchema: AnalyzeVideoInputSchema,
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
