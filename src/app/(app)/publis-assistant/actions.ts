'use server';

import OpenAI from 'openai';
import { z } from 'zod';

const AiSuggestedVideoScriptsOutputSchema = z.object({
  videoScript: z.string().describe('AI-generated video script tailored to the brand and product.'),
  proposalDraft: z.string().describe('AI-generated proposal draft for the brand collaboration.'),
});
export type AiSuggestedVideoScriptsOutput = z.infer<typeof AiSuggestedVideoScriptsOutputSchema>;

const formSchema = z.object({
  productDescription: z.string().min(10, 'Product description is too short.'),
  brandDetails: z.string().min(10, 'Brand details are too short.'),
  trendingTopic: z.string().optional(),
});

type PublisAssistantState = {
  data?: AiSuggestedVideoScriptsOutput;
  error?: string;
} | null;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getAiSuggestedVideoScripts(input: z.infer<typeof formSchema>): Promise<AiSuggestedVideoScriptsOutput> {
  const systemPrompt = `You are an AI assistant specialized in crafting engaging video scripts and proposals for social media creators.
  You must respond in a valid JSON object that conforms to the provided schema. Do not include any extra text or formatting outside of the JSON object.`;
  
  const userPrompt = `
  Based on the following information, generate a compelling video script and a proposal draft.

  Product Description: ${input.productDescription}
  Brand Details: ${input.brandDetails}
  Trending Topic (Optional): ${input.trendingTopic}

  The video script should include a catchy hook, highlight the benefits of the product, and have a clear call to action.
  The proposal draft should outline the key aspects of the collaboration, including content deliverables and potential impact.

  Make sure the script is concise and suitable for platforms like TikTok and Instagram.
  The tone should be engaging, upbeat, and tailored to resonate with the target audience.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content returned from OpenAI.');
    }

    const parsedJson = JSON.parse(content);
    return AiSuggestedVideoScriptsOutputSchema.parse(parsedJson);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Failed to generate AI assets.');
  }
}

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
