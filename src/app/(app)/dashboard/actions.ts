'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MetricSnapshotSchema = z.object({
  date: z.string().datetime(),
  platform: z.enum(['instagram', 'tiktok']),
  followers: z.number(),
  views: z.number(),
  likes: z.number(),
  comments: z.number(),
});

const DashboardInsightSchema = z.object({
    insight: z.string().describe("Um insight curto e acionável com base nas métricas fornecidas.")
});

export type DashboardInsight = z.infer<typeof DashboardInsightSchema>;

const GenerateDashboardInsightsInputSchema = z.object({
  niche: z.string(),
  objective: z.string(),
  metricSnapshots: z.array(MetricSnapshot),
});

const GenerateDashboardInsightsOutputSchema = z.object({
  insights: z
    .array(DashboardInsightSchema)
    .describe('Uma lista de 2 a 3 insights acionáveis sobre o desempenho do criador.'),
});

const prompt = ai.definePrompt({
  name: 'dashboardInsightGenerator',
  input: { schema: GenerateDashboardInsightsInputSchema },
  output: { schema: GenerateDashboardInsightsOutputSchema },
  prompt: `Você é um estrategista de crescimento para criadores de conteúdo. Analise as métricas dos últimos dias, o nicho e o objetivo do criador.
  
  - Nicho: {{niche}}
  - Objetivo: {{objective}}
  - Métricas Recentes:
  {{#each metricSnapshots}}
  - Dia: {{date}}, Plataforma: {{platform}}, Seguidores: {{followers}}, Views: {{views}}, Likes: {{likes}}, Comentários: {{comments}}
  {{/each}}

  Com base nisso, gere 2 ou 3 insights rápidos e acionáveis para ajudar o criador a atingir seu objetivo. Seja direto e prático. Foco em ações de curto prazo.`,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema,
    outputSchema: z.array(DashboardInsightSchema),
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
        throw new Error("A IA não conseguiu gerar insights. Tente novamente.");
    }
    return output.insights;
  }
);


export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsight[]> {
  return generateDashboardInsightsFlow(input);
}
