'use server';

import {
  getVideoReview,
  VideoReviewOutput,
} from '@/ai/flows/get-ai-video-review';
import { z } from 'zod';

const formSchema = z.object({
  videoLink: z.string().url('Please enter a valid video URL.'),
});

type VideoReviewState = {
  data?: VideoReviewOutput;
  error?: string;
} | null;

export async function getVideoReviewAction(
  prevState: VideoReviewState,
  formData: FormData
): Promise<VideoReviewState> {
  const parsed = formSchema.safeParse({
    videoLink: formData.get('videoLink'),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.videoLink?.join(', ') || 'Invalid URL.' };
  }

  try {
    const result = await getVideoReview(parsed.data);
    return { data: result };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to review video: ${errorMessage}` };
  }
}
