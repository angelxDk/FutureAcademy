# Foundation — entrega local em 16/11/2026

## Publicação em 17/11/2026

- Migrações `202611130001` e `202611160001` confirmadas no histórico remoto do projeto `unjaamgdenspepspxzle`; nenhuma alteração ou reset do banco remoto foi necessário nesta publicação.
- Deployment `dpl_97EQAKZ2qcM32XuTjeVGWK3cBpsD` construído com variáveis Production, validado antes da promoção e promovido a `https://future-academy-six.vercel.app`.
- Validação local: 11 testes Node/PostgreSQL, 81 Vitest e 18 Playwright passaram, incluindo jornadas autenticadas em Supabase local isolado, desktop e celular. Tipagem e build passaram. A build local foi gerada novamente após o ensaio isolado.
- Auditoria npm completa sem vulnerabilidades reportadas. O patch local do picomatch tem testes de execução limitada e compatibilidade; detalhes em `vendor/picomatch/SECURITY-PATCH.md`. A auditoria isoladamente não comprova a correção do fork.
- Verificação do deployment antes da promoção: health saudável, manifesto PWA correto e API recusando acesso sem autenticação com HTTP 401.
- Permanecem os avisos de chunks grandes das bibliotecas existentes. Esta publicação não configura OAuth social nem ativa cobrança real.

O restante deste documento registra a implementação e a validação original da entrega local.

A Fase 01 prepara a aplicação existente para a evolução descrita no
[roteiro Academic OS](ACADEMIC-OS.md). A base continua em Vue 3, Pinia, Express e
Supabase Auth/PostgreSQL. Esta alteração não publica a aplicação nem modifica o
banco remoto.

## TypeScript

`npm run typecheck` executa `vue-tsc --noEmit` com `strict: true`. O build executa a
mesma checagem antes de gerar os arquivos. Foram migrados:

- `src/auth.ts` e `src/services/supabase.ts`: sessão, provedores e identidade;
- `src/services/api.ts`: chamadas autenticadas;
- `src/types/academic.ts`: JSON, coleções, entradas discriminadas e limites;
- `src/utils/snapshotValidation.ts`, `persistence.ts` e `backup.ts`: validação,
  codificação por item e recuperação;
- `src/services/cloudPersistence.ts`: contrato RPC e revisões;
- `src/components/PwaStatus.vue`: instalação e atualização.

A migração é incremental. `allowJs: true` mantém a interoperabilidade;
`checkJs: false` significa que stores, componentes antigos e backend JavaScript
ainda não recebem a mesma verificação estrita. As próximas mudanças devem migrar
um módulo por vez, com seus contratos, sem recorrer a `any` ou `@ts-ignore`.
Essa estratégia é suportada pela documentação de
[TypeScript](https://www.typescriptlang.org/tsconfig/allowJs.html) e
[Vue](https://vuejs.org/guide/typescript/overview.html).

## Persistência e isolamento

As coleções e os rascunhos continuam separados em entradas; configurações ficam em
entradas próprias. O adaptador envia apenas diferenças, exige a revisão esperada e
mantém uma baseline independente por conta. Leituras antigas não substituem a
baseline de uma leitura mais recente. Uma revisão sem baseline, após início sem
rede, exige leitura remota antes de calcular exclusões.
O logout ou a troca de identidade libera a baseline em memória e impede que
respostas antigas voltem a preenchê-la.

O store separa as operações por geração de sessão. Ao mudar de conta, limpa os dados
visíveis antes de carregar a nova conta; respostas de uma sessão anterior não
alteram a fila, revisão ou estado da atual. Carregamentos fora de ordem também são
descartados.

Validação ocorre antes de hidratar stores e antes de codificar dados. Ela rejeita
coleções com IDs vazios/duplicados, campos estruturais inválidos, chaves de
protótipo, valores fora de JSON e profundidade excessiva. Backups mantêm o formato
v1. Snapshots parciais legados continuam legíveis. Isso valida o contrato estrutural;
a revisão pedagógica e a sanitização do conteúdo no editor são responsabilidades
distintas.

O limite legado de 450 alterações, herdado da implementação Firestore, passa a
**10.000 alterações e 20 MiB por transação**, mantendo o limite de 800.000 bytes por
entrada. PostgreSQL confere os limites novamente e desfaz toda a transação em caso
de falha. A medição final de bytes usa a representação JSONB do banco; gateways da
hospedagem podem impor limites adicionais. Isso não elimina o carregamento integral
da biblioteca nem o lock global do beta: paginação e acesso indexado por domínio
devem anteceder acervos muito maiores.

A cópia de recuperação continua em `localStorage`, por conta, sem migração
destrutiva para IndexedDB. Quota, limpeza pelo navegador e uso de computador
compartilhado continuam sendo limitações: o logout limpa as lojas em memória, mas
preserva a cópia local para recuperação. O service worker não guarda essa cópia.
Exportação e resolução explícita de conflito continuam disponíveis.

## Segurança das chamadas

O cliente só envia o token a caminhos `/api/` da mesma origem, recusa
redirecionamentos e usa `cache: 'no-store'`. Se a identidade mudar durante a
obtenção do token, cancela a chamada; uma renovação da mesma conta continua válida.
As proteções existentes no servidor — verificação de token, cotas, service role
restrito e RPCs vinculadas à identidade — foram preservadas.

## PWA

O build gera `manifest.webmanifest`, `sw.js`, Workbox e ícones próprios de 192/512
pixels, incluindo versão maskable. A instalação aparece quando o navegador emite
`beforeinstallprompt`; nos demais, use a opção de adicionar à tela inicial do
próprio navegador. Exige HTTPS em produção; localhost é suficiente para testar.

O precache contém somente arquivos públicos da build. Não há cache de APIs,
respostas Supabase, mensagens, PDFs importados, tokens ou documentos pessoais.
Modelos de IA, workers pesados e dicionários permanecem fora do precache da PWA;
seus mecanismos existentes de download são independentes. Fontes e ícones MDI
externos dependem da rede/cache normal do navegador.

O shell e páginas públicas podem reabrir sem rede depois da primeira instalação
do service worker. Login, recuperação de senha, APIs e sincronização continuam
dependendo da conexão. A cópia acadêmica local existente é independente desse cache;
esta fase não garante todas as jornadas autenticadas offline.

Atualizações mostram um aviso e só são ativadas após clique. A aplicação tenta
sincronizar antes de atualizar e bloqueia a ação enquanto houver alterações
pendentes. Outras abas precisam ter suas próprias alterações salvas. O worker fica
desabilitado em `npm run dev`; teste a build com `npm run preview`.

Referências de implementação:
[precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache.html) e
[atualização solicitada](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).

## Verificação e publicação

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Os testes cobrem isolamento PostgreSQL, atomicidade, restauração de 600 registros,
limites, alterações concorrentes, troca de conta, validação de backups, destino do
token, manifesto, instalação e reabertura do shell sem rede. Jornadas autenticadas
completas usam exclusivamente Supabase local, conforme o guia de migração.

Verificação desta entrega: **8 testes Node/PostgreSQL e 70 testes Vitest passaram**;
tipagem e build passaram; **12 testes Playwright passaram**, incluindo cadastro,
recuperação, sincronização entre navegadores, exportação e exclusão de conta de
teste, além das verificações PWA em desktop e celular. A atualização foi verificada
também em componente, incluindo bloqueio com gravação pendente e ordem de
sincronização/ativação. A migração nova foi aplicada apenas ao Supabase local,
sem reset. A build ainda avisa sobre chunks grandes das bibliotecas existentes;
os maiores de IA e importação ficam fora do precache da PWA.

Antes de publicar a nova build, aplicar **todas** as migrações em ordem, incluindo
`supabase/migrations/202611160001_foundation.sql`, pelo fluxo de migração do projeto.
A nova migração substitui apenas a função de gravação e não apaga dados. Sem ela,
o banco remoto ainda recusará mais de 450 alterações. Para teste isolado, use
`npx supabase start` e aplique as migrações localmente. Não executar reset no remoto.

Validar o preview com a configuração correta antes de promovê-lo. O build de teste
local pode conter o endereço do Supabase local e deve ser substituído pelo build
do ambiente de destino antes de qualquer publicação.

## Acesso de contas importadas

Senhas Firebase não foram transferidas para Supabase. Para uma conta importada,
use **Esqueci minha senha**, abra o e-mail recebido e defina uma nova senha.
Cadastrar o mesmo endereço novamente não substitui a senha da conta existente.

O formulário agora mantém os erros e os próximos passos visíveis. Cadastros que
exigem confirmação permitem reenviar o e-mail para o mesmo endereço informado;
após pedir recuperação, há um link para inserir o código em `/redefinir-senha`,
inclusive no localhost. A resposta pública não revela se um endereço tem conta.
Os testes de navegador também cobrem confirmação obrigatória com respostas HTTP
simuladas, sem enviar e-mails reais. Isso complementa a jornada autenticada local,
cujo servidor de teste dispensa confirmação; não comprova entrega SMTP em produção.
