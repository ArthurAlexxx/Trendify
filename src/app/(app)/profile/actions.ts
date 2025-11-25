
'use server';
import { z } from 'zod';

// Utility schemas
const CountSchema = z.object({
  count: z.number(),
});

// Profile Schema
const ProfileResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  is_private: z.boolean(),
  profile_pic_url_hd: z.string().url(),
  biography: z.string(),
  full_name: z.string(),
  edge_owner_to_timeline_media: CountSchema,
  edge_followed_by: CountSchema,
  edge_follow: CountSchema,
  is_business_account: z.boolean().optional(), // Tornando o campo opcional
});

export type ProfileData = {
    id: string;
    username: string;
    isPrivate: boolean;
    profilePicUrlHd: string;
    biography: string;
    fullName: string;
    mediaCount: number;
    followersCount: number;
    followingCount: number;
    isBusiness: boolean;
}

// Post Schema
const PostNodeSchema = z.object({
  id: z.string(),
  display_url: z.string().url(),
  edge_media_to_caption: z.object({
    edges: z.array(z.object({ node: z.object({ text: z.string() }) })),
  }),
  edge_media_preview_like: CountSchema,
  edge_media_to_comment: CountSchema,
  is_video: z.boolean(),
});

const PostsResultSchema = z.object({
    edges: z.array(z.object({
        node: PostNodeSchema
    }))
})

export type PostData = {
    id: string;
    displayUrl: string;
    caption: string;
    likes: number;
    comments: number;
    isVideo: boolean;
}


async function fetchFromRapidApi(endpoint: 'profile' | 'posts', username: string) {
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST;

    if (!apiKey || !apiHost) {
      throw new Error('As credenciais da API não estão configuradas no servidor.');
    }

    const url = `https://${apiHost}/api/instagram/${endpoint}`;
    const options = {
      method: 'POST',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || data.message) {
      // Prioritize the message from the API body if it exists
      throw new Error(data.message || `A API retornou um erro: ${response.statusText}`);
    }

    if (!data.result) {
        throw new Error('A resposta da API não contém os dados esperados.');
    }
    
    return data.result;
}


export async function getInstagramProfile(username: string): Promise<ProfileData> {
    try {
        const result = await fetchFromRapidApi('profile', username);
        const parsed = ProfileResultSchema.parse(result);

        return {
            id: parsed.id,
            username: parsed.username,
            isPrivate: parsed.is_private,
            profilePicUrlHd: parsed.profile_pic_url_hd,
            biography: parsed.biography,
            fullName: parsed.full_name,
            mediaCount: parsed.edge_owner_to_timeline_media.count,
            followersCount: parsed.edge_followed_by.count,
            followingCount: parsed.edge_follow.count,
            isBusiness: parsed.is_business_account || false, // Garante que seja um booleano
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        // Verifica se a mensagem de erro já está formatada como JSON (erro de validação do Zod)
        if (e.message.startsWith('[')) {
            try {
                const zodError = JSON.parse(e.message);
                const firstIssue = zodError[0];
                throw new Error(`O dado '${firstIssue.path.join('.')}' falhou na validação: ${firstIssue.message}. Esperado: ${firstIssue.expected}, Recebido: ${firstIssue.received}.`);
            } catch {
                 throw new Error(`Falha ao buscar perfil do Instagram: ${e.message}`);
            }
        }
        throw new Error(`Falha ao buscar perfil do Instagram: ${e.message}`);
    }
}

export async function getInstagramPosts(username: string): Promise<PostData[]> {
     try {
        const result = await fetchFromRapidApi('posts', username);
        const parsed = PostsResultSchema.parse(result);
        
        return parsed.edges.map(({ node }) => ({
            id: node.id,
            displayUrl: node.display_url,
            caption: node.edge_media_to_caption.edges[0]?.node.text || '',
            likes: node.edge_media_preview_like.count,
            comments: node.edge_media_to_comment.count,
            isVideo: node.is_video,
        }));
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramPosts] ${e.message}`);
        throw new Error(`Falha ao buscar posts do Instagram: ${e.message}`);
    }
}
