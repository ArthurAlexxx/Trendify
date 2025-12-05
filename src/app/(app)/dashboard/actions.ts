
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const MetricSnapshotSchema = z.object({
  date: z.string().datetime(),
  platform: z.enum(['instagram', 'tiktok']),
  followers: z.number(),
  views: z.number(),
  likes: z.number(),
  comments: z.number(),
});

const DashboardInsightSchema = z.object({
    insight: z.string().describe("Um insight curto e acionável com base na evolução das métricas fornecidas.")
});

export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;

const GenerateDashboardInsightsInputSchema = z.object({
  metricSnapshots: z.array(MetricSnapshotSchema),
  niche: z.string(),
  objective: z.string(),
});

const GenerateDashboardInsightsOutputSchema = z.object({
    insights: z.array(DashboardInsightSchema).length(3).describe("Uma lista de exatamente 3 insights acionáveis.")
});


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJson(text: string) {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  return null;
}


/**
 * Genera insights analisando a tendência de uma lista de métricas, usando IA.
 * @param input - Um objeto contendo niche, objective e a lista de metricSnapshots.
 * @returns Uma lista de insights acionáveis gerados pela IA.
 */
export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsight[]> {
  const { metricSnapshots, niche, objective } = input;

  if (metricSnapshots.length < 2) {
    throw new Error("Dados insuficientes para gerar uma análise. Colete dados por mais alguns dias.");
  }
  
  const systemPrompt = `Você é um "AI Growth Strategist", especialista em analisar métricas de redes sociais e transformá-las em conselhos práticos para criadores de conteúdo.
  Sua tarefa é analisar a evolução das métricas de um criador nos últimos dias e fornecer EXATAMENTE 3 insights acionáveis.
  Seja criativo e forneça insights variados a cada vez que for chamado, mesmo com os mesmos dados. Pense em diferentes ângulos: engajamento vs. alcance, consistência, tipo de conteúdo, etc.
  Você DEVE responder com um objeto JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema: { insights: [{ insight: "seu insight aqui" }, ...] }`;

  const userPrompt = `
  Analise os seguintes dados e gere 3 insights criativos e acionáveis:

  - Nicho do Criador: ${niche}
  - Objetivo Atual: ${objective}
  - Dados de Métricas (array ordenado do mais recente para o mais antigo): ${JSON.stringify(metricSnapshots, null, 2)}

  Exemplos de bons insights:
  - "Seu engajamento (curtidas + comentários) cresceu 15% nos últimos 3 dias, mas as visualizações caíram. Tente usar ganchos mais fortes nos seus próximos vídeos para reter a atenção."
  - "Você teve um pico de seguidores no dia X. Analise o conteúdo postado nesse dia, ele claramente ressoou com o público e pode ser um formato a ser repetido."
  - "Suas métricas no TikTok estão superando as do Instagram em visualizações. Considere adaptar um conteúdo de sucesso do TikTok para os Reels do Instagram."

  Agora, gere sua análise com base nos dados fornecidos.
  `;
  
   try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // Um pouco mais de criatividade
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');
    
    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');

    const parsedJson = JSON.parse(jsonString);
    const validatedData = GenerateDashboardInsightsOutputSchema.parse(parsedJson);

    return validatedData.insights;
  } catch (error) {
    console.error('Error in generateDashboardInsights:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar insights com a IA: ${errorMessage}`);
  }
}
