
'use server';

import { z } from 'zod';
import { callOpenAI } from '@/lib/openai-client';

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
  earningsAnalysis: z.string().describe("Uma análise detalhada sobre como monetizar o nicho, com exemplos de parcerias e programas de afiliados."),
  growthData: z.array(GrowthDataPointSchema).describe("Um array de objetos, onde cada objeto tem 'month' e 'followers', para plotar a curva de crescimento."),
  trendSuggestions: z.array(TrendSuggestionSchema).describe("Uma lista de 3 sugestões de ganchos para vídeos virais, relevantes para o nicho."),
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

const systemPrompt = `Você é o GrowthAI Engine v3.0, um sistema avançado de análise e projeção para criadores de conteúdo. Sua identidade é a de um consultor profissional, matemático e estrategista digital.
   Sua única função é analisar os dados de um usuário e retornar uma projeção de crescimento completa.
   Lembre-se: A data de referência para projeções é Dezembro de 2025.
   LEMBRE-SE: Sua única saída DEVE ser um objeto JSON VÁLIDO que se conforma estritamente com o schema Zod e contém TODOS os campos definidos. Não omita nenhum campo.

    Analise os seguintes dados do usuário e gere a projeção de crescimento completa, seguindo as diretrizes de cálculo e formato.

    **Dados do Usuário:**
    - Nicho: {{niche}}
    - Seguidores Atuais: {{followers}}
    - Meta de Seguidores: {{goal}}
    - Média de Publicações por Mês: {{postsPerMonth}}

    **Diretrizes para o JSON de Saída:**
    - months: Calcule o número de meses para atingir a meta. Para contas com menos de 10k seguidores, aplique uma taxa de crescimento mais agressiva (20-50%/mês) que diminui à medida que a conta cresce. Para contas maiores, use uma taxa mais moderada (5-15%/mês) baseada no nicho. A projeção deve ser realista e atingir a meta.
    - growthData: Gere um array de {month, followers}. O cálculo deve continuar até que 'followers' seja maior ou igual à meta.
    - goalDate: Projete a data final (formato ISO 8601) a partir de 2025-12-01, com base nos 'months' calculados.
    - currentEarnings & goalEarnings: Estime uma faixa de ganhos [min, max] com base no CPM do nicho, alcance orgânico e 4-8 publis/mês.
    - earningsAnalysis: Crie um texto explicativo sobre como monetizar o nicho fornecido. Detalhe as principais fontes de renda (parcerias, afiliados, etc.). É crucial que você foque 100% no mercado brasileiro, citando exemplos de programas de afiliados e marcas que são genuinamente relevantes e atuantes para o nicho específico do usuário no Brasil.
    - trendSuggestions: Crie 3 ideias de ganchos virais para o nicho, cada um com {hook, icon}.
    - postsPerMonth: Retorne o valor de entrada.
    - difficultyScore: Classifique a dificuldade ('Fácil', 'Realista', 'Difícil').
    - riskPanel: Liste 2-3 riscos que podem atrasar a meta.
    - recommendations: Dê 2-3 recomendações acionáveis para acelerar.
    - benchmarkComparison: Faça uma breve análise comparando a projeção com a média do nicho.
    - accelerationScenarios: Calcule os meses para atingir a meta em cenários de aceleração: {maintain: months, plus20: ceil(months / 1.20), plus40: ceil(months / 1.40)}.
  `;


async function calculateGrowthAI(input: FormSchemaType): Promise<GrowthCalculatorOutput> {
  const result = await callOpenAI<typeof GrowthCalculatorOutputSchema>({
    prompt: systemPrompt,
    jsonSchema: GrowthCalculatorOutputSchema,
    promptData: input,
  });
  return result;
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
  } catch (e: any) {
    if (e instanceof z.ZodError) {
        console.error("Zod Validation Error in calculateGrowthAction:", e.format());
        return { error: `A resposta da IA não corresponde ao formato esperado.` };
    }
    const errorMessage = e.message || 'Ocorreu um erro desconhecido.';
    console.error("Error in calculateGrowthAction:", errorMessage);
    return { error: `Falha ao calcular crescimento: ${errorMessage}` };
  }
}
