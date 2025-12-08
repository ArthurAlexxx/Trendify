
'use server';

import { callOpenAI } from '@/lib/openai-client';
import { z } from 'zod';

const ScriptSchema = z.object({
  gancho: z.string().describe('Um gancho de 2-3 segundos, otimizado para parar a rolagem e gerar curiosidade imediata.'),
  script: z.string().describe('Um roteiro detalhado e conciso, com indicações de cena e narração, estruturado para reter a atenção.'),
  cta: z.string().describe('Uma chamada para ação clara, convincente e alinhada ao objetivo do vídeo.'),
});

const TrendVariationSchema = z.object({
  variacao: z.string().describe("A descrição da variação da ideia adaptada para uma tendência."),
});

const CreativeAngleSchema = z.string();

const BrandToneAdaptationSchema = z.object({
  titulo: z.string().describe("O tom de voz da adaptação (ex: 'Tom Corporativo', 'Tom Jovem')."),
  texto: z.string().describe("O texto do CTA adaptado para aquele tom de voz."),
});

const ConversionProjectionSchema = z.object({
    roteiro: z.string().describe("O título ou número do roteiro com maior potencial."),
    justificativa: z.string().describe("A explicação concisa do porquê este roteiro tem maior potencial."),
});


const GeneratePubliProposalsOutputSchema = z.object({
  scripts: z.array(ScriptSchema).length(5).describe('Uma lista de 5 ideias de roteiros de vídeo prontos para gravar.'),
  trendVariations: z.array(TrendVariationSchema).min(2).max(3).describe('Uma lista de 2 a 3 variações das ideias de roteiro, adaptadas para tendências.'),
  conversionChecklist: z.array(z.string()).min(4).max(5).describe('Um checklist com 4 a 5 pontos essenciais para garantir a conversão do vídeo.'),
  creativeAngles: z.array(CreativeAngleSchema).describe("Uma lista de ângulos criativos profissionais para a campanha."),
  brandToneAdaptations: z.array(BrandToneAdaptationSchema).describe("Adaptações de tom de voz para a campanha."),
  conversionProjection: ConversionProjectionSchema.describe("Indicação de qual roteiro tem maior potencial de vendas e por quê."),
});


export type GeneratePubliProposalsOutput = z.infer<
  typeof GeneratePubliProposalsOutputSchema
>;

const formSchema = z.object({
  product: z.string().min(3, 'O nome do produto/marca deve ter pelo menos 3 caracteres.'),
  targetAudience: z.string().min(10, 'O público-alvo deve ter pelo menos 10 caracteres.'),
  differentiators: z.string().min(10, 'Os diferenciais devem ter pelo menos 10 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
  extraInfo: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;


type PubliProposalsState = {
  data?: GeneratePubliProposalsOutput;
  error?: string;
} | null;

const systemPrompt = `Você é uma "AI Creative Director", especialista em criar campanhas de conteúdo para redes sociais que convertem.
Sua tarefa é gerar um pacote de conteúdo completo para um criador de conteúdo promover um produto ou marca.
Lembre-se, a data atual é dezembro de 2025.
Você DEVE responder com um objeto JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema Zod fornecido.

Gere um pacote de conteúdo para uma publicidade ("publi") com base nos seguintes requisitos:

  - Produto/Marca: {{product}}
  - Público-alvo: {{targetAudience}}
  - Diferenciais: {{differentiators}}
  - Objetivo: {{objective}}
  - Infos Adicionais: {{#if extraInfo}}{{extraInfo}}{{else}}Nenhuma{{/if}}

  Para cada campo do JSON, siga estas diretrizes:
  - scripts: Crie 5 roteiros de vídeo distintos (com gancho, script, cta), cada um com um ângulo diferente (tutorial, POV, unboxing, etc.).
  - trendVariations: Crie 2-3 sugestões de como adaptar uma das ideias para uma trend de áudio ou vídeo em alta no Instagram/TikTok. Cada item deve ser um objeto com a chave "variacao".
  - conversionChecklist: Crie um checklist com 4-5 itens para maximizar a conversão, focado no objetivo. Ex: 'Mostrar prova social' para Vendas, ou 'Gancho curioso sobre a marca' para Reconhecimento.
  - creativeAngles: Liste alguns ângulos criativos profissionais (ex: "Focar na sustentabilidade do produto", "Criar uma narrativa de superação com a marca").
  - brandToneAdaptations: Crie 3 adaptações do CTA principal em um array. Cada item deve ser um objeto com "titulo" (ex: "Tom Corporativo") e "texto" (o CTA adaptado).
  - conversionProjection: Crie um objeto com "roteiro" (o nome do roteiro, ex: "Roteiro 3: Unboxing") e "justificativa" (a explicação do porquê ele tem maior potencial de conversão).
  `;


async function generatePubliProposals(
  input: z.infer<typeof formSchema>
): Promise<GeneratePubliProposalsOutput> {
  const result = await callOpenAI<GeneratePubliProposalsOutput>({
    prompt: systemPrompt,
    jsonSchema: GeneratePubliProposalsOutputSchema,
    promptData: input,
  });
  return result;
}

export async function generatePubliProposalsAction(
  prevState: PubliProposalsState,
  formData: FormSchemaType
): Promise<PubliProposalsState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Input inválido.' };
  }
  
  try {
    const result = await generatePubliProposals(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar propostas: ${errorMessage}` };
  }
}
