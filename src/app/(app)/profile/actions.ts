
'use server';

import { z } from 'zod';
import type { InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPost } from '@/lib/types';
import { initializeFirebaseAdmin } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';


// --- Error Logging ---
async function logApiError(platform: 'instagram' | 'tiktok', endpoint: string, username: string, error: any) {
  try {
    const { firestore } = initializeFirebaseAdmin();
    await firestore.collection('apiErrors').add({
      platform,
      endpoint,
      username,
      errorMessage: error.message || 'Erro desconhecido',
      rawError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (logError) {
    console.error(`[CRITICAL] Falha ao registrar log de erro da API:`, logError);
  }
}


// --- Instagram Schemas (New: instagram-looter2) ---

const InstagramLooterPostSchema = z.object({
  __typename: z.string(), // "GraphImage", "GraphVideo", "GraphSidecar"
  id: z.string(),
  shortcode: z.string(),
  display_url: z.string().url(),
  edge_media_to_comment: z.object({ count: z.number() }),
  edge_liked_by: z.object({ count: z.number() }),
  is_video: z.boolean(),
  video_view_count: z.number().optional().nullable(),
  edge_media_to_caption: z.object({
    edges: z.array(z.object({ node: z.object({ text: z.string() }) })),
  }),
});


const InstagramLooterProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  is_private: z.boolean(),
  is_professional_account: z.boolean(),
  profile_pic_url_hd: z.string().url(),
  biography: z.string(),
  full_name: z.string(),
  edge_owner_to_timeline_media: z.object({
    count: z.number(),
    edges: z.array(z.object({ node: InstagramLooterPostSchema })),
  }),
  edge_followed_by: z.object({
    count: z.number(),
  }),
  edge_follow: z.object({
    count: z.number(),
  }),
});


// --- TikTok Schemas ---

const TikTokApi6ProfileSchema = z.object({
    username: z.string().optional(),
    nickname: z.string().optional(),
    user_id: z.string().optional(),
    profile_image: z.string().url().optional(),
    followers: z.number().optional(),
    following: z.number().optional(),
    total_videos: z.number().optional(),
    total_heart: z.number().optional(),
    verified: z.boolean().optional(),
    description: z.string().optional(),
    secondary_id: z.string().optional(),
    is_private: z.boolean().optional(),
}).passthrough();


const TikTokPostSchema = z.object({
    video_id: z.string(),
    description: z.string().optional(),
    cover: z.string().url(),
    create_time: z.number().optional(),
    author: z.string().optional(),
    author_id: z.string().optional(),
    statistics: z.object({
        number_of_plays: z.number().optional().default(0),
        number_of_hearts: z.number().optional().default(0),
        number_of_comments: z.number().optional().default(0),
    }).optional(),
}).passthrough();

const TikTokPostResponseSchema = z.object({
    videos: z.array(TikTokPostSchema).optional().default([]),
}).passthrough();


// --- API Fetching Logic ---

async function fetchFromRapidApi(platform: 'instagram-profile' | 'tiktok-profile' | 'tiktok-posts', identifier: string) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error('A chave da API (RAPIDAPI_KEY) não está configurada no servidor.');
    }
    
    let host: string;
    let path: string;
    let finalUrl: URL;
    let method: 'GET' | 'POST' = 'GET';
    let body: string | undefined = undefined;

    const headers: Record<string, string> = {
        'x-rapidapi-key': apiKey,
    };

    switch (platform) {
        case 'instagram-profile':
            host = 'instagram-looter2.p.rapidapi.com';
            path = 'profile';
            finalUrl = new URL(`https://${host}/${path}`);
            finalUrl.searchParams.set('username', identifier);
            break;
        case 'tiktok-profile':
            host = 'tiktok-api6.p.rapidapi.com';
            path = 'user/details';
            method = 'POST';
            headers['content-type'] = 'application/json';
            body = JSON.stringify({ username: identifier });
            finalUrl = new URL(`https://${host}/${path}`);
            break;
        case 'tiktok-posts':
            host = 'tiktok-api6.p.rapidapi.com';
            path = 'user/videos';
            method = 'POST';
            headers['content-type'] = 'application/json';
            body = JSON.stringify({ username: identifier });
            finalUrl = new URL(`https://${host}/${path}`);
            break;
        default:
            throw new Error(`Plataforma '${platform}' desconhecida.`);
    }

    headers['x-rapidapi-host'] = host;
    
    const options: RequestInit = {
        method,
        headers,
        body
    };

    return fetchData(finalUrl.toString(), options);
}

async function fetchData(url: string, options: RequestInit) {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API ERROR] Status ${response.status} para ${url}:`, errorText);
        
        let data: any = {};
        try { data = JSON.parse(errorText); } catch (e) { /* Not a JSON response, use the raw text. */ }

        if (response.status === 404) throw new Error(`Endpoint não encontrado. Verifique a URL da API.`);
        if (errorText.includes("You are not subscribed to this API")) throw new Error("Você não está inscrito nesta API na RapidAPI. Verifique sua assinatura e chave.");
        if (errorText.toLowerCase().includes("service unavailable")) throw new Error(`O serviço da API está indisponível. Tente mais tarde.`);
        if (errorText.toLowerCase().includes("this page is private")) throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        if (data.message && (data.message.includes("Couldn't find user") || data.message.includes("User not found"))) throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");

        // Specific for expired/invalid tokens
        if (response.status === 401 || response.status === 403 || (data.error?.type === 'OAuthException')) {
          throw new Error('Ocorreu um erro de autenticação com a API. Tente sincronizar novamente.');
        }
        
        throw new Error(`A API retornou um erro inesperado. Verifique os logs para mais detalhes.`);
    }
    
    const data = await response.json();

    // Check for logical errors in a 200 OK response
    if (data.message && (data.message.includes("Couldn't find user") || data.message.includes("User not found"))) throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");
    if (data.error) throw new Error(data.error);
    if (data.status_code !== 0 && data.status_msg) throw new Error(`A API do TikTok retornou um erro: ${data.status_msg}`);
    if (data.status === 'fail' || (data.data && data.data.user === null)) throw new Error("Usuário não encontrado ou perfil indisponível.");


    return data;
}


export async function getInstagramProfile(username: string): Promise<InstagramProfileData> {
    try {
        const result = await fetchFromRapidApi('instagram-profile', username);
        const dataToParse = result; // Data is at the root
        if (!dataToParse) {
            throw new Error("A resposta da API não continha os dados do usuário.");
        }
        
        const parsed = InstagramLooterProfileSchema.safeParse(dataToParse);

        if (!parsed.success) {
            throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");
        }

        if (parsed.data.is_private) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        if (parsed.data.is_professional_account === false) { // Explicitly check for false
            throw new Error("Esta conta não é do tipo 'Comercial' ou 'Criador de Conteúdo'. Altere o tipo de conta nas configurações do Instagram para continuar.");
        }

        return {
            id: parsed.data.id,
            username: parsed.data.username,
            isPrivate: parsed.data.is_private,
            isBusiness: parsed.data.is_professional_account,
            profilePicUrlHd: parsed.data.profile_pic_url_hd,
            biography: parsed.data.biography,
            fullName: parsed.data.full_name,
            mediaCount: parsed.data.edge_owner_to_timeline_media.count,
            followersCount: parsed.data.edge_followed_by.count,
            followingCount: parsed.data.edge_follow.count,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        await logApiError('instagram', 'profile', username, e);
        throw e;
    }
}


export async function getInstagramPosts(username: string): Promise<Omit<InstagramPostData, 'fetchedAt'>[]> {
    if (!username) {
        throw new Error('Nome de usuário é necessário para buscar os posts.');
    }
    try {
        const result = await fetchFromRapidApi('instagram-profile', username);
        
        const postsArray = result?.edge_owner_to_timeline_media?.edges;

        if (!Array.isArray(postsArray)) {
             throw new Error('A resposta da API de posts não continha uma lista de publicações.');
        }

        const parsedPosts = postsArray.map((edge: any) => InstagramLooterPostSchema.parse(edge.node));
        
        return parsedPosts.map(post => ({
            id: post.id,
            shortcode: post.shortcode,
            caption: post.edge_media_to_caption.edges[0]?.node.text || null,
            mediaUrl: post.display_url,
            likes: post.edge_liked_by.count,
            comments: post.edge_media_to_comment.count,
            video_view_count: post.video_view_count ?? 0,
            is_video: post.is_video,
        }));
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramPosts] ${e.message}`);
        await logApiError('instagram', 'posts', username, e);
        if (e instanceof z.ZodError) {
             throw new Error(`Falha na validação dos dados dos posts. Tente novamente.`);
        }
        throw e;
    }
}



export async function getTikTokProfile(username: string): Promise<TikTokProfileData> {
  try {
      const result = await fetchFromRapidApi('tiktok-profile', username);
      const userData = result; // Data is at the root

      if (!userData || typeof userData !== 'object') {
        console.error("Resposta real do TikTok:", result);
        throw new Error("A resposta da API do TikTok não contém os dados esperados do usuário.");
      }

      const parsed = TikTokApi6ProfileSchema.safeParse(userData);

       if (!parsed.success) {
            throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");
        }

      if (parsed.data.is_private) {
        throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
      }

      return {
          id: parsed.data.user_id!,
          username: parsed.data.username!,
          nickname: parsed.data.nickname || '',
          avatarUrl: parsed.data.profile_image || '',
          bio: parsed.data.description || '',
          isVerified: parsed.data.verified || false,
          isPrivate: parsed.data.is_private || false,
          secUid: parsed.data.secondary_id,
          followersCount: parsed.data.followers || 0,
          followingCount: parsed.data.following || 0,
          heartsCount: parsed.data.total_heart || 0,
          videoCount: parsed.data.total_videos || 0,
      };
  } catch (e: any) {
      console.error(`[ACTION ERROR - getTikTokProfile]`, e);
      await logApiError('tiktok', 'profile', username, e);
      throw e;
  }
}


export async function getTikTokPosts(username: string): Promise<Omit<TikTokPost, 'fetchedAt'>[]> {
    if (!username) {
        throw new Error('Username é necessário para buscar os posts.');
    }
    try {
        const result = await fetchFromRapidApi('tiktok-posts', username);
        const parsed = TikTokPostResponseSchema.safeParse(result);
        
        if (!parsed.success) {
            throw new Error(`Falha na validação dos dados dos posts do TikTok. Tente novamente.`);
        }

        const videos = parsed.data.videos ?? [];

        return videos.slice(0, 10).map((post) => ({
            id: post.video_id,
            shareUrl: `https://www.tiktok.com/@${post.author}/video/${post.video_id}`,
            description: post.description || '',
            coverUrl: post.cover,
            views: post.statistics?.number_of_plays ?? 0,
            likes: post.statistics?.number_of_hearts ?? 0,
            comments: post.statistics?.number_of_comments ?? 0,
            createdAt: post.create_time ? new Date(post.create_time * 1000) as any : undefined,
        }));

    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokPosts] ${e.message}`);
        await logApiError('tiktok', 'posts', username, e);
        throw e;
    }
}

    