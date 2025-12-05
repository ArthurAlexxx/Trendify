
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const TrendSuggestionSchema = z.object({
  hook: z.string().describe("Um gancho ou título para a ideia de vídeo."),
  icon: z.string().emoji().describe("Um emoji que representa a ideia."),
});

const GrowthDataPointSchema = z.object({
  month: z.number().describe("O número do mês (ex: 0, 1, 2...)."),
  followers: z.number().describe("O número de seguidores projetado para aquele mês."),
});

const GrowthCalculatorOutputSchema = z.object({
  months: z.number().describe("O número total de meses estimados para atingir a meta."),
  goalDate: z.string().describe("A data estimada em que a meta será atingida, no formato ISO 8601."),
  currentEarnings: z.array(z.number()).length(2).describe("Uma faixa de ganhos mensais estimada com os seguidores atuais [min, max]."),
  goalEarnings: z.array(z.number()).length(2).describe("Uma faixa de ganhos mensais estimada ao atingir a meta de seguidores [min, max]."),
  growthData: z.array(GrowthDataPointSchema).describe("Um array de objetos, onde cada objeto tem 'month' e 'followers', para plotar a curva de crescimento."),
  trendSuggestions: z.array(TrendSuggestionSchema).length(3).describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
  postsPerMonth: z.number().describe("O número de publicações por mês usado no cálculo, para exibição."),
  difficultyScore: z.enum(['Fácil', 'Realista', 'Difícil']).describe("Classificação do quão realista é atingir a meta com os dados fornecidos."),
  riskPanel: z.array(z.string()).describe("Lista com 2-3 riscos e pontos fracos que podem atrasar a meta."),
  recommendations: z.array(z.string()).describe("Lista de 2-3 recomendações acionáveis para alcançar a meta mais rápido."),
  benchmarkComparison: z.string().describe("Uma breve análise de como o usuário se compara ao mercado do nicho em termos de crescimento."),
  accelerationScenarios: z.object({
      maintain: z.number().describe("Meses para atingir a meta mantendo o ritmo atual."),
      plus20: z.number().describe("Meses para atingir a meta aumentando os posts em 20%."),
      plus40: z.number().describe("Meses para atingir a meta aumentando os posts em 40%."),
  }).describe("Cenários de aceleração do crescimento baseados no volume de posts."),
});


export type GrowthCalculatorOutput = z.infer<typeof GrowthCalculatorOutputSchema>;

const formSchema = z.object({
  niche: z.string().min(3, 'O nicho deve ter pelo menos 3 caracteres.'),
  followers: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'O número de seguidores é muito alto.'),
  goal: z.number().min(1, 'Deve ser maior que 0').max(50000000, 'A meta de seguidores é muito alta.'),
  postsPerMonth: z.number().min(0),
});

type FormSchemaType = z.infer<typeof formSchema>;

type ActionState = {
  data?: GrowthCalculatorOutput;
  error?: string;
};

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

async function calculateGrowthAI(input: FormSchemaType): Promise<GrowthCalculatorOutput> {
  const systemPrompt = `
Você é o GrowthAI Engine, um sistema avançado de análise e projeção para criadores de conteúdo. Sua função é atuar como um consultor profissional, combinando análise de dados, conhecimento de mercado e estratégia de conteúdo.

REGRAS:
1.  Você DEVE retornar somente um JSON válido que se conforme estritamente ao schema solicitado.
2.  Todos os cálculos devem ser realistas, baseados em benchmarks de mercado.
3.  A data base para qualquer cálculo de tempo é Dezembro de 2025.

MÓDULOS DE CÁLCULO INTERNO:
-   **Crescimento de Nicho:** Use estas taxas de crescimento mensais como base:
    -   Rápido (10-18%): Finanças, Tecnologia, Educação, Negócios.
    -   Médio (6-12%): Games, Fitness, Beleza, Reviews, Moda, Lifestyle.
    -   Lento (3-7%): Humor, Vlogs, Motivação, Cotidiano.
-   **Projeção de Ganhos:** Use um CPM (Custo por Mil visualizações) médio para o Brasil (ex: R$15 a R$150, dependendo do nicho) e um alcance orgânico entre 20% e 50% dos seguidores para estimar ganhos com publicidade.
-   **Dificuldade:** Avalie a meta como "Fácil", "Realista" ou "Difícil" com base na taxa de crescimento necessária e no número de posts por mês.
-   **Análise Estratégica:** Forneça riscos (riskPanel), recomendações (recommendations), e uma comparação com o mercado (benchmarkComparison) que sejam genuinamente úteis e específicas para o nicho.
`;

  const userPrompt = `
  Analise os seguintes dados e gere uma projeção de crescimento completa.

  - Nicho: ${input.niche}
  - Seguidores Atuais: ${input.followers}
  - Meta de Seguidores: ${input.goal}
  - Média de publicações por Mês: ${input.postsPerMonth}
  
  Execute seus módulos internos para calcular cada campo do JSON de resposta com máxima precisão e profissionalismo.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');

    const jsonString = extractJson(content);
    if (!jsonString) throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');

    const parsedJson = JSON.parse(jsonString);
    return GrowthCalculatorOutputSchema.parse(parsedJson);

  } catch (error) {
    console.error('Error in calculateGrowthAI:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(`Falha ao gerar projeção com a IA: ${errorMessage}`);
  }
}

export async function calculateGrowthAction(
  prevState: ActionState | null,
  data: FormSchemaType
): Promise<ActionState> {
  const parsed = formSchema.safeParse(data);

  if (!parsed.success) {
    return { error: 'Por favor, preencha todos os campos corretamente.' };
  }
  
  if (parsed.data.goal <= parsed.data.followers) {
    return { error: 'A meta de seguidores deve ser maior que o número atual de seguidores.' };
  }


  try {
    const result = await calculateGrowthAI(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao calcular crescimento: ${errorMessage}` };
  }
}
 