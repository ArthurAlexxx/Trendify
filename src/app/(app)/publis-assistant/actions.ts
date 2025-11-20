'use server';

import {
  getAiSuggestedVideoScripts,
  AiSuggestedVideoScriptsOutput,
} from '@/ai/flows/get-ai-suggested-video-scripts';
import { z } from 'zod';

const formSchema = z.object({
  productDescription: z.string().min(10, 'Product description is too short.'),
  brandDetails: z.string().min(10, 'Brand details are too short.'),
  trendingTopic: z.string().optional(),
});

type PublisAssistantState = {
  data?: AiSuggestedVideoScriptsOutput;
  error?: string;
} | null;

export async function getAiSuggestedVideoScriptsAction(
  prevState: PublisAssistantState,
  formData: FormData
): Promise<PublisAssistantState> {
  const parsed = formSchema.safeParse({
    productDescription: formData.get('productDescription'),
    brandDetails: formData.get('brandDetails'),
    trendingTopic: formData.get('trendingTopic'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.root?.join(', ') || 'Invalid input.' };
  }

  try {
    const result = await getAiSuggestedVideoScripts(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate assets: ${errorMessage}` };
  }
}
