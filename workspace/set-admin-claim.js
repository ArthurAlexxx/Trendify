
// Este script permite definir um custom claim `role: 'admin'` para um usuário do Firebase.
// É uma operação de back-end que usa o Firebase Admin SDK.

// 1. **Instale as dependências (se ainda não tiver):**
//    No terminal, na raiz do seu projeto, execute:
//    npm install firebase-admin dotenv

// 2. **Configure suas credenciais de administrador:**
//    - Vá para o seu projeto no Console do Firebase.
//    - Clique no ícone de engrenagem > "Configurações do projeto" > Aba "Contas de serviço".
//    - Clique em "Gerar nova chave privada" e salve o arquivo JSON que será baixado.
//    - Renomeie este arquivo para "service-account.json" e coloque-o na pasta `workspace`.
//    - IMPORTANTE: Nunca exponha este arquivo publicamente. Adicione `workspace/service-account.json` ao seu `.gitignore`.

// 3. **Defina o UID do usuário:**
//    - Altere a constante `USER_UID_TO_MAKE_ADMIN` abaixo para o UID do usuário que você quer tornar administrador.
//    - O seu UID, baseado nos erros anteriores, é: "eVwzpLgmRQbsG5o8ZDcclPbQiwt1"

// 4. **Execute o script:**
//    - No terminal, execute o seguinte comando:
//      node workspace/set-admin-claim.js

const admin = require('firebase-admin');

// --- CONFIGURE AQUI ---
const USER_UID_TO_MAKE_ADMIN = 'eVwzpLgmRQbsG5o8ZDcclPbQiwt1'; // Ex: 'eVwzpLgmRQbsG5o8ZDcclPbQiwt1'
// --------------------

try {
  // Carrega as credenciais do arquivo que você baixou
  const serviceAccount = require('./service-account.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  if (USER_UID_TO_MAKE_ADMIN === 'COLE_O_UID_DO_USUÁRIO_AQUI' || !USER_UID_TO_MAKE_ADMIN) {
    throw new Error('Por favor, defina a constante USER_UID_TO_MAKE_ADMIN no script.');
  }

  console.log(`Definindo permissão de admin para o usuário com UID: ${USER_UID_TO_MAKE_ADMIN}...`);

  // Define o custom claim { role: 'admin' } para o usuário especificado
  admin.auth().setCustomUserClaims(USER_UID_TO_MAKE_ADMIN, { role: 'admin' })
    .then(() => {
      console.log('\x1b[32m%s\x1b[0m', `✅ Sucesso! O usuário agora é um administrador.`);
      console.log('Faça logout e login novamente no aplicativo para que as novas permissões tenham efeito.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\x1b[31m%s\x1b[0m', '❌ Erro ao definir o custom claim:', error.message);
      process.exit(1);
    });

} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('\x1b[31m%s\x1b[0m', '❌ ERRO: Arquivo "workspace/service-account.json" não encontrado.');
    console.log('Por favor, siga os passos no topo do script para configurar suas credenciais de administrador.');
  } else {
    console.error('\x1b[31m%s\x1b[0m', '❌ Ocorreu um erro inesperado:', error.message);
  }
  process.exit(1);
}
