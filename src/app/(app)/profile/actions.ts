
'use server';

import { z } from 'zod';

// --- Instagram Schemas ---

const InstagramProfileResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  is_private: z.boolean(),
  profile_pic_url_hd: z.string().url(),
  biography: z.string(),
  full_name: z.string(),
  edge_owner_to_timeline_media: z.object({
    count: z.number().optional(),
  }),
  edge_followed_by: z.object({
    count: z.number().optional(),
  }),
  edge_follow: z.object({
    count: z.number().optional(),
  }),
  is_business_account: z.boolean().optional(),
});

export type InstagramProfileData = {
    id: string;
    username: string;
    isPrivate: boolean;
    isBusiness: boolean;
    profilePicUrlHd: string;
    biography: string;
    fullName: string;
    mediaCount: number;
    followersCount: number;
    followingCount: number;
}

const InstagramPostNodeSchema = z.object({
  id: z.string(),
  display_url: z.string().url(),
  video_url: z.string().url().optional(),
  edge_media_to_caption: z.object({
    edges: z.array(z.object({
        node: z.object({ text: z.string() })
    })).min(1),
  }),
  edge_media_preview_like: z.object({
    count: z.number(),
  }),
  edge_media_to_comment: z.object({
    count: z.number(),
  }),
  is_video: z.boolean(),
  taken_at_timestamp: z.number(),
});

const InstagramPostsResultSchema = z.object({
    edges: z.array(z.object({
        node: InstagramPostNodeSchema
    }))
})

export type InstagramPostData = {
    id: string;
    displayUrl: string;
    videoUrl?: string;
    caption: string;
    likes: number;
    comments: number;
    isVideo: boolean;
}

// --- TikTok Schemas ---

const TikTokStatsSchema = z.object({
    followerCount: z.number(),
    followingCount: z.number(),
    heartCount: z.number(),
    videoCount: z.number(),
});

const TikTokUserSchema = z.object({
    id: z.string(),
    uniqueId: z.string(),
    nickname: z.string(),
    avatarLarger: z.string().url(),
    signature: z.string(), // bio
    verified: z.boolean(),
    privateAccount: z.boolean(),
});

const TikTokProfileSchema = z.object({
    stats: TikTokStatsSchema,
    user: TikTokUserSchema,
});

export type TikTokProfileData = {
    id: string;
    username: string;
    nickname: string;
    avatarUrl: string;
    bio: string;
    isVerified: boolean;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    heartsCount: number;
    videoCount: number;
};

const TikTokPostSchema = z.object({
    id: z.string(),
    desc: z.string(),
    createTime: z.number(),
    video: z.object({
        cover: z.string().url(),
        playAddr: z.string().url(),
    }),
    author: z.object({
        uniqueId: z.string(),
    }),
    stats: z.object({
        diggCount: z.number(), // likes
        commentCount: z.number(),
        playCount: z.number(), // views
    }),
});

export type TikTokPostData = {
    id: string;
    description: string;
    videoUrl: string;
    coverUrl: string;
    views: number;
    likes: number;
    comments: number;
};


// --- API Fetching Logic ---

async function fetchFromRapidApi(platform: 'instagram' | 'tiktok', endpoint: 'profile' | 'posts', username: string) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      throw new Error('A chave da API (RAPIDAPI_KEY) não está configurada no servidor.');
    }

    const hosts = {
        instagram: process.env.INSTAGRAM_RAPIDAPI_HOST,
        tiktok: process.env.TIKTOK_RAPIDAPI_HOST,
    };
    
    const host = hosts[platform];
    if (!host) {
        throw new Error(`O host da API para a plataforma '${platform}' não está configurado.`);
    }


    const paths = {
        instagram: {
            profile: 'v1/user-info',
            posts: 'v1/user-posts',
        },
        tiktok: {
            profile: '/api/user/info',
            posts: '/api/user/videos',
        }
    }

    const path = paths[platform][endpoint];
    const url = `https://${host}${path}`;

    const options = {
      method: 'POST',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API ERROR - ${platform}/${endpoint}] Status ${response.status}:`, errorText);
        
        if (response.status === 404) throw new Error(`Endpoint '/${path}' não encontrado. Verifique a URL da API.`);
        if (errorText.includes("You are not subscribed to this API")) throw new Error("Você não está inscrito nesta API na RapidAPI. Verifique sua assinatura e chave.");
        if (errorText.toLowerCase().includes("service unavailable")) throw new Error(`O serviço da API (${platform}) está indisponível. Tente mais tarde.`);
        if (errorText.toLowerCase().includes("this page is private")) throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        
        throw new Error(`A API (${platform}) retornou um erro: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();

    if (platform === 'instagram' && data.message) throw new Error(data.message);
    
    // The TikTok API nests the result differently
    if (platform === 'tiktok' && data.statusCode !== 0) throw new Error(data.status_msg || `API do TikTok retornou status ${data.statusCode}`);
    
    return platform === 'tiktok' ? data : data.data; // Instagram nests in `data`, TikTok does not
}


export async function getInstagramProfile(username: string): Promise<InstagramProfileData> {
    try {
        const result = await fetchFromRapidApi('instagram', 'profile', username);
        const parsed = InstagramProfileResultSchema.parse(result);

        if (parsed.is_private) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }
        
        if (!parsed.is_business_account) {
            throw new Error("Esta conta não é do tipo 'Comercial' ou 'Criador de Conteúdo'. Altere o tipo de conta nas configurações do Instagram para continuar.");
        }

        return {
            id: parsed.id,
            username: parsed.username,
            isPrivate: parsed.is_private,
            isBusiness: parsed.is_business_account || false,
            profilePicUrlHd: parsed.profile_pic_url_hd,
            biography: parsed.biography,
            fullName: parsed.full_name,
            mediaCount: parsed.edge_owner_to_timeline_media.count || 0,
            followersCount: parsed.edge_followed_by.count || 0,
            followingCount: parsed.edge_follow.count || 0,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar perfil do Instagram: ${e.message}`);
    }
}

export async function getInstagramPosts(username: string): Promise<InstagramPostData[]> {
     try {
        const result = await fetchFromRapidApi('instagram', 'posts', username);
        const parsed = InstagramPostsResultSchema.parse(result);
        
        const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60);

        const recentPosts = parsed.edges.filter(({ node }) => {
            return node.taken_at_timestamp > thirtyOneDaysAgo;
        });

        return recentPosts.map(({ node }) => ({
            id: node.id,
            displayUrl: node.display_url,
            videoUrl: node.video_url,
            caption: node.edge_media_to_caption.edges[0]?.node.text || '',
            likes: node.edge_media_preview_like.count,
            comments: node.edge_media_to_comment.count,
            isVideo: node.is_video,
        }));
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramPosts] ${e.message}`);
         if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts: ${errorDetails}`);
        }
        throw new Error(`Falha ao buscar posts do Instagram: ${e.message}`);
    }
}


export async function getTikTokProfile(username: string): Promise<TikTokProfileData> {
    try {
        const result = await fetchFromRapidApi('tiktok', 'profile', username);
        const parsed = TikTokProfileSchema.parse(result);

        if (parsed.user.privateAccount) {
            throw new Error("Este perfil é privado. A integração funciona apenas com perfis públicos.");
        }

        return {
            id: parsed.user.id,
            username: parsed.user.uniqueId,
            nickname: parsed.user.nickname,
            avatarUrl: parsed.user.avatarLarger,
            bio: parsed.user.signature,
            isVerified: parsed.user.verified,
            isPrivate: parsed.user.privateAccount,
            followersCount: parsed.stats.followerCount,
            followingCount: parsed.stats.followingCount,
            heartsCount: parsed.stats.heartCount,
            videoCount: parsed.stats.videoCount,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokProfile] ${e.message}`);
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil do TikTok: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar perfil do TikTok: ${e.message}`);
    }
}


export async function getTikTokPosts(username: string): Promise<TikTokPostData[]> {
    try {
        const result = await fetchFromRapidApi('tiktok', 'posts', username);
        // TikTok API nests posts in an `aweme_list` array
        const postsArray = z.array(TikTokPostSchema).parse(result?.aweme_list || []);

        const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60);

        const recentPosts = postsArray.filter(post => post.createTime > thirtyOneDaysAgo);
        
        return recentPosts.map(post => ({
            id: post.id,
            description: post.desc,
            videoUrl: post.video.playAddr,
            coverUrl: post.video.cover,
            views: post.stats.playCount,
            likes: post.stats.diggCount,
            comments: post.stats.commentCount,
        }));

    } catch (e: any) {
        console.error(`[ACTION ERROR - getTikTokPosts] ${e.message}`);
        if (e.issues) {
             const errorDetails = e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ');
             throw new Error(`Falha na validação dos dados dos posts do TikTok: ${errorDetails}`);
        }
        throw new Error(`Falha ao buscar posts do TikTok: ${e.message}`);
    }
}
