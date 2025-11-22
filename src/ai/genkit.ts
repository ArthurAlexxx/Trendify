import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Este arquivo configura os serviços Genkit AI para a aplicação.

// Priorizamos o uso da GOOGLE_AI_API_KEY fornecida explicitamente do arquivo .env.
// Esta é a maneira mais direta e confiável de lidar com a autenticação para os serviços do Google AI.
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A GOOGLE_AI_API_KEY não foi encontrada nas variáveis de ambiente. A análise de vídeo pode falhar.`
  );
}

export const ai = genkit({
  plugins: [
    // Inicializa o plugin do Google AI com a chave de API e força o uso da API v1 estável.
    googleAI(apiKey ? { apiKey, apiVersion: 'v1' } : { apiVersion: 'v1' }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
