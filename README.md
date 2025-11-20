# Trendify - Configurações de Ambiente e Produção

Este arquivo documenta as variáveis de ambiente e URLs necessárias para configurar e implantar o projeto na Vercel.

## URLs de Produção

- **Domínio Principal**: `https://trendify-beta.vercel.app`
- **URL do Webhook (Abacate Pay)**: `https://trendify-beta.vercel.app/api/webhooks/abacate-pay`

A URL do webhook deve ser configurada no painel da Abacate Pay para que o sistema possa receber notificações de pagamento e atualizar as assinaturas dos usuários automaticamente.

## Domínios Autorizados no Firebase

Para que o login funcione no seu domínio de produção, adicione `trendify-beta.vercel.app` à lista de "Domínios autorizados" nas configurações de Autenticação do seu projeto Firebase.

---

## Variáveis de Ambiente (Vercel)

As seguintes variáveis precisam ser configuradas nas **Environment Variables** do seu projeto na Vercel.

### Configuração do Firebase (Cliente)
Chaves públicas para conectar o frontend ao Firebase.

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Configuração do Firebase (Servidor)
Credencial de serviço para o backend se comunicar com o Firebase.

- **`GOOGLE_APPLICATION_CREDENTIALS_JSON`**: Cole o conteúdo completo do seu arquivo JSON de credenciais da conta de serviço do Firebase aqui.

### Gateway de Pagamento (Abacate Pay)
Chaves secretas para a integração de pagamentos PIX.

```
ABACATE_API_KEY=
ABACATE_PUBLIC_KEY=
```

### Inteligência Artificial (OpenAI)
Chave para as funcionalidades de IA.

```
OPENAI_API_KEY=
```
