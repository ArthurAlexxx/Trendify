
'use server';

import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Note: This file is not actively used while the Genkit-dependent features are disabled.
// It is kept for future re-enablement.

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { genkit as ai };
