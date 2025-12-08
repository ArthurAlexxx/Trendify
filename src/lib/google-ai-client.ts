
'use server';

import { z } from 'zod';
import Handlebars from 'handlebars';

// Registrar o helper 'json' se ainda não estiver registrado
if (!Handlebars.helpers.json) {
    Handlebars.registerHelper('json', function (context) {
        return JSON.stringify(context);
    });
}

// Helper para buscar a URL e converter em base64
async function urlToGenerativePart(url: string, mimeType: string) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${url}`);
    }
    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    return {
        inline_data: {
            mime_type: mimeType,
            data: base64Data,
        },
    };
}

interface CallGoogleAIParams<T extends z.ZodType<any, any, any>> {
    prompt: string;
    jsonSchema: T; // O schema ainda é usado para validação da resposta
    promptData: Record<string, any>;
    videoUrl?: string;
    videoMimeType?: string;
}

export async function callGoogleAI<T extends z.ZodType<any, any, any>>(
    params: CallGoogleAIParams<T>
): Promise<z.infer<T>> {
    const { prompt, jsonSchema, promptData, videoUrl, videoMimeType } = params;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('A chave de API do Gemini não está configurada.');
    }

    // Prepara prompt, agora instruindo diretamente a IA a gerar um JSON
    const template = Handlebars.compile(prompt);
    const processedPrompt = template(promptData) + "\n\nIMPORTANTE: Sua resposta DEVE ser um objeto JSON válido, sem nenhum texto adicional ou markdown.";

    const parts: any[] = [];

    if (videoUrl && videoMimeType) {
        parts.push(await urlToGenerativePart(videoUrl, videoMimeType));
    }

    parts.push({ text: processedPrompt });

    const body = {
        contents: [
            {
                role: 'user',
                parts,
            },
        ],
        generation_config: {
            response_mime_type: 'application/json',
            temperature: 0.7,
        },
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            let err;
            try {
              err = JSON.parse(errText);
            } catch (e) {
              err = { error: { message: errText } };
            }
            console.error('Erro da API:', err);
            throw new Error(
                `A API do Google retornou o erro ${response.status}: ${err.error?.message || 'Erro desconhecido'}`
            );
        }

        const jsonResponse = await response.json();
        const responseText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('Resposta inválida da API:', JSON.stringify(jsonResponse, null, 2));
            throw new Error('A resposta da IA não contém o texto esperado.');
        }

        const parsedJson = JSON.parse(responseText);

        const validation = jsonSchema.safeParse(parsedJson);
        if (!validation.success) {
            console.error('Erro de validação Zod:', validation.error.format());
            throw new Error('A resposta da IA não corresponde ao schema esperado.');
        }

        return validation.data;
    } catch (err) {
        console.error('Falha ao chamar Gemini:', err);
        throw err;
    }
}
