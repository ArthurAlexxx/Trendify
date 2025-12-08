'use server';

import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';

const openAiApiKey = process.env.OPENAI_API_KEY;

if (!openAiApiKey && process.env.NODE_ENV === 'production') {
  console.warn(
    `[Genkit] A OPENAI_API_KEY não foi encontrada nas variáveis de ambiente. As gerações de conteúdo podem falhar.`
  );
}

export const ai = genkit({
  plugins: [
    openAI(),
  ],
});
