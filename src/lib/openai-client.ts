
'use server';

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import Handlebars from 'handlebars';

// Registrar o helper 'json' se ainda não estiver registrado
if (!Handlebars.helpers.json) {
    Handlebars.registerHelper('json', function(context) {
        return JSON.stringify(context);
    });
}

interface CallOpenAIParams<T extends z.ZodType<any, any, any>> {
  prompt: string;
  jsonSchema: T;
  promptData: Record<string, any>;
  videoUrl?: string;
  videoMimeType?: string;
}

export async function callOpenAI<T extends z.ZodType<any, any, any>>(
  params: CallOpenAIParams<T>
): Promise<z.infer<T>> {
  const { prompt, jsonSchema, promptData, videoUrl, videoMimeType } = params;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('A chave de API da OpenAI não está configurada. Defina a variável de ambiente OPENAI_API_KEY.');
  }

  // Processa o template do prompt com os dados
  const template = Handlebars.compile(prompt);
  const processedPrompt = template(promptData);

  const schemaAsJson = zodToJsonSchema(jsonSchema, {
    name: 'openai_schema',
    target: 'jsonSchema7'
  });

  // Monta o conteúdo do usuário
  const userContent: any[] = [{ type: 'text', text: processedPrompt }];
  if (videoUrl) {
    // Adiciona a URL do vídeo diretamente, usando o tipo 'image_url' como instruído para o gpt-4o
    userContent.push({
      type: "image_url",
      image_url: {
        url: videoUrl,
      },
    });
  }
  
  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Você DEVE responder APENAS com um objeto JSON válido que corresponda ao schema fornecido. Não inclua texto explicativo, comentários ou markdown. O schema é: ${JSON.stringify(schemaAsJson)}`,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error('Erro da API OpenAI:', errorBody);
        throw new Error(`A API da OpenAI retornou o erro ${response.status}: ${errorBody.error?.message || 'Erro desconhecido'}`);
    }

    const jsonResponse = await response.json();
    const parsedJson = JSON.parse(jsonResponse.choices[0].message.content);
    
    // Valida o JSON retornado com o schema Zod
    const validationResult = jsonSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error("Erro de validação Zod:", validationResult.error.format());
      throw new Error("A resposta da IA não corresponde ao formato esperado.");
    }

    return validationResult.data;
  } catch (error) {
    console.error('Falha ao chamar a API da OpenAI:', error);
    throw error; // Re-throw para ser tratado pelo chamador
  }
}
