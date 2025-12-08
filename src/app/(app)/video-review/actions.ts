
'use server';

import { callOpenAI } from '@/lib/openai-client';
import { z } from 'zod';

const VideoAnalysisOutputSchema = z.object({
  geral: z.string().describe('Uma nota geral de 0 a 10 para o potencial de viralização do vídeo, sempre acompanhada de uma justificativa concisa.'),
  gancho: z.string().describe('Análise dos primeiros 3 segundos do vídeo. Dê uma nota de 0 a 10 para o gancho e justifique, avaliando se é forte, gera curiosidade e retém a atenção.'),
  conteudo: z.string().describe('Análise do desenvolvimento, ritmo e entrega de valor do vídeo. Aponte pontos que podem estar causando perda de retenção.'),
  cta: z.string().describe('Avaliação da chamada para ação (call to action), verificando se é clara, convincente e alinhada ao objetivo do vídeo.'),
  melhorias: z.array(z.string()).length(3).describe('Uma lista de 3 dicas práticas e acionáveis, em formato de checklist, para o criador melhorar o vídeo.'),
  estimatedHeatmap: z.string().describe("Uma análise textual de onde a retenção do público provavelmente cai, com base no ritmo e estrutura do vídeo. Ex: 'A retenção provavelmente cai entre 8s-12s devido à explicação muito longa.'"),
  comparativeAnalysis: z.string().describe("Uma breve comparação do vídeo analisado com padrões de sucesso do nicho. Ex: 'Comparado a outros vídeos de receita, o seu tem uma ótima fotografia, mas o ritmo é 20% mais lento.'"),
});


export type VideoAnalysisOutput = z.infer<typeof VideoAnalysisOutputSchema>;

type ActionState = {
  data?: VideoAnalysisOutput;
  error?: string;
  isOverloaded?: boolean;
} | null;


const formSchema = z.object({
  videoUrl: z.string().url(),
  videoDescription: z.string().optional(),
});

const systemPrompt = `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts). 
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática. 
A data atual é dezembro de 2025.

⚠️ SUA RESPOSTA DEVE SER:
- EXCLUSIVAMENTE um objeto JSON válido
- estritamente compatível com o schema Zod fornecido
- sem comentários, explicações ou texto fora do JSON
- sem quebras de estrutura ou campos extras

-----------------------------------------------------
INSTRUÇÕES AVANÇADAS DE ANÁLISE
-----------------------------------------------------

🔍 **1. Avaliação Geral (campo: geral)**
- Dê uma nota realista de 0 a 10 baseada em: retenção esperada, clareza, energia, ritmo, formato, nicho, tendência atual e fator “shareability”.
- A justificativa deve citar pelo menos **um elemento técnico** (ritmo, hook strength, pacing, valor percebido, trend fit, storytelling, edição, texto em tela, áudio).

⚡ **2. Gancho (campo: gancho)**
Analise somente os primeiros 3 segundos do vídeo considerando:
- força do padrão quebrado
- curiosidade gerada
- intensidade visual
- clareza imediata do tema
- competitividade com o feed atual (2025)
- velocidade para entregar contexto
Justifique sempre com base em elementos visuais e de ritmo.

🎞️ **3. Conteúdo (campo: conteudo)**
Avalie profundamente:
- estrutura narrativa
- cadência (pacing)
- densidade de valor
- momentos de queda de interesse
- transições fracas
- redundâncias
- excesso de explicação
- falta de payoff visual
Sempre cite **pelo menos um ponto específico** que pode reduzir retenção.

📢 **4. CTA (campo: cta)**
Avalie se:
- aparece no momento ideal
- é coerente com o objetivo do vídeo
- é natural e não parece “forçada”
- usa linguagem de 2025
- tem clareza e direcionamento
- passa sensação de valor, não pedido

🛠️ **5. Melhorias (campo: melhorias)**
Retorne EXATAMENTE 3 itens.
Cada item deve:
- ser curto
- iniciar com “✓”
- ser 100% praticável
- estar focado em performance (retenção, clareza, narrativa, edição, enquadramento, copy)

🔥 **6. EstimatedHeatmap (campo: estimatedHeatmap)**
Estime quedas de retenção com base em:
- momentos mortos
- pausas longas
- falta de movimento
- drop de payoff
- edição lenta
- excessos de fala
Indique intervalos aproximados (ex.: “entre 5–7s”), sempre com justificativa objetiva.

📊 **7. ComparativeAnalysis (campo: comparativeAnalysis)**
Compare o vídeo com padrões de sucesso do nicho:
- velocidade média
- densidade de valor
- estética
- nível de energia
- clareza de storytelling
- conformidade com tendências de 2025
Inclua **uma vantagem** e **uma desvantagem**.

-----------------------------------------------------
🎬 Dados do Vídeo
- Descrição: {{videoDescription}}
- URL: {{videoUrl}}

Agora gere o JSON final obedecendo rigorosamente o schema informado.
Nada fora do JSON é permitido.`;



/**
 * Server Action to analyze a video provided as a URL.
 */
export async function analyzeVideo(
  input: { videoUrl: string, videoDescription?: string }
): Promise<ActionState> {
  
  const parsed = formSchema.safeParse(input);

  if (!parsed.success) {
    const error = 'URL do vídeo inválida.';
    console.error(error, parsed.error.issues);
    return { error };
  }
  
  const { videoUrl, videoDescription } = parsed.data;

  try {
    const analysis = await callOpenAI({
        prompt: systemPrompt,
        jsonSchema: VideoAnalysisOutputSchema,
        promptData: { videoUrl: videoUrl, videoDescription: videoDescription || 'N/A' },
    });
    return { data: analysis };

  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise de vídeo:", e);

    const errorMessage = e.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded') || errorMessage.toLowerCase().includes('resource has been exhausted')) {
        return {
            error: 'Estamos com um grande número de requisições no momento. Por favor, aguarde alguns instantes e tente novamente.',
            isOverloaded: true,
        };
    }
    
    const friendlyErrorMessage = errorMessage.includes('fetch') 
      ? `Não foi possível acessar o vídeo para análise. Verifique se a URL está correta e publicamente acessível. Detalhe: ${errorMessage}`
      : `Ocorreu um erro durante a análise: ${errorMessage || "Erro desconhecido."}`;

    return { error: friendlyErrorMessage };
  }
}
