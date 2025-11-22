import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Este arquivo configura os serviços Genkit AI para a aplicação.
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A GOOGLE_AI_API_KEY não foi encontrada nas variáveis de ambiente. A análise de vídeo pode falhar.`
  );
}

export const ai = genkit({
  plugins: [
    googleAI(apiKey ? { apiKey, apiVersion: 'v1' } : { apiVersion: 'v1' }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
