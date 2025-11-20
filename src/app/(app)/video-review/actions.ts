'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const VideoReviewOutputSchema = z.object({
  score: z.number().describe('An overall score for the video (0-100).'),
  hookSuggestions: z.array(z.string()).describe('Suggestions for improving the video hook.'),
  pacingSuggestions: z.string().describe('Suggestions for pacing adjustments.'),
  caption: z.string().describe('An optimized caption for the video.'),
  scriptVariations: z.array(z.string()).describe('Optimized script variations for the video.'),
});
export type VideoReviewOutput = z.infer<typeof VideoReviewOutputSchema>;


const formSchema = z.object({
  videoLink: z.string().url('Please enter a valid video URL.'),
});

type VideoReviewState = {
  data?: VideoReviewOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getVideoReview(input: z.infer<typeof formSchema>): Promise<VideoReviewOutput> {
  // NOTE: In a real-world scenario, you would need a service to download and
  // analyze the video content from the link. For this example, we'll simulate
  // the analysis based on the link alone, as GPT-4o cannot directly access URLs yet.
  // We'll ask the AI to act as if it has watched the video.
  const systemPrompt = `You are an AI video review expert. You are analyzing a video that a user has provided via a link.
  While you cannot access the link directly, your task is to generate a comprehensive and realistic review as if you had watched it.
  Base your analysis on common best practices for viral videos on platforms like TikTok and Instagram.
  The user is looking for concrete feedback to improve their content.
  You must respond in a valid JSON object that conforms to the provided schema. Do not include any extra text or formatting outside of the JSON object.`;
  
  const userPrompt = `
  I've uploaded a video for review. Here's the link: ${input.videoLink}

  Please provide a detailed analysis based on the following criteria. Be creative and specific in your suggestions, as if you have seen the video.
  - Overall score (0-100): Give a score based on its potential for virality.
  - Hook suggestions: Provide 3 distinct, improved hooks to grab attention in the first 2 seconds.
  - Pacing suggestions: Comment on the video's rhythm, cuts, and energy.
  - Optimized caption: Write a new, engaging caption with relevant hashtags.
  - Script variations: Offer 2 alternative script ideas that could improve the video's message or delivery.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const parsedJson = JSON.parse(content);
    return VideoReviewOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    // Add a user-friendly message about the limitation.
    throw new Error('Failed to generate AI review. Note: The AI generates a simulated review based on best practices, as it cannot access external video links directly.');
  }
}


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
