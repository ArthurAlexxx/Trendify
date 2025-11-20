'use server';

/**
 * @fileOverview AI-powered video idea generator.
 *
 * - generateVideoIdeas - A function that generates trending video ideas with optimized hooks, scripts, and CTAs using AI.
 * - GenerateVideoIdeasInput - The input type for the generateVideoIdeas function.
 * - GenerateVideoIdeasOutput - The return type for the generateVideoIdeas function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateVideoIdeasInputSchema = z.object({
  topic: z.string().describe('The main topic for the video idea.'),
  targetAudience: z.string().describe('The specific target audience for the video.'),
  platform: z
    .enum(['instagram', 'tiktok'])
    .describe('The social media platform for the video.'),
  videoFormat: z.string().describe('The desired format of the video (e.g., Tutorial, Unboxing, Storytelling).'),
  tone: z.string().describe('The desired tone of voice for the video (e.g., Inspirational, Funny, Educational).'),
  objective: z.string().describe('The primary goal of the video (e.g., Engagement, Reach, Sales).'),
});
export type GenerateVideoIdeasInput = z.infer<
  typeof GenerateVideoIdeasInputSchema
>;

const GenerateVideoIdeasOutputSchema = z.object({
  gancho: z.string().describe('The optimized, attention-grabbing hook for the video.'),
  script: z.string().describe('A detailed and concise script for the video.'),
  cta: z.string().describe('A clear and compelling call to action for the video.'),
  takes: z.string().describe('A list of specific shots or takes to record for the video.'),
  suggestedPostTime: z
    .string()
    .describe('The suggested best time to post the video on the given platform.'),
  trendingSong: z
    .string()
    .describe('A trending song that would fit the video well.'),
});
export type GenerateVideoIdeasOutput = z.infer<
  typeof GenerateVideoIdeasOutputSchema
>;

export async function generateVideoIdeas(
  input: GenerateVideoIdeasInput
): Promise<GenerateVideoIdeasOutput> {
  return generateVideoIdeasFlow(input);
}

const generateVideoIdeasPrompt = ai.definePrompt({
  name: 'generateVideoIdeasPrompt',
  input: { schema: GenerateVideoIdeasInputSchema },
  output: { schema: GenerateVideoIdeasOutputSchema },
  prompt: `You are a world-class AI content strategist for social media creators, specializing in viral video concepts for TikTok and Instagram.

  Your task is to generate a complete video idea based on the user's requirements. The response must be creative, strategic, and ready to be executed.

  User Requirements:
  - Topic: {{{topic}}}
  - Target Audience: {{{targetAudience}}}
  - Platform: {{{platform}}}
  - Video Format: {{{videoFormat}}}
  - Tone of Voice: {{{tone}}}
  - Main Objective: {{{objective}}}

  Output Structure (provide a JSON object with these exact keys):
  - gancho: A short, powerful, and attention-grabbing hook (2-3 seconds max) designed to stop the scroll immediately.
  - script: A detailed, clear, and concise script for the video, including visual cues and spoken lines.
  - cta: A clear and effective call to action that aligns with the video's objective.
  - takes: A simple, actionable list of shots/takes to record, making content creation fast and easy.
  - suggestedPostTime: The optimal time to post the video on the specified platform for maximum impact.
  - trendingSong: A currently trending song on the specified platform that perfectly matches the video's vibe and format. Ensure the song is genuinely popular right now.
  `,
});

const generateVideoIdeasFlow = ai.defineFlow(
  {
    name: 'generateVideoIdeasFlow',
    inputSchema: GenerateVideoIdeasInputSchema,
    outputSchema: GenerateVideoIdeasOutputSchema,
  },
  async (input) => {
    const { output } = await generateVideoIdeasPrompt(input);
    return output!;
  }
);
