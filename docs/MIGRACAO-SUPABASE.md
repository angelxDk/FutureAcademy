# Migração para Supabase Free

Estado em 13/11/2026: projeto remoto `unjaamgdenspepspxzle` criado em São Paulo na organização `sqftmmwdsvosrpalszqu`; migração SQL aplicada, quatro variáveis Supabase configuradas na Vercel e duas contas antigas importadas. Nenhuma conta de faturamento Google foi ativada. Publicado em https://future-academy-six.vercel.app, deployment `dpl_5jt7KFWokDKrF14Gxrw4Yyhi5bKf`. Smoke público passou para health, login, apresentação, privacidade e termos; a API rejeitou chamadas sem autenticação.

## Arquitetura

Supabase Auth substitui Firebase Authentication. PostgreSQL substitui Firestore. O navegador usa apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O backend usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. O nome ANON_KEY também aceita a chave pública publishable; SERVICE_ROLE_KEY aceita a chave secreta equivalente. Nunca colocar chave secreta em variável VITE_.

A migração `supabase/migrations/202611130001_app.sql` preserva os documentos JSON e o formato dos backups em PostgreSQL. A tabela tem RLS e nenhum acesso direto para usuários/visitantes. RPCs autenticadas limitam cada fichário à identidade da sessão. Grupos são consultados somente por participantes. Escritas administrativas ficam no servidor e na função `app_commit`, executável exclusivamente pelo service role. Um lock transacional e versões impedem perda de atualizações entre instâncias e gravações de dispositivos desatualizados. Esse lock é global para a aplicação e adequado ao beta pequeno; reavaliar antes de escalar.

O adaptador `server/documentStore.js` permite manter os controllers de cobrança, cotas, grupos e exclusão. Não depende de serviços ou SDKs Firebase. O chat consulta atualizações a cada cinco segundos enquanto a tela está aberta e visível; não depende do Realtime pago ou de websocket.

## Provisionamento e publicação

1. Conectar Supabase e escolher/criar uma organização no plano **Free**. Não fazer upgrade. Criar um projeto e aplicar o SQL da migração.
2. Configurar Site URL como `https://future-academy-six.vercel.app` e permitir o redirecionamento `/redefinir-senha`. Habilitar cadastro por e-mail com confirmação. Configurar Google/Facebook somente com credenciais OAuth próprias; o login Google da CLI anterior não configura esses provedores no aplicativo.
3. Preencher as quatro variáveis Supabase de `.env.example` no `.env` e na Vercel. O código não consulta as antigas credenciais Firebase.
4. Importar as duas contas exportadas com `npm run migrate:users`. O script lê por padrão o backup privado em `~/.local/share/future-academy-migration/firebase-users.json`, não envia e-mails e não remove usuários antigos.
5. As senhas Firebase SCRYPT não são copiadas para Supabase. Cada conta importada recebe senha aleatória não divulgada e deve usar **Esqueci minha senha**. Usuários antes não verificados continuam não verificados. Revisar confirmação de e-mail e entrega de recuperação antes do lançamento. O serviço de e-mail padrão do Supabase tem restrições; conferir SMTP/provedor antes de aceitar cadastros externos.
6. `app_metadata.legacy_uid`, gravado apenas pelo administrador, preserva o identificador antigo usado pelo cache local e pelos dados do Stripe. Contas novas usam UUID do Supabase. Nunca colocar esse mapeamento em user_metadata, controlável pelo cliente. O script recusa vincular uma conta existente sem mapeamento compatível.
7. O fichário local não é apagado. Na primeira leitura bem-sucedida sem snapshot remoto, o app preserva a cópia do usuário, redefine a revisão para zero e tenta enviá-la ao novo banco. Falhas de autenticação/rede não redefinem revisões. Se houver fichários em outros navegadores, exportar uma cópia em cada um antes da troca. Dados remotos do antigo banco MongoDB não foram exportados; ele permanece intacto.
8. Validar cadastro/login, confirmação, recuperação, isolamento de duas contas, escrita offline, conflito, grupos, exportação/exclusão e fluxo Stripe de teste. O produto de R$ 25/mês e seus recursos Stripe permanecem existentes. Manter `ENABLE_PAID_AI=false` até concluir o ensaio integrado.
9. Executar `npm run check:release`; publicar um preview, validar e só depois promover à produção. Remover variáveis Firebase da Vercel e revogar a conta de serviço Google apenas após concluir a migração e o período de recuperação. Não excluir o projeto antigo automaticamente.

## Testes

`npm test` inclui teste PostgreSQL real com PGlite (não é um mock SQL): aplica a migração, simula papéis e tokens, verifica isolamento, revisões, permissões de tabela/funções, mensagens de grupos, mapeamento legado, bloqueio após exclusão e compare-and-swap. `npm run test:rules` executa esse teste isoladamente, sem Java.

Para a jornada autenticada completa, é necessário Docker e Supabase local:

```sh
npx supabase start
npx supabase db reset --local
npm run test:e2e:full
```

O reset acima é exclusivamente local e apaga dados de teste. O runner recusa endereços fora de localhost, usa credenciais do projeto local e desativa Stripe/IA pagos. O Docker foi iniciado e o Supabase local provisionado; a migração SQL foi aplicada e os seis testes Playwright passaram, incluindo cadastro, gravação de matéria/anotação, leitura em outro contexto de navegador, exportação e exclusão de conta em desktop e celular. O primeiro ensaio detectou hidratação duplicada em eventos de login; o store agora carrega uma vez por conta, com teste de regressão. O login remoto da CLI foi concluído. O banco remoto também passou por testes reais de Auth, fichário privado, conflito, restrição de escritas administrativas, convites, mensagens e revogação de acesso. As duas contas temporárias foram removidas pela API de exclusão do aplicativo; as duas contas importadas foram preservadas. `npm run test:e2e` verifica também as páginas públicas sem credenciais.

O plano Free tem cotas e pode pausar projetos com pouca atividade após sete dias. Essa é uma limitação operacional; não habilitar cobrança para contorná-la sem instrução do responsável.

## Resultado da publicação

- Preview `dpl_7D1fp9JBMECvwsLcN3xbctPFVf7C`: health, rejeição de acesso anônimo, cobrança autenticada no plano gratuito e exclusão autenticada de conta temporária passaram.
- Produção `dpl_5jt7KFWokDKrF14Gxrw4Yyhi5bKf`: publicada no domínio principal; smoke público completo passou.
- 54 testes locais (8 Node/PostgreSQL e 46 Vitest), build e seis Playwright autenticados/públicos passaram. Auditoria de dependências de produção sem vulnerabilidades.
- Restaram somente as duas contas importadas no Supabase; contas e documentos temporários de QA foram removidos. Nenhum fichário de usuário foi enviado pelo agente: as cópias locais serão sincronizadas pelo próprio app após o novo login.
- Supabase local usado nos testes foi parado, com volumes de teste preservados. Nenhuma conta de faturamento Google foi ativada. O projeto Firebase antigo e suas credenciais históricas permanecem preservados para recuperação; a aplicação publicada não os utiliza.
- SMTP externo e provedores Google/Facebook não foram configurados. A entrega de recuperação/confirmação depende das restrições do serviço de e-mail padrão do Supabase e precisa de validação do responsável. Nenhum e-mail foi enviado automaticamente pelo agente.
