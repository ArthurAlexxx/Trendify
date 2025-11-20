'use server';

import OpenAI from 'openai';
import { z } from 'zod';

// Esquema de saída esperado da IA
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

// Esquema de entrada do formulário
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateVideoIdeas(
  input: z.infer<typeof formSchema>
): Promise<GenerateVideoIdeasOutput> {
  const systemPrompt = `You are a world-class AI content strategist for social media creators, specializing in viral video concepts for TikTok and Instagram.
Your task is to generate a complete video idea based on the user's requirements.
The response must be creative, strategic, and ready to be executed.
You must respond in a valid JSON object that conforms to the provided schema. Do not include any extra text or formatting outside of the JSON object.`;

  const userPrompt = `
  User Requirements:
  - Topic: ${input.topic}
  - Target Audience: ${input.targetAudience}
  - Platform: ${input.platform}
  - Video Format: ${input.videoFormat}
  - Tone of Voice: ${input.tone}
  - Main Objective: ${input.objective}

  Output Structure (provide a JSON object with these exact keys):
  - gancho: A short, powerful, and attention-grabbing hook (2-3 seconds max) designed to stop the scroll immediately.
  - script: A detailed, clear, and concise script for the video, including visual cues and spoken lines.
  - cta: A clear and effective call to action that aligns with the video's objective.
  - takes: A simple, actionable list of shots/takes to record, making content creation fast and easy.
  - suggestedPostTime: The optimal time to post the video on the specified platform for maximum impact.
  - trendingSong: A currently trending song on the specified platform that perfectly matches the video's vibe and format. Ensure the song is genuinely popular right now.
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
    return GenerateVideoIdeasOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to generate video ideas from AI.');
  }
}

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
