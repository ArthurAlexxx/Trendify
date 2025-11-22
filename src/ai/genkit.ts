
'use server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Note: This file is not actively used while the Genkit-dependent features are disabled.
// It is kept for future re-enablement.

// Correctly initialize the googleAI plugin with service account credentials
// This resolves authentication issues (401 Unauthorized) when calling advanced models.
const googleAICredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

if (!googleAICredentials) {
  console.warn(
    '[Genkit] GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. Genkit may not be able to authenticate with Google AI services.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI(
      googleAICredentials ? { credentials: googleAICredentials } : undefined
    ),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
