
'use server';
import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({
      // Specify the API version if needed, e.g., 'v1beta'
      // apiVersion: 'v1beta',
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
