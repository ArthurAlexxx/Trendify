
"use server";

import { z } from 'zod';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
  videoDataUrl: z.string().startsWith('data:video/'),
  videoDescription: z.string().optional(),
});

const systemPrompt = `Você é uma consultora sênior especializada em crescimento orgânico, viralização, retenção e performance visual em short-form content (Reels, TikTok, Shorts). 
Sua função é analisar profundamente o vídeo enviado e fornecer uma avaliação técnica, objetiva e prática. 
A data atual é dezembro de 2025.

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
- O conteúdo do vídeo está sendo fornecido diretamente. Analise-o.

Agora gere o JSON final estritamente de acordo com o schema informado.
IMPORTANTE: Sua resposta DEVE ser um objeto JSON válido, e NADA MAIS. Nenhum texto, explicação ou markdown fora do objeto JSON.
`;


/**
 * Server Action to analyze a video provided as a Data URL using Gemini 1.5 Pro.
 */
async function analyzeVideoWithGemini(
  input: z.infer<typeof formSchema>
): Promise<VideoAnalysisOutput> {
  const { videoDataUrl, videoDescription } = input;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('A chave de API do Gemini não está configurada no servidor.');
  }

  // Extract mime type and base64 data from Data URL
  const match = videoDataUrl.match(/^data:(video\/.*?);base64,(.*)$/);
  if (!match) {
    throw new Error('Formato de Data URL do vídeo inválido.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const promptWithData = systemPrompt.replace('{{videoDescription}}', videoDescription || 'N/A');
    
    const requestBody = {
     contents: [
       {
         parts: [
           { text: promptWithData },
           {
             inline_data: {
               mime_type: mimeType,
               data: base64Data,
             },
           },
         ],
       },
     ],
   };

    const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!analysisResponse.ok) {
      const errorBody = await analysisResponse.json();
      console.error('Erro detalhado da API Gemini:', JSON.stringify(errorBody, null, 2));
      throw new Error(`A API Gemini retornou um erro: ${errorBody.error?.message || 'Erro desconhecido'}`);
    }

    const analysisData = await analysisResponse.json();
    
    if (!analysisData.candidates || analysisData.candidates.length === 0) {
        console.error('Resposta inválida do Gemini (sem candidates):', JSON.stringify(analysisData, null, 2));
        if (analysisData.promptFeedback?.blockReason) {
            throw new Error(`A análise foi bloqueada por políticas de segurança: ${analysisData.promptFeedback.blockReason}`);
        }
        throw new Error('A resposta da IA não continha os dados esperados (sem candidates).');
    }

    const responseText = analysisData.candidates[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error('Resposta inválida do Gemini (sem texto no response):', JSON.stringify(analysisData, null, 2));
      throw new Error('A resposta da IA não continha o JSON esperado.');
    }
    
    const parsedJson = JSON.parse(responseText);

    const validation = VideoAnalysisOutputSchema.safeParse(parsedJson);
    if (!validation.success) {
        console.error('Erro Zod:', validation.error.format());
        throw new Error('A resposta da IA não corresponde ao schema esperado.');
    }

    return validation.data;

  } catch (e: any) {
    console.error('Erro detalhado ao analisar o vídeo com Gemini 1.5 Pro:', e);
    throw new Error(`Falha ao analisar o vídeo com Gemini 1.5 Pro: ${e.message}`);
  }
}


export async function analyzeVideo(
  input: { videoDataUrl: string, videoDescription?: string }
): Promise<ActionState> {
  
  const parsed = formSchema.safeParse(input);

  if (!parsed.success) {
    const error = 'URL do vídeo inválida.';
    console.error(error, parsed.error.issues);
    return { error };
  }
  
  try {
    const analysis = await analyzeVideoWithGemini(parsed.data);
    return { data: analysis };
  } catch (e: any) {
    console.error("Falha na execução do fluxo de análise de vídeo com Gemini:", e);
    const errorMessage = e.message || 'Erro desconhecido.';
    
     if (errorMessage.includes('429') || errorMessage.includes('503') || errorMessage.toLowerCase().includes('resource has been exhausted')) {
        return {
            error: 'Estamos com um grande número de requisições no momento. Por favor, aguarde alguns instantes e tente novamente.',
            isOverloaded: true,
        };
    }
    
    return { error: `Ocorreu um erro durante a análise: ${errorMessage}` };
  }
}

    