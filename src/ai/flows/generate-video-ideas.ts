'use server';

/**
 * @fileOverview AI-powered video idea generator.
 *
 * - generateVideoIdeas - A function that generates trending video ideas with optimized hooks, scripts, and CTAs using AI.
 * - GenerateVideoIdeasInput - The input type for the generateVideoIdeas function.
 * - GenerateVideoIdeasOutput - The return type for the generateVideoIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVideoIdeasInputSchema = z.object({
  topic: z.string().describe('The topic for the video idea.'),
  targetAudience: z.string().describe('The target audience for the video.'),
  platform: z.enum(['instagram', 'tiktok']).describe('The platform for the video.'),
});
export type GenerateVideoIdeasInput = z.infer<typeof GenerateVideoIdeasInputSchema>;

const GenerateVideoIdeasOutputSchema = z.object({
  gancho: z.string().describe('The optimized hook for the video.'),
  script: z.string().describe('The script for the video.'),
  cta: z.string().describe('The call to action for the video.'),
  takes: z.string().describe('A list of takes to record for the video.'),
  suggestedPostTime: z.string().describe('Suggested time of posting the video.'),
  trendingSong: z.string().describe('Trending song to go along with the video.'),
});
export type GenerateVideoIdeasOutput = z.infer<typeof GenerateVideoIdeasOutputSchema>;

export async function generateVideoIdeas(input: GenerateVideoIdeasInput): Promise<GenerateVideoIdeasOutput> {
  return generateVideoIdeasFlow(input);
}

const generateVideoIdeasPrompt = ai.definePrompt({
  name: 'generateVideoIdeasPrompt',
  input: {schema: GenerateVideoIdeasInputSchema},
  output: {schema: GenerateVideoIdeasOutputSchema},
  prompt: `You are an AI video idea generator that specializes in creating trending video ideas.

  Generate a video idea with an optimized hook, script, and CTA for the given topic, target audience, and platform.

  Topic: {{{topic}}}
  Target Audience: {{{targetAudience}}}
  Platform: {{{platform}}}

  Here's the structure of the output:
  - Gancho: A short, attention-grabbing hook for the video.
  - Script: A detailed script for the video.
  - CTA: A clear call to action for the video.
  - Takes: A list of takes to record for the video.
  - Suggested Post Time: The best time to post the video on the given platform.
  - Trending Song: A trending song that fits the video.

  Make sure the gancho is attention grabbing and short, to capture user attention.
  Make sure the script is detailed, clear and concise.
  Make sure the CTA encourages the user to take an action.
  Make sure the takes are easy to follow, to allow for quick content generation.
  Make sure the suggested post time is optimized for the given platform.
  Make sure the trending song is actually trending on the given platform.
  `,
});

const generateVideoIdeasFlow = ai.defineFlow(
  {
    name: 'generateVideoIdeasFlow',
    inputSchema: GenerateVideoIdeasInputSchema,
    outputSchema: GenerateVideoIdeasOutputSchema,
  },
  async input => {
    const {output} = await generateVideoIdeasPrompt(input);
    return output!;
  }
);
