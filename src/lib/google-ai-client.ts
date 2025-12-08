
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

// Helper para buscar a URL e converter para base64
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
            data: base64Data
        }
    };
}


interface CallGoogleAIParams<T extends z.ZodType<any, any, any>> {
  prompt: string;
  jsonSchema: T;
  promptData: Record<string, any>;
  videoUrl?: string; // URL do vídeo para análise multimodal
  videoMimeType?: string; // Mime type do vídeo
}

// Função recursiva para remover uma chave específica de um objeto
function removeKeyRecursively(obj: any, keyToRemove: string): any {
  if (Array.isArray(obj)) {
    return obj.map(item => removeKeyRecursively(item, keyToRemove));
  }
  if (typeof obj === 'object' && obj !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (key !== keyToRemove) {
        newObj[key] = removeKeyRecursively(obj[key], keyToRemove);
      }
    }
    return newObj;
  }
  return obj;
}


export async function callGoogleAI<T extends z.ZodType<any, any, any>>(
  params: CallGoogleAIParams<T>
): Promise<z.infer<T>> {
  const { prompt, jsonSchema, promptData, videoUrl, videoMimeType } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('A chave de API do Gemini não está configurada. Defina a variável de ambiente GEMINI_API_KEY.');
  }

  // Processa o template do prompt com os dados
  const template = Handlebars.compile(prompt);
  const processedPrompt = template(promptData);

  const schemaAsJson = zodToJsonSchema(jsonSchema, {
    $refStrategy: 'none'
  });
  
  // A API do Gemini não espera as propriedades $schema, definitions ou additionalProperties.
  const { $schema, definitions, ...almostCleanedSchema } = schemaAsJson as any;
  const cleanedSchema = removeKeyRecursively(almostCleanedSchema, 'additionalProperties');


  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: processedPrompt
        }
      ]
    }
  ];

  // Adiciona o vídeo aos 'parts' se a URL for fornecida
  if (videoUrl && videoMimeType) {
    const videoPart = await urlToGenerativePart(videoUrl, videoMimeType);
    contents[0].parts.unshift(videoPart);
  }

  const body = {
    contents,
    generation_config: {
        response_mime_type: "application/json",
        temperature: 0.7,
    },
    tools: [
        {
            "function_declarations": [
                {
                    "name": "output_formatter",
                    "description": "Formata a saída de acordo com o schema JSON fornecido.",
                    "parameters": cleanedSchema
                }
            ]
        }
    ],
    tool_config: {
        "function_calling_config": {
            "mode": "ANY",
            "allowed_function_names": ["output_formatter"]
        }
    }
  };

  try {
    //
    // AQUI é onde o modelo é definido. Alterado para 'gemini-1.5-pro'.
    //
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
        const errorBody = await response.json();
        console.error('Erro da API do Google AI:', errorBody);
        throw new Error(`A API do Google retornou o erro ${response.status}: ${errorBody.error?.message || 'Erro desconhecido'}`);
    }

    const jsonResponse = await response.json();
    
    const functionCall = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!functionCall || !functionCall.args) {
        console.error("Resposta inválida da API, não contém 'functionCall.args':", JSON.stringify(jsonResponse, null, 2));
        throw new Error("A resposta da IA não está no formato esperado (sem function call).");
    }

    const parsedJson = functionCall.args;
    
    // Valida o JSON retornado com o schema Zod
    const validationResult = jsonSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error("Erro de validação Zod:", validationResult.error.format());
      throw new Error("A resposta da IA não corresponde ao formato esperado (falha na validação).");
    }

    return validationResult.data;
  } catch (error) {
    console.error('Falha ao chamar a API do Google AI:', error);
    throw error; // Re-throw para ser tratado pelo chamador
  }
}
