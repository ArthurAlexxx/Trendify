import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This file configures the Genkit AI services for the application.

// We prioritize using the explicitly provided GOOGLE_AI_API_KEY from the .env file.
// This is the most direct and reliable way to handle authentication for Google AI services.
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A GOOGLE_AI_API_KEY não foi encontrada nas variáveis de ambiente. A análise de vídeo pode falhar.`
  );
}

export const ai = genkit({
  plugins: [
    // Initialize the Google AI plugin with the API key.
    googleAI(apiKey ? { apiKey } : undefined),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
