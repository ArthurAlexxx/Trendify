
'use server';

// import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AiCareerPackageOutputSchema = z.object({
  executiveSummary: z
    .string()
    .describe(
      'Um texto de apresentação completo e profissional, em primeira pessoa, para abordar uma marca, seguindo uma estrutura detalhada.'
    ),
  pricingTiers: z.object({
    reels: z
      .string()
      .optional()
      .describe(
        "Faixa de preço sugerida para um único vídeo no formato Reels (ex: 'R$ 800 - R$ 1.500')."
      ),
    storySequence: z
      .string()
      .optional()
      .describe(
        "Faixa de preço para uma sequência de 3-5 Stories (ex: 'R$ 500 - R$ 900')."
      ),
    staticPost: z
      .string()
      .optional()
      .describe(
        "Faixa de preço para um post estático no feed (foto única ou carrossel) (ex: 'R$ 600 - R$ 1.200')."
      ),
    monthlyPackage: z
      .string()
      .optional()
      .describe(
        "Faixa de preço para um pacote mensal (ex: 2 Reels, 4 sequências de Stories) (ex: 'R$ 3.000 - R$ 5.500')."
      ),
  }),
  sampleCollaborationIdeas: z
    .array(z.string())
    .length(3)
    .describe(
      'Uma lista de 3 ideias de colaboração criativas e de alto nível que se encaixam no nicho do criador e da marca alvo.'
    ),
    valueProposition: z.string().describe("Uma frase curta e poderosa que resume por que a marca deveria contratar o influenciador."),
    negotiationTips: z.array(z.string()).length(3).describe("Três dicas práticas para o criador negociar melhor com a marca."),
    brandAlignment: z.string().describe("Uma breve análise de como os valores e a estética do criador se conectam com os da marca alvo."),
});

export type AiCareerPackageOutput = z.infer<typeof AiCareerPackageOutputSchema>;

const formSchema = z.object({
  niche: z.string().min(1, 'O nicho não pode estar vazio.'),
  keyMetrics: z.string().min(1, 'As métricas não podem estar vazias.'),
  targetBrand: z
    .string()
    .min(3, 'A marca alvo deve ter pelo menos 3 caracteres.'),
});

type FormSchemaType = z.infer<typeof formSchema>;

type CareerPackageState = {
  data?: AiCareerPackageOutput;
  error?: string;
} | null;
/*
const prompt = ai.definePrompt({
    name: 'aiCareerPackagePrompt',
    model: 'openai/gpt-4o',
    output: { schema: AiCareerPackageOutputSchema },
    prompt: `Você é um "AI Talent Manager", um estrategista de negócios especialista em monetização para criadores de conteúdo.
Sua única função é gerar um pacote de prospecção profissional para um criador usar ao abordar marcas.
Lembre-se, a data atual é dezembro de 2025.
Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.

  Gere um pacote de prospecção profissional com base NOS SEGUINTES DADOS. Seja criativo, estratégico e siga as regras com MÁXIMA PRECISÃO.

  - Nicho de Atuação do Criador: {{niche}}
  - Métricas Principais do Criador: {{keyMetrics}}
  - Marca Alvo para a Proposta: {{targetBrand}}

  Para cada campo do JSON, siga estas diretrizes:

  - executiveSummary: Crie um texto de apresentação completo e profissional em PRIMEIRA PESSOA, dividido em parágrafos. Siga esta estrutura: 1. **Parágrafo de Abertura:** Apresente-se como especialista no nicho e descreva sua comunidade. 2. **Parágrafo de Sinergia:** Explique por que a parceria com a marca alvo faz sentido, conectando seus valores e público. Mencione o que você pode oferecer. 3. **Parágrafo de Fechamento:** Reforce seu compromisso com resultados e finalize com um convite para colaboração. O tom deve ser profissional, mas autêntico.

  - pricingTiers: Com base nas métricas ({{keyMetrics}}), calcule faixas de preço realistas para o mercado brasileiro. É OBRIGATÓRIO que você retorne uma STRING formatada para CADA um dos campos (reels, storySequence, staticPost, monthlyPackage), como "R$ X - R$ Y".

  - sampleCollaborationIdeas: Gere EXATAMENTE 3 ideias de colaboração criativas e de alto nível, alinhadas com a marca alvo ({{targetBrand}}) e o nicho ({{niche}}). Cada ideia deve ser uma string simples no array.

  - valueProposition: Crie uma frase de impacto que resuma por que a marca deveria fechar com você. Ex: "Conecto sua marca a um público engajado que confia na minha curadoria para decisões de compra."

  - negotiationTips: Dê 3 dicas práticas para negociação. Ex: "Comece pedindo 20% acima da sua meta de preço", "Nunca aceite a primeira oferta", "Tenha um pacote de entregas extra para oferecer em troca de um valor maior".

  - brandAlignment: Analise brevemente a sinergia entre o criador e a marca. Ex: "A estética minimalista do seu feed e o foco em qualidade se conectam diretamente com o posicionamento premium da {{targetBrand}}."
  `,
    config: {
        temperature: 0.7,
    },
});


async function getAiCareerPackage(
  input: z.infer<typeof formSchema>
): Promise<AiCareerPackageOutput> {
  const { output } = await prompt(input);
  if (!output) {
    throw new Error('A IA não retornou nenhum conteúdo.');
  }
  return output;
}
*/
export async function getAiCareerPackageAction(
  prevState: CareerPackageState,
  formData: FormSchemaType
): Promise<CareerPackageState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Input inválido.' };
  }
  
  return { error: 'A funcionalidade de IA está temporariamente desativada para manutenção.' };
  /*
  try {
    const result = await getAiCareerPackage(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar pacote: ${errorMessage}` };
  }
  */
}
