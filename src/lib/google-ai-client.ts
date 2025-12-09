
'use server';

import { z } from 'zod';
import Handlebars from 'handlebars';

// Registrar helper JSON
if (!Handlebars.helpers.json) {
    Handlebars.registerHelper('json', function (context) {
        return JSON.stringify(context);
    });
}

// Esta função não é mais usada para análise de vídeo, mas pode ser usada em outros lugares.
// Portanto, a lógica de vídeo foi removida dela.
interface CallGoogleAIParams<T extends z.ZodType<any, any, any>> {
    prompt: string;
    jsonSchema: T;
    promptData: Record<string, any>;
}

export async function callGoogleAI<T extends z.ZodType<any, any, any>>(
    params: CallGoogleAIParams<T>
): Promise<z.infer<T>> {
    const { prompt, jsonSchema, promptData } = params;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('A chave de API do Gemini não está configurada.');
    }

    const template = Handlebars.compile(prompt);
    const processedPrompt =
        template(promptData) +
        "\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown, no explanations.";

    const body = {
        contents: [
            {
                role: 'user',
                parts: [{ text: processedPrompt }],
            },
        ],
        generation_config: {
            response_mime_type: 'application/json',
            temperature: 0.5,
        },
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
                `Erro ${response.status}: ${err.error?.message || 'Erro desconhecido'}`
            );
        }

        const jsonResponse = await response.json();
        const responseText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('Resposta inválida:', jsonResponse);
            throw new Error('A resposta da IA não contém JSON.');
        }

        const parsedJson = JSON.parse(responseText);

        const validation = jsonSchema.safeParse(parsedJson);
        if (!validation.success) {
            console.error('Erro Zod:', validation.error.format());
            throw new Error('A resposta não corresponde ao schema.');
        }

        return validation.data;
    } catch (err) {
        console.error('Falha ao chamar Gemini:', err);
        throw err;
    }
}
