
'use server';

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
  metricSnapshots: z.array(MetricSnapshotSchema),
});


function calculateTrend(current: number, previous: number): { percentage: number, text: string } {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, text: 'crescimento' };
  }
  const percentage = ((current - previous) / previous) * 100;
  const text = percentage >= 0 ? 'crescimento' : 'queda';
  return { percentage, text };
}

/**
 * Genera insights analisando a tendência de uma lista de métricas, sem usar IA.
 * @param input - Um objeto contendo a lista de metricSnapshots.
 * @returns Uma lista de insights acionáveis.
 */
export async function generateDashboardInsights(
  input: z.infer<typeof GenerateDashboardInsightsInputSchema>
): Promise<DashboardInsight[]> {
  const { metricSnapshots } = input;

  if (metricSnapshots.length < 2) {
    return [{ insight: "Colete dados por mais alguns dias para ver as tendências de crescimento." }];
  }

  // Ordena do mais antigo para o mais recente
  const sortedSnaps = metricSnapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latestSnap = sortedSnaps[sortedSnaps.length - 1];
  const oldestSnap = sortedSnaps[0];
  const insights: DashboardInsight[] = [];

  // Insight de Seguidores
  const followersTrend = calculateTrend(latestSnap.followers, oldestSnap.followers);
  if (Math.abs(followersTrend.percentage) > 2) { // Só mostra se a mudança for > 2%
      insights.push({
          insight: `Seu número de seguidores teve um ${followersTrend.text} de ${followersTrend.percentage.toFixed(0)}% desde ${new Date(oldestSnap.date).toLocaleDateString('pt-BR')}.`
      });
  }

  // Insight de Visualizações
  const totalViews = sortedSnaps.reduce((acc, s) => acc + s.views, 0);
  const avgViews = totalViews / sortedSnaps.length;

  const viewsTrend = calculateTrend(latestSnap.views, avgViews);
   if (latestSnap.views > 0 && Math.abs(viewsTrend.percentage) > 10) {
     const direction = viewsTrend.percentage > 0 ? 'acima' : 'abaixo';
     insights.push({
         insight: `Suas visualizações no último dia estão ${viewsTrend.percentage.toFixed(0)}% ${direction} da sua média recente.`
     });
  }

  // Insight de Engajamento (Likes + Comentários)
  const latestEngagement = latestSnap.likes + latestSnap.comments;
  const oldestEngagement = oldestSnap.likes + oldestSnap.comments;
  const engagementTrend = calculateTrend(latestEngagement, oldestEngagement);

  if (latestEngagement > 0 && Math.abs(engagementTrend.percentage) > 5) {
     insights.push({
         insight: `Seu engajamento (curtidas + comentários) teve uma variação de ${engagementTrend.percentage.toFixed(0)}% no período.`
     });
  }
  
  if (insights.length === 0) {
      return [{ insight: "Suas métricas estão estáveis. Continue publicando para ver novas tendências!" }];
  }

  return insights.slice(0, 3); // Limita a 3 insights
}
