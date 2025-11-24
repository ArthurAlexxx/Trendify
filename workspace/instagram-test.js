
// Este é um script de teste para depurar a chamada à API do Facebook Graph.
// Para usar:
// 1. Obtenha um Token de Acesso do Usuário válido na ferramenta de Exploração da Graph API.
//    (https://developers.facebook.com/tools/explorer/)
//    Certifique-se de selecionar TODAS as permissões necessárias.
// 2. Cole o token na variável `USER_ACCESS_TOKEN` abaixo.
// 3. Execute o script em seu terminal com: node workspace/instagram-test.js

const USER_ACCESS_TOKEN = 'COLE_SEU_TOKEN_DE_ACESSO_DE_USUARIO_AQUI';

async function testInstagramApi() {
  if (!USER_ACCESS_TOKEN || USER_ACCESS_TOKEN === 'COLE_SEU_TOKEN_DE_ACESSO_DE_USUARIO_AQUI') {
    console.error('\x1b[31m%s\x1b[0m', 'ERRO: Por favor, insira um Token de Acesso do Usuário válido na variável USER_ACCESS_TOKEN.');
    return;
  }

  console.log('Iniciando teste com a API da Meta...');

  const url = `https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,instagram_business_account{name,username}&access_token=${USER_ACCESS_TOKEN}`;

  try {
    console.log(`\nFazendo requisição para: ${url.replace(USER_ACCESS_TOKEN, '[TOKEN_OMITIDO]')}\n`);

    const response = await fetch(url);
    const data = await response.json();

    console.log('\x1b[32m%s\x1b[0m', '--- RESPOSTA DA API DA META ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('\x1b[32m%s\x1b[0m', '----------------------------\n');

    if (data.error) {
      console.error('\x1b[31m%s\x1b[0m', `A API retornou um erro: ${data.error.message}`);
    } else if (!data.data || data.data.length === 0) {
      console.warn('\x1b[33m%s\x1b[0m', 'AVISO: A API retornou uma lista de páginas vazia (`data: []`).');
      console.log('Isso geralmente significa que a permissão para acessar a Página do Facebook específica não foi concedida durante o fluxo de login, mesmo que outras permissões tenham sido aceitas.');
      console.log('Solução: Remova a integração "Trendify" das suas "Integrações Comerciais" no Facebook e tente novamente, garantindo que você clique em "Editar Acesso" e selecione "Todas as Páginas".');
    } else {
      console.log('\x1b[32m%s\x1b[0m', `SUCESSO: ${data.data.length} página(s) encontrada(s).`);
      const pageWithIg = data.data.find((page) => page.instagram_business_account);
      if (pageWithIg) {
        console.log(`-> Página encontrada com Instagram vinculado: "${pageWithIg.name}" (ID: ${pageWithIg.id})`);
        console.log(`-> Conta do Instagram: @${pageWithIg.instagram_business_account.username} (ID: ${pageWithIg.instagram_business_account.id})`);
      } else {
        console.warn('\x1b[33m%s\x1b[0m', 'AVISO: Nenhuma das páginas retornadas parece ter uma conta do Instagram Business vinculada.');
      }
    }

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Ocorreu um erro crítico durante a requisição:', error);
  }
}

testInstagramApi();
