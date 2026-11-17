# Configuração de 14/11/2026

## E-mail e contas

- SMTP Gmail configurado no Supabase usando senha de app, sem contratar provedor pago. Autenticação SMTP validada por TLS.
- E-mail de recuperação enviado com autorização explícita para `angelycarodrigues11@gmail.com`; entrega confirmada na caixa de entrada pelo assunto **Redefina sua senha · Future Academy**.
- Templates de confirmação, recuperação, magic link e alteração de e-mail em português, aplicados ao projeto remoto.
- Recuperação por código implementada para permitir outro navegador. Dois novos testes Playwright confirmam mudança de senha e login com a senha nova em desktop e celular, usando contas locais descartáveis.
- O login consulta os provedores habilitados no Supabase. Google/Facebook só aparecem quando o respectivo aplicativo OAuth estiver configurado; não apresentar botões que levam a serviços desabilitados.
- Faltam os IDs/segredos Google/Facebook. Instruções em [LOGIN-SOCIAL.md](LOGIN-SOCIAL.md). O navegador não pôde ser controlado devido à falha de captura de tela; não foi possível criar esses aplicativos automaticamente.

## Stripe e Pro

- Conta real `acct_1Rv5j4JEa1tQhhjY`: Brasil, BRL, recebimentos e repasses habilitados, nenhuma exigência cadastral pendente retornada pela API.
- Produto/Price real de R$ 25/mês: `price_1UbZ1PJEa1tQhhjYeZgWj2II`.
- Webhook real preparado: `we_1UbZ1RJEa1tQhhjY1UlGp5NT`. Mantido desabilitado enquanto a aplicação ainda usa a chave de teste, para não receber eventos com um segredo divergente.
- Portal real dedicado ao Future Academy: `bpc_1UbZ1TJEa1tQhhjYq20xVNmw`, com cancelamento ao fim do período, atualização de pagamento e histórico de faturas. O backend agora aceita `STRIPE_PORTAL_CONFIGURATION_ID` para não usar acidentalmente o portal de outro produto da conta.
- Chave OpenAI validada com consulta de modelos, sem gerar conteúdo pago. Modelo configurado encontrado.
- Teste Stripe integrado concluído com relógio de teste: pagamento inicial, webhook assinado concedendo Pro, renovação, cancelamento ao fim do período, falha no pagamento removendo Pro, assinatura inválida e repetição de evento fora de ordem. Recursos financeiros temporários foram removidos. Nenhum pagamento real foi realizado.
- Falta a chave real `sk_live_…` em `STRIPE_LIVE_SECRET_KEY` no `.env.credentials`.

## Ativação real após salvar a chave

1. `node scripts/configure-live-billing.mjs`: valida a conta, preço, portal e OpenAI e salva apenas variáveis Production na Vercel, com vendas ainda desligadas.
2. `vercel deploy --prod --yes`: publica as credenciais reais com compras desativadas.
3. `node scripts/configure-live-billing.mjs --activate`: confirma que o endpoint publicado aceita o segredo real, habilita o webhook Stripe e prepara `ENABLE_PAID_AI=true`.
4. `vercel deploy --prod --yes`: ativa vendas e tutor pago. A OpenAI cobra consumo conforme uso; a escolha de preparar vendas reais foi informada e autorizada pelo responsável. Nenhum cartão deve ser cobrado para teste em modo real.
5. Validar exibição de R$ 25/mês e checkout/portal sem completar pagamento real. Desativar o webhook de sandbox apontado ao mesmo domínio, pois produção passará a usar segredo real. Para novos testes integrados, usar um ambiente de teste separado.

Os arquivos `.env.credentials` e `.env.billing-live` estão ignorados pelo Git e pelo deploy, com permissões locais restritas. O SMTP fica no Supabase; sua senha não vai para o frontend ou para a Vercel.

## Validação

- 54 testes locais passaram.
- Build passou.
- 8 Playwright locais passaram.
- Ciclo integrado Stripe passou em sandbox.
- A infraestrutura de banco e hospedagem permanece nas opções gratuitas. Pro/OpenAI reais ainda dependem da chave real e dos passos de ativação acima.

## Publicação das melhorias

Publicado o deployment `dpl_FeCvPrbfDkScSt48eSnQ8xLEqBKc` em https://future-academy-six.vercel.app, incluindo recuperação por código, provedores sociais condicionados à configuração remota e suporte a portal Stripe dedicado. A produção continua com chave de teste e vendas desligadas: a chave real ainda não foi encontrada nos arquivos salvos. O usuário informou que ainda não possui os aplicativos Google/Facebook; o guia foi aberto no editor.
