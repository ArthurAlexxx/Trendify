
'use server';

import { z } from 'zod';
import OpenAI from 'openai';

const TrendSuggestionSchema = z.object({
  hook: z.string().describe("Um gancho ou título para a ideia de vídeo."),
  icon: z.string().emoji().describe("Um emoji que representa a ideia."),
});

const GrowthDataPointSchema = z.object({
  month: z.union([z.string(), z.number()]).transform(val => Number(val)).describe("O número do mês (ex: 0, 1, 2...)."),
  followers: z.number().describe("O número de seguidores projetado para aquele mês."),
});

const GrowthCalculatorOutputSchema = z.object({
  months: z.number().describe("O número total de meses estimados para atingir a meta."),
  goalDate: z.string().describe("A data estimada em que a meta será atingida, no formato ISO 8601."),
  currentEarnings: z.array(z.number()).describe("Uma faixa de ganhos mensais estimada com os seguidores atuais [min, max]."),
  goalEarnings: z.array(z.number()).describe("Uma faixa de ganhos mensais estimada ao atingir a meta de seguidores [min, max]."),
  growthData: z.array(GrowthDataPointSchema).describe("Um array de objetos, onde cada objeto tem 'month' e 'followers', para plotar a curva de crescimento."),
  trendSuggestions: z.array(TrendSuggestionSchema).length(3).describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
  postsPerMonth: z.number().describe("O número de publicações por mês usado no cálculo, para exibição."),
  difficultyScore: z.enum(['Fácil', 'Realista', 'Difícil']).describe("Classificação do quão realista é atingir a meta com os dados fornecidos."),
  riskPanel: z.array(z.string()).describe("Lista com 2-3 riscos e pontos fracos que podem atrasar a meta."),
  recommendations: z.array(z.string()).describe("Lista de 2-3 recomendações acionáveis para alcançar a meta mais rápido."),
  benchmarkComparison: z.string().describe("Uma breve análise de como o usuário se compara ao mercado do nicho em termos de crescimento."),
  accelerationScenarios: z.object({
      maintain: z.number(),
      plus20: z.number(),
      plus40: z.number(),
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

async function calculateGrowthAI(input: FormSchemaType): Promise<GrowthCalculatorOutput> {
   const systemPrompt = `Você é o GrowthAI Engine v3.0, um sistema avançado de análise e projeção para criadores de conteúdo. Sua identidade é a de um consultor profissional, matemático e estrategista digital. Sua única função é analisar os dados de um usuário e retornar uma projeção de crescimento completa. Lembre-se: A data de referência para projeções é Dezembro de 2025.
   LEMBRE-SE: Sua única saída DEVE ser um objeto JSON VÁLIDO que se conforma estritamente ao schema e contém TODOS os campos definidos. Não omita nenhum campo.`;

  const userPrompt = `
    Analise os seguintes dados do usuário e gere a projeção de crescimento completa, seguindo as diretrizes para cada campo.

    **Dados do Usuário:**
    - Nicho: ${input.niche}
    - Seguidores Atuais: ${input.followers}
    - Meta de Seguidores: ${input.goal}
    - Média de Publicações por Mês: ${input.postsPerMonth}

    **Diretrizes para o JSON de Saída:**
    - months: Calcule o número de meses para atingir a meta, assumindo uma taxa de crescimento realista para o nicho (ex: Finanças/Tecnologia 10-18%/mês, Fitness/Beleza 6-12%/mês, Humor/Vlogs 3-7%/mês). A curva de crescimento em 'growthData' deve parar quando a meta for atingida.
    - goalDate: Projete a data final (formato ISO 8601) a partir de 2025-12-01, com base nos 'months' calculados.
    - currentEarnings & goalEarnings: Estime uma faixa de ganhos [min, max] com base no CPM do nicho (ex: Finanças R$60-150, Entretenimento R$15-40), alcance orgânico (20-50% dos seguidores) e 4-8 publis/mês.
    - growthData: Gere um array de {month, followers} para a curva de crescimento.
    - trendSuggestions: Crie 3 ideias de ganchos virais para o nicho, cada um com {hook, icon}.
    - postsPerMonth: Retorne o valor de entrada.
    - difficultyScore: Classifique a dificuldade ('Fácil', 'Realista', 'Difícil') com base na taxa de crescimento necessária e no volume de posts.
    - riskPanel: Liste 2-3 riscos que podem atrasar a meta (ex: 'baixa frequência', 'nicho competitivo').
    - recommendations: Dê 2-3 recomendações acionáveis para acelerar (ex: 'aumentar volume de posts', 'fazer collabs').
    - benchmarkComparison: Faça uma breve análise comparando a projeção com a média do nicho.
    - accelerationScenarios: Calcule os meses para atingir a meta em cenários de aceleração: {maintain: months, plus20: ceil(months / 1.20), plus40: ceil(months / 1.40)}.
  `;


  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('A IA não retornou nenhum conteúdo.');

    const parsedJson = JSON.parse(content);
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
