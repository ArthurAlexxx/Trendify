'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate AI-suggested video scripts and proposal drafts.
 *
 * It takes a brand's product information and generates video scripts with trend integrations,
 * compelling hooks, benefits, and CTAs.
 *
 * @interface AiSuggestedVideoScriptsInput - Input schema for the flow, including product description and brand details.
 * @interface AiSuggestedVideoScriptsOutput - Output schema for the flow, containing generated video script and proposal draft.
 * @function getAiSuggestedVideoScripts - The main function to trigger the flow and generate the content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiSuggestedVideoScriptsInputSchema = z.object({
  productDescription: z.string().describe('Detailed description of the brand\'s product.'),
  brandDetails: z.string().describe('Additional information about the brand, its values, and target audience.'),
  trendingTopic: z.string().optional().describe('Optional trending topic to integrate into the script.'),
});

export type AiSuggestedVideoScriptsInput = z.infer<typeof AiSuggestedVideoScriptsInputSchema>;

const AiSuggestedVideoScriptsOutputSchema = z.object({
  videoScript: z.string().describe('AI-generated video script tailored to the brand and product.'),
  proposalDraft: z.string().describe('AI-generated proposal draft for the brand collaboration.'),
});

export type AiSuggestedVideoScriptsOutput = z.infer<typeof AiSuggestedVideoScriptsOutputSchema>;

export async function getAiSuggestedVideoScripts(input: AiSuggestedVideoScriptsInput): Promise<AiSuggestedVideoScriptsOutput> {
  return getAiSuggestedVideoScriptsFlow(input);
}

const aiSuggestedVideoScriptsPrompt = ai.definePrompt({
  name: 'aiSuggestedVideoScriptsPrompt',
  input: {schema: AiSuggestedVideoScriptsInputSchema},
  output: {schema: AiSuggestedVideoScriptsOutputSchema},
  prompt: `You are an AI assistant specialized in crafting engaging video scripts and proposals for social media creators.

  Based on the following information, generate a compelling video script and a proposal draft.

  Product Description: {{{productDescription}}}
  Brand Details: {{{brandDetails}}}
  Trending Topic (Optional): {{{trendingTopic}}}

  The video script should include a catchy hook, highlight the benefits of the product, and have a clear call to action.
  The proposal draft should outline the key aspects of the collaboration, including content deliverables and potential impact.

  Make sure the script is concise and suitable for platforms like TikTok and Instagram.
  The tone should be engaging, upbeat, and tailored to resonate with the target audience.
  `,
});

const getAiSuggestedVideoScriptsFlow = ai.defineFlow(
  {
    name: 'getAiSuggestedVideoScriptsFlow',
    inputSchema: AiSuggestedVideoScriptsInputSchema,
    outputSchema: AiSuggestedVideoScriptsOutputSchema,
  },
  async input => {
    const {output} = await aiSuggestedVideoScriptsPrompt(input);
    return output!;
  }
);
