'use server';
/**
 * @fileOverview AI-powered video review flow.
 *
 * - getVideoReview - A function that analyzes a video and provides improvement suggestions.
 * - VideoReviewInput - The input type for the getVideoReview function.
 * - VideoReviewOutput - The return type for the getVideoReview function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VideoReviewInputSchema = z.object({
  videoLink: z.string().url().describe('The link to the video to be reviewed.'),
});
export type VideoReviewInput = z.infer<typeof VideoReviewInputSchema>;

const VideoReviewOutputSchema = z.object({
  score: z.number().describe('An overall score for the video (0-100).'),
  hookSuggestions: z.array(z.string()).describe('Suggestions for improving the video hook.'),
  pacingSuggestions: z.string().describe('Suggestions for pacing adjustments.'),
  caption: z.string().describe('An optimized caption for the video.'),
  scriptVariations: z.array(z.string()).describe('Optimized script variations for the video.'),
});
export type VideoReviewOutput = z.infer<typeof VideoReviewOutputSchema>;

export async function getVideoReview(input: VideoReviewInput): Promise<VideoReviewOutput> {
  return videoReviewFlow(input);
}

const summarizeVideoTool = ai.defineTool({
    name: 'summarizeVideo',
    description: 'Summarizes the content of a video from a given link.',
    inputSchema: z.object({
      videoLink: z.string().url().describe('The link to the video to be summarized.')
    }),
    outputSchema: z.string()
  },
  async (input) => {
    // Placeholder implementation for video summarization.
    //In this example the function returns a placeholder value for video summary.
    //In a real implementation, this function would call an external service or API
    return `Summary of video at ${input.videoLink}`;
  }
);

const videoReviewPrompt = ai.definePrompt({
  name: 'videoReviewPrompt',
  input: {schema: VideoReviewInputSchema},
  output: {schema: VideoReviewOutputSchema},
  tools: [summarizeVideoTool],
  prompt: `You are an AI video review expert.

  Analyze the video based on the following summary: {{{await summarizeVideoTool videoLink=videoLink}}}

  Provide the video review based on the following criteria:
  - Overall score (0-100)
  - Hook suggestions
  - Pacing adjustments
  - Optimized caption
  - Optimized script variations

  Here's the video link: {{{videoLink}}}.

  Respond in a JSON format.
  `,
});

const videoReviewFlow = ai.defineFlow(
  {
    name: 'videoReviewFlow',
    inputSchema: VideoReviewInputSchema,
    outputSchema: VideoReviewOutputSchema,
  },
  async input => {
    const {output} = await videoReviewPrompt(input);
    return output!;
  }
);
