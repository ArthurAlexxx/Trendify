import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = body.username;

    if (!username) {
      return NextResponse.json({ error: 'Nome de usuário é obrigatório.' }, { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST;

    if (!apiKey || !apiHost) {
      console.error("As variáveis de ambiente da RapidAPI não estão configuradas.");
      return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
    }

    const url = 'https://instagram-data1.p.rapidapi.com/profile/';
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

    if (!response.ok) {
      throw new Error(data.message || `A API retornou um erro: ${response.statusText}`);
    }
    
    // A API da RapidAPI retorna 200 mesmo em caso de erro, então verificamos a resposta
    if (data.message) {
       throw new Error(data.message);
    }
    
    // A API retorna o resultado dentro de um objeto 'result'
    if (!data.result) {
        throw new Error('A resposta da API não contém os dados do perfil esperados.');
    }

    return NextResponse.json({ result: data.result });

  } catch (error: any) {
    console.error("Erro ao buscar dados do Instagram:", error.message);
    return NextResponse.json({ error: error.message || 'Ocorreu um erro desconhecido.' }, { status: 500 });
  }
}
