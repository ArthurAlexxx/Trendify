# Trendify - Variáveis de Ambiente

Este arquivo documenta todas as variáveis de ambiente necessárias para executar e implantar o projeto na Vercel.

## Configuração do Firebase

Estas variáveis são necessárias para conectar o aplicativo aos serviços do Firebase.

### Lado do Cliente (Client-Side)

Adicione estas variáveis de ambiente no seu projeto Vercel com o prefixo `NEXT_PUBLIC_`.

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Lado do Servidor (Server-Side)

Esta variável contém as credenciais para o SDK Admin do Firebase, permitindo que o backend execute ações privilegiadas.

-   **`GOOGLE_APPLICATION_CREDENTIALS_JSON`**: O conteúdo completo do seu arquivo JSON de credenciais de conta de serviço do Firebase. Você deve copiar todo o conteúdo do arquivo JSON e colá-lo como o valor desta variável na Vercel.

**Como obter as credenciais:**
1.  Vá para o Console do Firebase, selecione seu projeto.
2.  Clique na engrenagem de **Configurações do projeto** > **Contas de serviço**.
3.  Clique em **Gerar nova chave privada**. Um arquivo JSON será baixado.
4.  Copie o conteúdo completo desse arquivo JSON e cole no valor da variável `GOOGLE_APPLICATION_CREDENTIALS_JSON` nas configurações da Vercel.

---

## Gateway de Pagamento (Abacate Pay)

Estas chaves são usadas para integrar o sistema de pagamento PIX.

```
ABACATE_API_KEY=
ABACATE_WEBHOOK_SECRET=
```

-   **`ABACATE_API_KEY`**: Sua chave de API secreta fornecida pelo Abacate Pay.
-   **`ABACATE_WEBHOOK_SECRET`**: Seu segredo de webhook para verificar a autenticidade das notificações de pagamento.

---

## Inteligência Artificial (OpenAI)

Esta chave é necessária para as funcionalidades de geração de conteúdo por IA.

```
OPENAI_API_KEY=
```

-   **`OPENAI_API_KEY`**: Sua chave de API da OpenAI.

---

## Resumo

Para que a aplicação funcione completamente na Vercel, certifique-se de que todas as 9 variáveis acima estejam configuradas corretamente nas **Environment Variables** do seu projeto.
