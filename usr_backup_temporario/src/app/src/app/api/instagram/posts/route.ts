
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getInstagramPosts } from '@/app/(app)/profile/actions';

const RequestBodySchema = z.object({
  username: z.string().min(1, 'O nome de usuário é obrigatório.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = RequestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Payload da requisição inválido', details: parsedBody.error.format() }, { status: 400 });
    }

    const { username } = parsedBody.data;
    const postsData = await getInstagramPosts(username);
    
    return NextResponse.json({ data: postsData });

  } catch (error: any) {
    console.error('[API /api/instagram/posts] Error:', error);
    return NextResponse.json({ error: error.message || 'Ocorreu um erro no servidor' }, { status: 500 });
  }
}

    