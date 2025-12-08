
'use server';

import { z } from 'zod';
import type { InstagramProfileData, InstagramPostData, TikTokProfileData, TikTokPost } from '@/lib/types';


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
    share_url: z.string().url().optional(),
    description: z.string().optional(),
    cover: z.string().url(),
    create_time: z.number().optional(),
    statistics: z.object({
        play_count: z.number().or(z.string()).transform(val => Number(val)).optional(),
        digg_count: z.number().or(z.string()).transform(val => Number(val)).optional(),
        comment_count: z.number().or(z.string()).transform(val => Number(val)).optional(),
        share_count: z.number().or(z.string()).transform(val => Number(val)).optional(),
    }).passthrough().optional(),
    video: z.object({
        play_addr: z.object({
            url_list: z.array(z.string().url()).optional(),
        }).optional(),
        cover: z.object({
          url_list: z.array(z.string().url()).optional()
        }).optional()
    }).optional(),
}).passthrough();


const TikTokPostResponseSchema = z.object({
    aweme_list: z.array(TikTokPostSchema).optional().default([]),
}).passthrough();


// --- API Fetching Logic ---

async function fetchFromRapidApi(platform: 'instagram-profile' | 'tiktok-profile' | 'tiktok-posts' | 'tiktok-video-details', identifier: string) {
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
            path = `user/details/${identifier}`; // Correct: username is part of the path
            finalUrl = new URL(`https://${host}/${path}`);
            break;
        case 'tiktok-posts':
            host = 'tiktok-api6.p.rapidapi.com';
            path = 'user/posts';
            finalUrl = new URL(`https://${host}/${path}`);
            finalUrl.searchParams.set('secUid', identifier); // This endpoint now uses secUid
            break;
        case 'tiktok-video-details':
             host = 'tiktok-api6.p.rapidapi.com';
             path = 'video/details';
             finalUrl = new URL(`https://${host}/${path}`);
             finalUrl.searchParams.set('id', identifier);
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
        try {
            data = JSON.parse(errorText);
        } catch (e) {
            // Not a JSON response, use the raw text.
        }

        if (response.status === 404) throw new Error(`Endpoint não encontrado. Verifique a URL da API.`);
        if (errorText.includes("You are not subscribed to this API")) throw new Error("Você não está inscrito nesta API na RapidAPI. Verifique sua assinatura e chave.");
        if (errorText.toLowerCase().includes("service unavailable")) throw new Error(`O serviço da API está indisponível. Tente mais tarde.`);
        if (errorText.toLowerCase().includes("this page is private")) throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        if (data.message && (data.message.includes("Couldn't find user") || data.message.includes("User not found"))) throw new Error("Usuário não encontrado. Verifique o nome de usuário e tente novamente.");

        
        throw new Error(`A API retornou um erro: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();

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
        
        const parsed = InstagramLooterProfileSchema.parse(dataToParse);

        if (parsed.is_private) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        if (parsed.is_professional_account === false) { // Explicitly check for false
            throw new Error("Esta conta não é do tipo 'Comercial' ou 'Criador de Conteúdo'. Altere o tipo de conta nas configurações do Instagram para continuar.");
        }

        return {
            id: parsed.id,
            username: parsed.username,
            isPrivate: parsed.is_private,
            isBusiness: parsed.is_professional_account,
            profilePicUrlHd: parsed.profile_pic_url_hd,
            biography: parsed.biography,
            fullName: parsed.full_name,
            mediaCount: parsed.edge_owner_to_timeline_media.count,
            followersCount: parsed.edge_followed_by.count,
            followingCount: parsed.edge_follow.count,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw e;
    }
}


export async function getInstagramPosts(username: string): Promise<InstagramPostData[]> {
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
        if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts do Instagram: ${errorDetails}`);
        }
        throw e;
    }
}



export async function getTikTokProfile(username: string): Promise<TikTokProfileData> {
  try {
      const result = await fetchFromRapidApi('tiktok-profile', username);
      const userData = result?.data?.user || result;

      if (!userData || typeof userData !== 'object') {
        console.error("Resposta real do TikTok:", result);
        throw new Error("A resposta da API do TikTok não contém os dados esperados do usuário.");
      }

      const parsed = TikTokApi6ProfileSchema.parse(userData);

      if (parsed.is_private) {
        throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
      }

      return {
          id: parsed.user_id!,
          username: parsed.username!,
          nickname: parsed.nickname || '',
          avatarUrl: parsed.profile_image || '',
          bio: parsed.description || '',
          isVerified: parsed.verified || false,
          isPrivate: parsed.is_private || false,
          secUid: parsed.secondary_id,
          followersCount: parsed.followers || 0,
          followingCount: parsed.following || 0,
          heartsCount: parsed.total_heart || 0,
          videoCount: parsed.total_videos || 0,
      };
  } catch (e: any) {
      console.error(`[ACTION ERROR - getTikTokProfile]`, e);
      if (e.issues) {
          throw new Error(`Falha na validação dos dados do perfil do TikTok: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
      }
      throw e;
  }
}


export async function getTikTokPosts(username: string): Promise<TikTokPost[]> {
    if (!username) {
        throw new Error('Nome de usuário é necessário para buscar os posts.');
    }
    try {
        const profile = await getTikTokProfile(username);
        if (!profile.secUid) {
            throw new Error("Não foi possível obter o secUid do perfil do TikTok, necessário para buscar os vídeos.");
        }

        const result = await fetchFromRapidApi('tiktok-posts', profile.secUid);

        const parsed = TikTokPostResponseSchema.parse(result);
        
        const videos = parsed.aweme_list ?? [];

        const detailedVideos = await Promise.all(videos.slice(0, 10).map(async (post) => {
            try {
                const details = await fetchFromRapidApi('tiktok-video-details', post.video_id);
                return {
                    id: post.video_id,
                    shareUrl: details?.data?.share_url,
                    description: post.description || '',
                    coverUrl: post.video?.cover?.url_list?.[0] || post.cover,
                    views: post.statistics?.play_count ?? 0,
                    likes: post.statistics?.digg_count ?? 0,
                    comments: post.statistics?.comment_count ?? 0,
                };
            } catch (detailError: any) {
                console.warn(`Falha ao buscar detalhes do vídeo ${post.video_id}: ${detailError.message}`);
                // Retorna o post com dados básicos mesmo que os detalhes falhem
                return {
                    id: post.video_id,
                    shareUrl: undefined,
                    description: post.description || '',
                    coverUrl: post.video?.cover?.url_list?.[0] || post.cover,
                    views: post.statistics?.play_count ?? 0,
                    likes: post.statistics?.digg_count ?? 0,
                    comments: post.statistics?.comment_count ?? 0,
                };
            }
        }));

        return detailedVideos;

    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokPosts] ${e.message}`);
        if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts do TikTok: ${errorDetails}`);
        }
        throw e;
    }
}
