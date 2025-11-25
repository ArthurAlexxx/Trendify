
// Este é um script de teste para depurar a chamada à API do Instagram Graph.
// Para usar:
// 1. Obtenha um Token de Acesso do Usuário válido na ferramenta de Exploração da Graph API.
//    (https://developers.facebook.com/tools/explorer/)
//    - Selecione seu App da Meta no menu suspenso.
//    - No menu "Permissões", adicione todas que seu app precisa (ex: instagram_basic, pages_show_list, instagram_business_management, etc.).
//    - Clique em "Gerar Token de Acesso".
// 2. Cole o token gerado na variável `USER_ACCESS_TOKEN` abaixo.
// 3. Abra o terminal e execute o script com: node workspace/instagram-test.js

// COLE SEU TOKEN DE ACESSO AQUI DENTRO DAS ASPAS
const USER_ACCESS_TOKEN = 'COLE_SEU_TOKEN_AQUI';

async function testInstagramApi() {
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, insira um Token de Acesso do Usuário válido na variável USER_ACCESS_TOKEN.');
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
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN === 'COLE_SEU_TOKEN_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, insira um Token de Acesso do Usuário válido na variável USER_ACCESS_TOKEN.');
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
