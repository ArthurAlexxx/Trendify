
// Este é um script de teste para depurar a chamada à API do Instagram Graph.
// Para usar:
// 1. Obtenha um Token de Acesso do Usuário válido na ferramenta de Exploração da Graph API.
//    (https://developers.facebook.com/tools/explorer/)
//    - Selecione seu App da Meta no menu suspenso.
//    - No menu "Permissões", adicione todas que seu app precisa (ex: instagram_business_basic, instagram_manage_insights, etc.).
//    - Clique em "Gerar Token de Acesso".
// 2. Cole o token gerado na variável `USER_ACCESS_TOKEN` abaixo.
// 3. Abra o terminal e execute o script com: node workspace/instagram-test.js

const USER_ACCESS_TOKEN = 'COLE_SEU_TOKEN_DE_ACESSO_DE_LONGA_DURACAO_AQUI';

async function testInstagramApi() {
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN.startsWith('COLE_SEU_TOKEN')) {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, insira um Token de Acesso do Usuário válido na variável USER_ACCESS_TOKEN.');
    return;
  }

  console.log('Iniciando teste com a API do Instagram Graph...');
  
  // Este endpoint busca o perfil do usuário logado na API do Instagram.
  // É o primeiro passo para verificar se o token é válido e tem a permissão 'instagram_business_basic'.
  const url = `https://graph.instagram.com/me?fields=id,username,account_type,followers_count&access_token=${USER_ACCESS_TOKEN}`;

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
      if (data.account_type === 'BUSINESS' || data.account_type === 'CREATOR') {
          console.log(`-> Tipo de conta: ${data.account_type}. Correto para a integração.`);
      } else {
          console.warn('\x1b[33m%s\x1b[0m', `AVISO: A conta é do tipo "${data.account_type}". A integração exige uma conta "BUSINESS" ou "CREATOR".`);
      }
    } else {
        console.warn('\x1b[33m%s\x1b[0m', 'AVISO: A resposta não contém os dados esperados (id, username). Verifique se o token tem as permissões corretas (pelo menos instagram_business_basic).');
    }

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Ocorreu um erro crítico durante a requisição:', error);
  }
}

testInstagramApi();
