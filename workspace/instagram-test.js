
// Este é um script de teste para depurar a chamada à API do Instagram Graph.
// Para usar:
// 1. Crie um arquivo .env na raiz do projeto, se ainda não existir.
// 2. Adicione a seguinte linha ao seu arquivo .env:
//    INSTAGRAM_USER_ACCESS_TOKEN="SEU_TOKEN_DE_LONGA_DURAÇÃO_AQUI"
// 3. Obtenha um Token de Acesso do Usuário válido na ferramenta de Exploração da Graph API.
//    (https://developers.facebook.com/tools/explorer/)
//    - Selecione seu App da Meta no menu suspenso.
//    - No menu "Permissões", adicione todas que seu app precisa (ex: instagram_basic, pages_show_list, instagram_manage_insights, etc.).
//    - Clique em "Gerar Token de Acesso".
//    - Troque este token por um de longa duração.
// 4. Cole o token de longa duração no seu arquivo .env.
// 5. Abra o terminal e execute o script com: node -r dotenv/config workspace/instagram-test.js

require('dotenv').config();

const USER_ACCESS_TOKEN = process.env.INSTAGRAM_USER_ACCESS_TOKEN;

async function testInstagramApi() {
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN === 'SEU_TOKEN_DE_LONGA_DURAÇÃO_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, configure a variável INSTAGRAM_USER_ACCESS_TOKEN no seu arquivo .env.');
    return;
  }

  console.log('Iniciando teste com a API do Instagram Graph...');
  
  // Este endpoint busca o perfil do usuário logado através da API do Instagram.
  // É o passo final para verificar se o token tem acesso aos dados da conta profissional do Instagram.
  const url = `https://graph.instagram.com/me?fields=id,username,account_type,followers_count,media_count,profile_picture_url,biography&access_token=${USER_ACCESS_TOKEN}`;

  try {
    console.log(`\nFazendo requisição para: ${url.replace(USER_ACCESS_TOKEN, '[TOKEN_OMITIDO]')}\n`);

    const response = await fetch(url);
    const data = await response.json();

    console.log('\x1b[32m%s\x1b[0m', '--- RESPOSTA DA API DO INSTAGRAM ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('\x1b[32m%s\x1b[0m', '-----------------------------------\n');

    if (data.error) {
      console.error('\x1b[31m%s\x1b[0m', `A API retornou um erro: ${data.error.message}`);
      console.log('Isso geralmente indica que o token expirou, é inválido ou não possui as permissões necessárias.');
    } else if (data.id && data.username) {
      console.log('\x1b[32m%s\x1b[0m', `SUCESSO: Token válido para o usuário @${data.username} (ID: ${data.id})`);
      if (data.account_type === 'BUSINESS' || data.account_type === 'MEDIA_CREATOR') {
          console.log(`-> Tipo de conta: ${data.account_type}. Correto para a integração.`);
      } else {
          console.warn('\x1b[33m%s\x1b[0m', `AVISO: A conta é do tipo "${data.account_type}". A integração exige uma conta "BUSINESS" ou "MEDIA_CREATOR".`);
      }
    } else {
        console.warn('\x1b[33m%s\x1b[0m', 'AVISO: A resposta não contém os dados esperados (id, username). Verifique se o token tem as permissões corretas (pelo menos instagram_basic e pages_show_list).');
    }

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Ocorreu um erro crítico durante a requisição:', error);
  }
}

async function testFacebookApi() {
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN === 'SEU_TOKEN_DE_LONGA_DURAÇÃO_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, configure a variável INSTAGRAM_USER_ACCESS_TOKEN no seu arquivo .env.');
    return;
  }

  console.log('Iniciando teste com a API do Facebook Graph...');
  
  // Este endpoint busca o perfil básico do usuário no Facebook.
  // Requer as permissões 'public_profile' e 'email'.
  const url = `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${USER_ACCESS_TOKEN}`;

  try {
    console.log(`\nFazendo requisição para: ${url.replace(USER_ACCESS_TOKEN, '[TOKEN_OMITIDO]')}\n`);

    const response = await fetch(url);
    const data = await response.json();

    console.log('\x1b[36m%s\x1b[0m', '--- RESPOSTA DA API DO FACEBOOK ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('\x1b[36m%s\x1b[0m', '-----------------------------------\n');

    if (data.error) {
      console.error('\x1b[31m%s\x1b[0m', `A API retornou um erro: ${data.error.message}`);
      console.log('Verifique se o token é válido e possui as permissões "public_profile" e "email".');
    } else if (data.id && data.name) {
      console.log('\x1b[32m%s\x1b[0m', `SUCESSO: Token válido para o usuário ${data.name} (ID: ${data.id})`);
    } else {
        console.warn('\x1b[33m%s\x1b[0m', 'AVISO: A resposta não contém os dados esperados (id, name).');
    }

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Ocorreu um erro crítico durante a requisição:', error);
  }
}


// --- ESCOLHA QUAL TESTE EXECUTAR ---
// Para testar a API do Instagram, deixe a linha abaixo como está.
testInstagramApi();

// Para testar a API do Facebook, comente a linha acima e descomente a linha abaixo.
// testFacebookApi();
