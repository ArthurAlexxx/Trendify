'use server';

import {
  generateVideoIdeas,
  GenerateVideoIdeasOutput,
} from '@/ai/flows/generate-video-ideas';
import { z } from 'zod';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
  targetAudience: z
    .string()
    .min(3, 'Target audience must be at least 3 characters.'),
  platform: z.enum(['instagram', 'tiktok']),
  videoFormat: z.string().min(1, 'Video format is required.'),
  tone: z.string().min(1, 'Tone of voice is required.'),
  objective: z.string().min(1, 'Objective is required.'),
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
    videoFormat: formData.get('videoFormat'),
    tone: formData.get('tone'),
    objective: formData.get('objective'),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: issues || 'Invalid input.' };
  }

  try {
    const result = await generateVideoIdeas(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate ideas: ${errorMessage}` };
  }
}
