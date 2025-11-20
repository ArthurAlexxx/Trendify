
'use server';

import { z } from 'zod';

const VideoReviewOutputSchema = z.object({
  score: z.number(),
  hookSuggestions: z.array(z.string()),
  pacingSuggestions: z.string(),
  caption: z.string(),
  scriptVariations: z.array(z.string()),
});

export type VideoReviewOutput = z.infer<typeof VideoReviewOutputSchema>;


const formSchema = z.object({
  videoDataUri: z.string().optional(),
});

type VideoReviewState = {
  data?: VideoReviewOutput;
  error?: string;
} | null;


export async function getVideoReviewAction(
  prevState: VideoReviewState,
  formData: FormData
): Promise<VideoReviewState> {
  // This feature is temporarily disabled.
  return { error: 'Funcionalidade em manutenção. Tente novamente mais tarde.' };
}
