
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Note: This file is not actively used while the Genkit-dependent features are disabled.
// It is kept for future re-enablement.

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
