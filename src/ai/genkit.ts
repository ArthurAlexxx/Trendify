
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';

const googleApiKey = process.env.GOOGLE_AI_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!googleApiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A GOOGLE_AI_API_KEY não foi encontrada nas variáveis de ambiente. A análise de vídeo pode falhar.`
  );
}

if (!openAiApiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A OPENAI_API_KEY não foi encontrada nas variáveis de ambiente. As gerações de conteúdo podem falhar.`
  );
}


export const ai = genkit({
  plugins: [
    googleAI({ apiKey: googleApiKey || undefined }),
    openAI({ apiKey: openAiApiKey || undefined }),
  ],
});
