> **Migração Supabase em andamento:** as instruções de Firebase deste documento pertencem à arquitetura anterior. Para a versão local atual, consulte [MIGRACAO-SUPABASE.md](MIGRACAO-SUPABASE.md). Os critérios de produto, segurança e cobrança continuam aplicáveis.

# Future Academy — preparação do lançamento

## Produto e modelo comercial

Freemium definido em 13/11/2026. Contato de suporte: angelycarodrigues11@gmail.com.

O gratuito inclui matérias, grade, agenda, caderno, mesa de estudo, grupos, sons de foco e IA local. O Pro acrescenta o tutor na nuvem, sem download de modelo, limitado a 20 solicitações por dia UTC. Solicitações que falham também consomem a cota de proteção da API. O preço, moeda e recorrência vêm de um Price recorrente do Stripe e são exibidos no perfil antes do checkout. Não há preço arbitrário embutido no código.

A contratação fica indisponível enquanto faltarem Stripe, webhook, URL pública e IA paga. Não foi criada conta no Stripe, contratado serviço, lançado produto financeiro nem processada cobrança durante a implementação.

## O que está implementado

- Verificação de token Firebase com checagem de revogação em todas as APIs de integração; sem bypass em produção.
- Cotas transacionais no Firestore: 30 requisições/minuto, 1.000/dia e 20 solicitações/dia para IA paga, por usuário.
- Modelo de IA definido pelo servidor; saída limitada a 1.024 tokens; limites de entrada e timeouts.
- Um código de controller para Express e Vercel, incluindo parser, Spotify, câmbio e IA.
- Acervo pessoal separado em documentos, migração da estrutura legada na primeira gravação, revisões otimistas e rejeição explícita de gravação desatualizada.
- Cópia local por usuário, estado visível de sincronização, repetição após erro/reconexão, exportação e restauração com validação.
- Recuperação de senha, envio de verificação e exclusão de conta com login recente e confirmação explícita. A exclusão cancela assinaturas antes de remover dados e conta; falhas podem ser retomadas. Um marcador técnico de exclusão bloqueia gravações tardias.
- Grupos compartilhados com convites para e-mails verificados (consumidos após adesão), mensagens em tempo real, remoção de participantes/mensagens e denúncias. Nenhum e-mail foi enviado automaticamente; o administrador compartilha o código.
- Checkout Stripe, portal, consulta/atualização de assinatura e webhook assinado. O plano não pode ser concedido pelo cliente nem pelo redirecionamento de sucesso.
- Páginas públicas de apresentação, termos e privacidade; onboarding de três passos.
- Arte da entrada otimizada para WebP; movimento reduzido e foco visível.
- Monitoramento Sentry opcional com filtragem por lista permitida, sem texto de trabalhos/conversas, credenciais ou identificação da conta.
- CI de testes/build/regras/navegador e verificação periódica de produção quando APP_URL estiver configurada nas variáveis do GitHub.

## Configuração antes de publicar

1. Usar Node 24 LTS. Preencher as variáveis de `.env.example` na hospedagem; nunca compartilhar as credenciais nem usar prefixo VITE_ para segredos.
2. Configurar uma conta de serviço de privilégio mínimo para Firebase Admin. Usar `FIREBASE_SERVICE_ACCOUNT_JSON` somente no servidor ou Application Default Credentials. A conta deve poder verificar usuários, acessar os documentos necessários e excluir contas solicitadas pelo usuário.
3. Publicar regras e índices: `npx firebase deploy --only firestore:rules,firestore:indexes --project SEU_PROJETO`. Isso altera o projeto remoto: conferir o projeto e testar uma cópia antes da migração dos dados reais.
4. Fazer exportação do Firestore antes da migração. A primeira gravação converte o snapshot antigo em metadados e entradas. Não voltar o frontend antigo sobre dados convertidos. Rollback de código deve manter compatibilidade com schemaVersion 2 ou ser acompanhado de restauração coordenada.
5. Autorizar domínio no Firebase Auth, habilitar os provedores desejados, configurar templates e testar os e-mails de recuperação/verificação com conta real. Nenhum provedor externo foi validado em conta de produção. No ambiente local existente, VITE_DISABLE_FIRESTORE está ativado: remova essa desativação na configuração de lançamento depois de publicar e validar as regras.
6. Criar produto/Price recorrente no Stripe; configurar `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL` e `ENABLE_PAID_AI=true`. Começar por modo de teste. Habilitar Customer Portal e cancelamento ao fim do período. Revisar impostos, recibos, reembolso e informações do responsável antes de vender.
7. Cadastrar webhook HTTPS `/api/stripe-webhook`: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Testar assinatura inválida, duplicação, atraso, renovação, inadimplência e cancelamento. O webhook precisa receber os bytes originais do corpo.
8. Configurar Sentry frontend/backend e alertas de erro, disponibilidade e uso/custo dos provedores. O código prepara a integração; projetos e alertas externos ainda precisam ser ativados. Não habilitar coleta adicional de dados pessoais sem atualizar a política.
9. Definir o nome/identificação do responsável pelo serviço. O usuário forneceu o e-mail de suporte; não forneceu nome empresarial ou identificação. Os textos públicos são base operacional, não uma certificação de conformidade jurídica.
10. Configurar `APP_URL` nas variables do GitHub e notificações do workflow de smoke. Vincular o repositório à hospedagem para previews e promover à produção somente após os checks. Não há credenciais de deploy nem publicação externa realizada por esta implementação.

## Comandos de verificação

```sh
npm ci
npm test
npm run test:rules       # requer Java 21 e emulador Firestore
npx playwright install chromium
npm run test:e2e:full    # build demo + Auth/Firestore isolados + navegador desktop/mobile
npm run build           # voltar a gerar com o ambiente de produção após teste demo
npm run check:release   # presença/configuração de ambiente, sem imprimir valores de segredos
npm run smoke:production # usa APP_URL HTTPS; não substitui um fluxo autenticado
```

O projeto usa npm/package-lock como referência do CI. O bun.lock legado não é atualizado pelo npm.

## Critérios de aprovação do beta

- Criar duas contas reais e comprovar isolamento dos dados.
- Conferir importação de PDF e DOCX de pelo menos três instituições, corrigir a prévia e salvar a grade.
- Criar entrega com prazo, confirmar na agenda e concluir o trabalho.
- Escrever offline, recarregar, reconectar e conferir a sincronização.
- Editar a mesma conta em dois dispositivos e comprovar o conflito, a exportação das duas versões e a recuperação.
- Exportar um backup, restaurar em conta de teste e comparar notas, rascunhos, disciplinas e eventos.
- Aceitar convite com e-mail correto, rejeitar com e-mail diferente/não verificado, remover participante e conferir a perda de acesso.
- Executar fluxo de assinatura em modo de teste, renovar, cancelar, simular falha e excluir conta assinante. Não usar cartão real neste ensaio.
- Testar teclado, leitor de tela e aparelhos móveis modestos. Testes automatizados de viewport não equivalem a auditoria completa de acessibilidade ou desempenho.

## Operação e recuperação

- Acompanhar erros de gravação e conflitos; nunca orientar o aluno a apagar a cópia local antes de exportar.
- Para incidentes de IA, usar `ENABLE_PAID_AI=false`; o portal de cancelamento deve continuar disponível mesmo com novas compras desativadas.
- Habilitar backup/PITR na infraestrutura conforme orçamento e testar restauração em projeto separado. Esses recursos podem exigir plano pago e não foram ativados automaticamente.
- Excluir convites expirados e recibos técnicos de webhook conforme política de retenção. Configurar TTL para campos de expiração adequados ou um job de manutenção; não aplicar TTL ao acervo pessoal.
- Revisar `communityReports` no console administrativo com acesso restrito. Há registro e moderação pelo dono do grupo; ainda não há console de moderação da plataforma.
- Mensagens mostram as últimas 100 da conversa. Bibliotecas pessoais carregam o acervo completo; o schema agora suporta múltiplos documentos, mas paginação e sincronização incremental em bibliotecas muito grandes são uma evolução futura.
- Após aplicar `202611160001_foundation.sql`, há limite de 10.000 alterações e 20 MiB por transação, com 800.000 bytes por entrada. Sem essa migração, permanece o limite anterior de 450 alterações. A interface orienta exportar quando o conteúdo excede o limite; veja [FOUNDATION.md](FOUNDATION.md).
- Os cinco alertas moderados atuais do npm audit são dependências da ferramenta de desenvolvimento firebase-tools; executar auditoria novamente antes de cada release. A auditoria de produção deve permanecer sem alertas altos/críticos.

## Piloto com alunos

Convidar 10–20 estudantes por canais autorizados pelo responsável. Observar primeiro uso sem assistência e repetir após uma semana. Medir: conclusão do onboarding, primeira anotação salva, retorno semanal, falhas de sincronização, dúvidas recorrentes e disposição a pagar. Não foram inventados resultados de validação comercial. As métricas do piloto devem ser agregadas, e qualquer analytics de uso a adicionar deve ter finalidade e tratamento de dados definidos.

## Validação executada nesta implementação

- 48 testes de unidade/componentes (7 no runner Node e 41 no Vitest).
- Regras e persistência no emulador: isolamento de contas, revisão e migração, biblioteca acima de 1 MB em múltiplos documentos, rejeição de gravação desatualizada, remoção de notas, grupos/convites/cotas e bloqueio de gravação após início da exclusão.
- 6 testes Playwright entre desktop e celular. A jornada autenticada cria conta, matéria e anotação, confirma gravação, lê em outro contexto de navegador, exporta os dados e exclui a conta.
- Build de produção e auditoria das dependências de produção.
- O navegador detectou dois problemas corrigidos: o atraso de 500 ms antes da cópia local permitia perda em navegação rápida, e o player fixo cobria controles no celular.

Os testes de cobrança usam o SDK para assinar payloads de teste e doubles para as chamadas ao Stripe; nenhuma operação financeira real foi executada. O ensaio integrado no modo de teste do Stripe continua obrigatório antes de ativar vendas.
