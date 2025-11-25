
'use server';
import { z } from 'zod';

// Utility schemas
const CountSchema = z.object({
  count: z.number().optional(),
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
  is_business_account: z.boolean().optional(),
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

// Post Schema - Updated to match the real API response
const PostNodeSchema = z.object({
  id: z.string(),
  image_versions2: z.object({
    candidates: z.array(z.object({
      url: z.string().url(),
    })).min(1),
  }).optional(),
  carousel_media: z.array(z.object({
    image_versions2: z.object({
        candidates: z.array(z.object({
            url: z.string().url(),
        })).min(1),
    })
  })).optional(),
  caption: z.object({
    text: z.string(),
  }).nullable().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  media_type: z.number(), // 1: Image, 2: Video, 8: Carousel
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
            mediaCount: parsed.edge_owner_to_timeline_media.count || 0,
            followersCount: parsed.edge_followed_by.count || 0,
            followingCount: parsed.edge_follow.count || 0,
            isBusiness: parsed.is_business_account || false,
        };
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramProfile] ${e.message}`);
        // This is a simple way to propagate Zod errors for debugging
        if (e.issues) {
             throw new Error(`Falha na validação dos dados do perfil: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar perfil do Instagram: ${e.message}`);
    }
}

export async function getInstagramPosts(username: string): Promise<PostData[]> {
     try {
        const result = await fetchFromRapidApi('posts', username);
        const parsed = PostsResultSchema.parse(result);
        
        return parsed.edges.map(({ node }) => {
            let displayUrl = '';
            if (node.media_type === 8 && node.carousel_media && node.carousel_media.length > 0) {
                 displayUrl = node.carousel_media[0].image_versions2.candidates[0].url;
            } else if (node.image_versions2 && node.image_versions2.candidates.length > 0) {
                displayUrl = node.image_versions2.candidates[0].url;
            }

            return {
                id: node.id,
                displayUrl: displayUrl,
                caption: node.caption?.text || '',
                likes: node.like_count || 0,
                comments: node.comment_count || 0,
                isVideo: node.media_type === 2,
            }
        });
    } catch (e: any) {
        console.error(`[ACTION ERROR - getInstagramPosts] ${e.message}`);
         if (e.issues) {
             throw new Error(`Falha na validação dos dados dos posts: ${e.issues.map((issue: any) => `${issue.path.join('.')} - ${issue.message}`).join(', ')}`);
        }
        throw new Error(`Falha ao buscar posts do Instagram: ${e.message}`);
    }
}
