> **Atualização:** o usuário solicitou sair do Firebase sem ativar faturamento. O código local foi migrado para Supabase; veja [MIGRACAO-SUPABASE.md](MIGRACAO-SUPABASE.md). O registro abaixo descreve a configuração anterior e não significa que a migração remota já foi concluída.

# Estado das integrações — 13/11/2026

## Configurado

- Vercel: diretório vinculado a `angelxdks-projects/future-academy`; URL `https://future-academy-six.vercel.app`.
- Firebase: projeto `future-academy-c97db`, domínio Vercel autorizado e autenticação por e-mail habilitada.
- Backend Firebase: conta `future-academy-backend@future-academy-c97db.iam.gserviceaccount.com`, com `roles/datastore.user` e papel customizado limitado a consultar/excluir usuários. Credencial salva apenas no `.env` ignorado e como segredo na Vercel. Conexão Firebase Admin validada.
- Vercel, ambientes Production/Preview/Development: `APP_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `ENABLE_PAID_AI=false`, `VITE_DISABLE_FIRESTORE=true`, `VITE_SUPPORT_EMAIL`, `STRIPE_PRO_PRICE_ID` e `STRIPE_WEBHOOK_SECRET` configurados.
- Stripe CLI e plugin do agente instalados. CLI selecionada no ambiente de teste `acct_1RvfLgDxYJF5aMft`.
- Stripe teste: produto `prod_VchARRXeuPpEZA`; preço `price_1UbRmUDxYJF5aMftXgOJ3GCr`, BRL 25/mês, recorrência mensal assumida e comunicada ao usuário.
- Webhook teste `we_1UbRmVDxYJF5aMft5JMK7SsV`: `/api/stripe-webhook`, com os seis eventos documentados em LANCAMENTO.md; segredo salvo no `.env` e na Vercel.
- Portal teste `bpc_1UbRmXDxYJF5aMftD3RsEx0u`: atualização do pagamento, histórico de faturas e cancelamento ao fim do período.
- Sandbox adicional `acct_1UbRjbJT6jTd0Xjc` criado como “Future Academy desenvolvimento”, mas não autorizado na CLI nem usado para o produto acima.

## Bloqueios reais

1. O banco existente `default` (sem parênteses), em `nam5`, é Enterprise/MongoDB: `firestoreDataAccessMode=DATA_ACCESS_MODE_DISABLED` e `realtimeUpdatesMode=REALTIME_UPDATES_MODE_DISABLED`. Ele não atende ao SDK usado pelo aplicativo. A consulta ao banco `(default)` retorna 404. Criá-lo em São Paulo foi recusado por faturamento desativado. As duas contas de faturamento visíveis estão fechadas; o responsável precisa reativar uma conta ou vincular outra ativa. O banco existente não foi excluído ou convertido.
2. A tentativa de publicar no banco Enterprise foi recusada: Enterprise não suporta a configuração de índice necessária. As regras/índices não estão confirmados como publicados. Após criar o banco Standard `(default)`, executar `firebase deploy --only firestore:rules,firestore:indexes --project future-academy-c97db`. A configuração local continua apontando ao banco padrão do SDK.
3. `STRIPE_SECRET_KEY` salva pelo usuário no `.env`, validada pela API para `acct_1RvfLgDxYJF5aMft` e configurada como segredo na Vercel nos três ambientes. A API confirmou o preço de BRL 25/mês em teste e o endpoint de webhook habilitado. Não colocar a chave no chat ou no Git.
4. Manter `ENABLE_PAID_AI=false` até validar a chave de IA e concluir um ciclo real de assinatura de teste, incluindo webhook, renovação, cancelamento e falha de pagamento. A chave OpenAI está presente, mas não foi testada na API nesta configuração. Spotify e câmbio ainda têm placeholders locais.
5. Manter `VITE_DISABLE_FIRESTORE=true` até o banco e as regras estarem funcionais; depois alterar para `false` localmente e na hospedagem.
6. Nenhum novo deploy da aplicação foi realizado nesta configuração. Variáveis adicionadas à Vercel passam a valer em novos deployments. Publicar e executar smoke/jornada autenticada após resolver os bloqueios.

## Verificação

- `npm test`: 7 testes Node e 41 testes Vitest passaram.
- `npm run build`: passou.
- `npm run test:rules`: passou com o Java 21 existente em `/tmp/future-academy-java/jdk-21.0.13+9-jre/Contents/Home` no PATH. A primeira tentativa sem esse PATH falhou por ausência de Java.
- `npm run check:release`: bloqueado intencionalmente por `VITE_DISABLE_FIRESTORE=true`; ainda não representa uma aprovação de lançamento.
