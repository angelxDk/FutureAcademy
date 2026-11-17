I# Concluir login Google e Facebook

Esses provedores exigem um aplicativo OAuth próprio; o login nas CLIs não cria esse aplicativo. Não é necessário ativar o faturamento Google.

## Google

1. Abrir https://console.cloud.google.com/auth/clients?project=future-academy-c97db . Usar o projeto existente apenas para registrar OAuth, sem banco nem faturamento.
2. Se a plataforma pedir, configurar nome **Future Academy**, e-mail de suporte `angelycarodrigues11@gmail.com` e público externo. Usar somente escopos básicos de identidade (openid, e-mail e perfil).
3. Criar cliente do tipo **Aplicativo da Web**, nome **Future Academy**.
4. Origem JavaScript autorizada: `https://future-academy-six.vercel.app`.
5. URI de redirecionamento autorizada: `https://unjaamgdenspepspxzle.supabase.co/auth/v1/callback`.
6. Salvar ID e segredo em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env.credentials` (arquivo ignorado pelo Git e pelo deploy). Se o app estiver em teste, cadastrar os e-mails permitidos; para acesso público, concluir a configuração exigida pelo Google.

## Facebook

1. Abrir https://developers.facebook.com/apps/ . Criar/configurar um app com Facebook Login para autenticação.
2. Site: `https://future-academy-six.vercel.app`. Política de privacidade: `/privacidade`; termos: `/termos`. Não inventar dados empresariais, fiscais ou de verificação solicitados pela Meta.
3. Valid OAuth Redirect URI: `https://unjaamgdenspepspxzle.supabase.co/auth/v1/callback`.
4. Salvar App ID e App Secret nos campos `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET` no `.env.credentials`.
5. Concluir os requisitos de publicação solicitados pela Meta. Enquanto estiver em desenvolvimento, somente papéis/testadores autorizados poderão entrar.

Depois executar `node scripts/configure-auth.mjs`. O script aplica somente provedores com credenciais completas, além do SMTP e templates. A tela de login consulta os provedores habilitados no Supabase e mostra somente as opções disponíveis. Atualizar a página após habilitar um provedor.

O controle do navegador falhou na captura de tela nesta sessão; não foi possível criar os aplicativos OAuth automaticamente. Não compartilhar segredos no chat.
