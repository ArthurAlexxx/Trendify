
'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const CollaborationIdeaSchema = z.object({
  ideia: z
    .string()
    .describe('A ideia de colaboração criativa e de alto nível.'),
});

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
    .array(CollaborationIdeaSchema)
    .describe(
      'Uma lista de 3 ideias de colaboração criativas e de alto nível que se encaixam no nicho do criador e da marca alvo.'
    )
    .transform((ideas) =>
      ideas.map((idea) => idea.ideia)
    ),
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

async function getAiCareerPackage(
  input: z.infer<typeof formSchema>
): Promise<AiCareerPackageOutput> {
  const systemPrompt = `Você é um "AI Talent Manager", um estrategista de negócios especialista em monetização para criadores de conteúdo.
Sua única função é gerar um pacote de prospecção profissional para um criador usar ao abordar marcas.
Lembre-se, a data atual é dezembro de 2025.
Sua resposta DEVE ser um bloco de código JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.`;

  const userPrompt = `
  Gere um pacote de prospecção profissional com base NOS SEGUINTES DADOS. Seja criativo, estratégico e siga as regras com MÁXIMA PRECISÃO.
  Você está estritamente proibido de mencionar, sugerir ou fazer alusão a qualquer tópico, produto ou ideia que não pertença diretamente ao nicho fornecido. O foco é absoluto.

  - Nicho de Atuação do Criador: ${input.niche}
  - Métricas Principais do Criador: ${input.keyMetrics}
  - Marca Alvo para a Proposta: ${input.targetBrand}

  Para cada campo do JSON, siga estas diretrizes:

  - executiveSummary: Crie um texto de apresentação completo e profissional em PRIMEIRA PESSOA. O texto deve ser estruturado e seguir os seguintes pontos:
    1.  **Posicionamento Profissional:** Comece se apresentando como um especialista no nicho de ${input.niche}, destacando seu foco (ex: análises estratégicas, tutoriais, etc.) e a autenticidade que construiu sua comunidade.
    2.  **Descrição do Público:** Descreva sua audiência de forma que ela se alinhe com a marca alvo (${input.targetBrand}). Mencione valores e interesses do público (ex: performance, tecnologia, estilo).
    3.  **Sinergia com a Marca:** Explique por que uma parceria faz sentido, conectando os valores do seu conteúdo (ex: evolução, superação, mentalidade competitiva) com o DNA da marca.
    4.  **Oferta de Parceria:** Crie uma lista (bullet points) do que você oferece como parceiro (ex: "Conteúdos patrocinados de alta retenção", "Ativações temáticas", "Aparições em lives", "Narrativas criativas").
    5.  **Compromisso e Fechamento:** Finalize com um parágrafo de compromisso, reforçando seu objetivo de entregar valor e resultados, e se colocando à disposição para desenvolver ações exclusivas.

  - pricingTiers: Com base nas métricas fornecidas (${input.keyMetrics}), calcule faixas de preço realistas para o mercado brasileiro. É OBRIGATÓRIO que você retorne uma STRING formatada para CADA um dos campos (reels, storySequence, staticPost, monthlyPackage), como "R$ X - R$ Y". Não deixe nenhum campo de preço em branco.

  - sampleCollaborationIdeas: Gere EXATAMENTE 3 ideias de colaboração. Cada ideia DEVE ser:
    1.  100% relacionada e exclusiva ao nicho ${input.niche}.
    2.  Criativa, autêntica e que gere valor real para o público deste nicho.
    3.  Alinhada com os produtos ou o posicionamento da marca alvo ${input.targetBrand}.
    NÃO inclua nenhuma ideia de outros nichos. O foco é absoluto. Para cada ideia, use a chave 'ideia' no JSON.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('A IA não retornou nenhum conteúdo.');
    }

    const jsonString = extractJson(content);
    if (!jsonString) {
      throw new Error('Não foi possível encontrar um bloco JSON válido na resposta da IA.');
    }

    const parsedJson = JSON.parse(jsonString);
    const validatedData = AiCareerPackageOutputSchema.parse(parsedJson);

    return validatedData;
  } catch (error) {
    console.error('Error calling OpenAI or parsing response:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido.';
    throw new Error(
      `Falha ao gerar pacote com a IA: ${errorMessage}`
    );
  }
}

export async function getAiCareerPackageAction(
  prevState: CareerPackageState,
  formData: FormSchemaType
): Promise<CareerPackageState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Input inválido.' };
  }

  try {
    const result = await getAiCareerPackage(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar pacote: ${errorMessage}` };
  }
}
