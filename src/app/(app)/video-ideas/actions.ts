'use server';

import {
  generateVideoIdeas,
  GenerateVideoIdeasOutput,
} from '@/ai/flows/generate-video-ideas';
import { z } from 'zod';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
  targetAudience: z.string().min(3, 'Target audience must be at least 3 characters.'),
  platform: z.enum(['instagram', 'tiktok']),
});

type VideoIdeasState = {
  data?: GenerateVideoIdeasOutput;
  error?: string;
} | null;

export async function generateVideoIdeasAction(
  prevState: VideoIdeasState,
  formData: FormData
): Promise<VideoIdeasState> {
  const parsed = formSchema.safeParse({
    topic: formData.get('topic'),
    targetAudience: formData.get('targetAudience'),
    platform: formData.get('platform'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.root?.join(', ')|| 'Invalid input.' };
  }

  try {
    const result = await generateVideoIdeas(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate ideas: ${errorMessage}` };
  }
}
