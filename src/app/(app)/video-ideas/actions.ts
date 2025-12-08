
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const NicheCompetitorSchema = z.object({
  videoTitle: z.string().describe("O título do vídeo viral de um concorrente."),
  learning: z.string().describe("O que se pode aprender com o sucesso desse vídeo."),
});

const ScriptSchema = z.object({
  gancho: z.string().describe('Um gancho de 2-3 segundos, otimizado para parar a rolagem e gerar curiosidade imediata.'),
  scriptLongo: z.string().describe('Um roteiro detalhado para um vídeo de 45-60 segundos, com indicações de cena e narração.'),
  scriptCurto: z.string().describe('Uma versão resumida do roteiro para um vídeo de 15-25 segundos.'),
  cta: z.string().describe('Uma chamada para ação clara, convincente e alinhada ao objetivo do vídeo.'),
});

const GenerateVideoIdeasOutputSchema = z.object({
  script: ScriptSchema,
  takesChecklist: z.array(z.string()).describe('Uma lista de cenas ou tomadas específicas para gravar, facilitando a produção do conteúdo.'),
  suggestedPostTime: z.string().describe('O melhor dia e horário sugerido para postar o vídeo, visando máximo alcance.'),
  trendingSong: z.string().describe('Uma música atualmente em alta que se encaixe perfeitamente no estilo do vídeo.'),
  viralScore: z.number().min(0).max(100).describe('Uma nota de 0 a 100 para o potencial de viralização da ideia.'),
  platformAdaptations: z.object({
    tiktok: z.string().optional().describe('Dica para adaptar o conteúdo especificamente para o TikTok.'),
    reels: z.string().optional().describe('Dica para adaptar o conteúdo especificamente para o Instagram Reels.'),
    shorts: z.string().optional().describe('Dica para adaptar o conteúdo especificamente para o YouTube Shorts.'),
  }).optional(),
  nicheCompetitors: z.array(NicheCompetitorSchema).length(3).describe("Uma lista de 3 vídeos virais de concorrentes do nicho e o que aprender com cada um."),
});


export type GenerateVideoIdeasOutput = z.infer<
  typeof GenerateVideoIdeasOutputSchema
>;

const formSchema = z.object({
  topic: z.string().min(3, 'O tópico deve ter pelo menos 3 caracteres.'),
  targetAudience: z
    .string()
    .min(3, 'O público-alvo deve ter pelo menos 3 caracteres.'),
  objective: z.string().min(1, 'O objetivo é obrigatório.'),
});

type FormSchemaType = z.infer<typeof formSchema>;


type VideoIdeasState = {
  data?: GenerateVideoIdeasOutput;
  error?: string;
} | null;


const prompt = ai.definePrompt({
    name: 'generateVideoIdeasPrompt',
    model: 'openai/gpt-4o',
    output: { schema: GenerateVideoIdeasOutputSchema },
    prompt: `Você é um "Especialista em Conteúdo Viral", um estrategista de roteiros para criadores no Instagram e TikTok. Sua função é atuar como um profissional de alto nível.
  Sua tarefa é gerar uma ideia de vídeo completa, criativa, estratégica e pronta para ser executada.
  Lembre-se, a data atual é dezembro de 2025.
  Você DEVE responder com um objeto JSON válido, e NADA MAIS. O JSON deve se conformar estritamente ao schema fornecido.

  Gere uma ideia de vídeo completa e profissional com base nos seguintes requisitos:

  - Tópico: {{topic}}
  - Público-alvo: {{targetAudience}}
  - Objetivo Principal: {{objective}}
  
  Para cada campo do JSON, siga estas diretrizes:
  - script.gancho: Crie uma frase ou cena de 2-3 segundos que gere curiosidade ou quebre uma crença. Seja contraintuitivo.
  - script.scriptLongo: Escreva um roteiro detalhado para um vídeo de 45-60 segundos. Estruture em: Introdução (gancho), Desenvolvimento (entrega de valor) e Conclusão (CTA). Inclua sugestões de cenas entre colchetes. Ex: "[CENA: Close-up no produto] Você erra a ordem. A regra é: do mais leve ao mais denso...".
  - script.scriptCurto: Crie uma versão de 15-25 segundos do roteiro principal, focada no gancho e no ponto principal.
  - script.cta: A chamada para ação deve ser direta e alinhada ao objetivo. Se o objetivo for 'Vendas', use "Comente 'EU QUERO' para receber o link". Se for 'Engajamento', "Qual sua opinião? Comente aqui!".
  - takesChecklist: Liste 3 a 4 tomadas práticas que o criador precisa gravar. Ex: ["Take do seu rosto falando.", "Take de unboxing.", "Take mostrando resultado."].
  - suggestedPostTime: Sugira um dia e horário de pico para postagem (ex: "Sexta-feira, 18:30h").
  - trendingSong: Sugira uma música em alta no Instagram/TikTok que combine com a vibe do vídeo, incluindo o nome do artista.
  - viralScore: Dê uma nota de 0 a 100 para o potencial de viralização, baseada na força do gancho, relevância do tema e adaptabilidade.
  - platformAdaptations: Dê uma dica para adaptar o conteúdo para TikTok, uma para Reels e uma para Shorts, focando nas particularidades de cada plataforma.
  - nicheCompetitors: Liste 3 vídeos virais reais de concorrentes no mesmo nicho. Para cada um, informe o 'videoTitle' (título do vídeo) e um 'learning' (aprendizado chave - o que o tornou viral).
  `,
    config: {
        temperature: 0.8,
    },
});

async function generateVideoIdeas(
  input: z.infer<typeof formSchema>
): Promise<GenerateVideoIdeasOutput> {
  const { output } = await prompt(input);
  if (!output) {
    throw new Error('A IA não retornou nenhum conteúdo.');
  }
  return output;
}

export async function generateVideoIdeasAction(
  prevState: VideoIdeasState,
  formData: FormSchemaType,
): Promise<VideoIdeasState> {
  const parsed = formSchema.safeParse(formData);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Input inválido.' };
  }

  try {
    const result = await generateVideoIdeas(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
    return { error: `Falha ao gerar ideias: ${errorMessage}` };
  }
}
