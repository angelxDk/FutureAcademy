# Future Academy · Academic OS

Plano de evolução baseado no código local em 16/11/2026. A entrega autorizada deste
trabalho é a **Fase 01 — Foundation**. As fases seguintes são roteiro de produto e
engenharia; sua descrição não significa que já estejam implementadas.

## Ponto de partida

A proposta anexada consultou uma versão anterior do repositório. O código local já
usa Vue 3, Vite 8, Pinia, Tiptap 3 e Express, com **Supabase Auth e PostgreSQL**.
Não é necessário migrar para React, recriar a aplicação nem provisionar outro banco.

| Área | Evidência no código | Consequência para o plano |
| --- | --- | --- |
| Persistência modular | `src/utils/persistence.ts` separa disciplinas, horários, eventos, registros, sessões, comunidades e rascunhos; `src/services/cloudPersistence.ts` envia diferenças | Evoluir esse contrato e seus limites; não retornar ao snapshot remoto único |
| Banco e isolamento | `supabase/migrations/202611130001_app.sql` usa tabela privada com RLS, RPCs vinculadas à identidade e revisão transacional | Supabase/PostgreSQL é a base atual; o limite de documento do Firestore não é a restrição desta versão |
| Recuperação e conflitos | `src/stores/useSyncStore.js` mantém cópia por conta e trata conflito; `src/utils/backup.ts` valida importações | Preservar cópias locais e exigir recuperação explícita diante de alterações concorrentes |
| Tutor | `src/stores/useAssistantStore.js` usa WebLLM, Ollama ou nuvem e recebe trecho limitado de contexto | Há tutor com contexto, ainda sem pipeline RAG, índice semântico ou citação de trechos |
| Pesquisa | `src/components/ResearchLibrary.vue` busca metadados Crossref e salva referência no caderno | Expandir a biblioteca existente; metadados não equivalem ao texto integral do artigo |
| Colaboração | `src/components/SharedCommunities.vue` e `src/services/communitySubscriptions.js` implementam grupos e atualização periódica | Há chat compartilhado; edição simultânea CRDT e presença contínua continuam futuras |
| Observabilidade e proteção | `server/security.js`, `src/services/monitoring.js` e testes de segurança | Manter autenticação, cotas e rastreio ao conectar novos módulos |

Esta é uma análise de implementação local. Não atesta disponibilidade, configuração
de provedores, permissões ou comportamento da infraestrutura em produção. O estado
da migração e os procedimentos operacionais existentes estão em
[MIGRACAO-SUPABASE.md](MIGRACAO-SUPABASE.md) e [LANCAMENTO.md](LANCAMENTO.md).

## Fase 01 — Foundation

Objetivo: tornar o núcleo verificável e prepará-lo para módulos maiores, mantendo os
dados e as jornadas acadêmicas existentes.

| Frente | Critério de aceite |
| --- | --- |
| TypeScript | Contratos do núcleo tipados, comando de verificação reproduzível e migração incremental documentada, com indicação explícita do JavaScript ainda existente |
| Persistência | Separação por entidade preservada; versão/revisão, validação de payloads e isolamento de contas verificados; cópia local e exportação continuam disponíveis em falhas |
| Segurança | APIs autenticadas, operações limitadas por usuário, validação de entradas e ausência de dados privados no cache da PWA; testes locais de abuso e isolamento |
| PWA | Manifesto e ícones próprios, instalação nos navegadores compatíveis, atualização controlada e comportamento sem rede explícito, sem prometer sincronização offline inexistente |
| Validação | Tipagem, testes do núcleo, build e jornadas de navegador pertinentes executados; limitações observadas registradas |

**Registro da entrega local:** núcleo de autenticação, API e persistência migrado para TypeScript estrito; validação antes da hidratação; isolamento de cargas/gravações por sessão; limite transacional atualizado para 10 mil alterações/20 MiB; PWA com cache público e atualização solicitada pelo aluno. O restante dos stores, telas e backend segue em JavaScript. Consulte [FOUNDATION.md](FOUNDATION.md) para verificação, limites e publicação da nova migração. As fases 02–06 abaixo continuam planejadas.

Decisões de continuidade:

- Manter o monólito modular e os adaptadores atuais; não introduzir Kubernetes,
  microserviços ou Redis sem uma necessidade medida.
- Diferenciar cache de arquivos estáticos, cópia local de dados e sincronização
  remota. Instalação PWA por si só não oferece todas as jornadas sem rede.
- Não incluir bibliotecas das próximas fases antes de uma entrega que as utilize.
- Manter a identidade visual existente; Foundation não exige redesenhar as telas.

## Fase 02 — Intelligence

**Resultado esperado:** o aluno seleciona seus próprios materiais, encontra um trecho
e recebe uma explicação com referências navegáveis ao conteúdo usado.

Implementação em sequência:

1. Criar biblioteca de documentos vinculada a conta, disciplina e registro. Guardar
   origem, formato, versão, tamanho, data de importação e permissões.
2. Extrair texto de PDF/DOCX de forma isolada, com limites de tamanho e páginas;
   exibir os casos de arquivo digitalizado que exigem OCR.
3. Dividir conteúdo em trechos identificáveis e versionados. Remover ou invalidar
   índice e embeddings quando um documento for alterado ou excluído.
4. Entregar busca textual universal (`Cmd/Ctrl + K`) como base mensurável; avaliar
   embeddings locais e pgvector com um conjunto pequeno de consultas reais.
5. Integrar recuperação ao tutor existente, com escolha dos materiais, indicação
   de provedor e citações para documento, versão e trecho/página.
6. Expandir a pesquisa Crossref para fichamentos e referências ABNT/APA,
   distinguindo campos bibliográficos ausentes de dados confirmados.

**Aceite:** duas contas não encontram materiais uma da outra; exclusão elimina a
recuperação correspondente; cada citação abre o trecho usado; o tutor informa quando
os materiais não sustentam uma resposta. Uma avaliação fixa mede acerto da busca,
citações válidas, tempo e consumo de memória em dispositivos representativos.

**Dependências e limites:** Foundation, política de arquivos/armazenamento e contratos
de acesso. OCR, extração e inferência são tarefas distintas. Instruções encontradas
em arquivos devem ser tratadas como conteúdo, sem conceder ações ou permissões.
Busca semântica precisa justificar sua qualidade frente à busca textual.

## Fase 03 — Learning Engine

**Resultado esperado:** uma anotação ou trecho da biblioteca gera cartões editáveis;
revisões e simulados alimentam o planejamento do aluno.

1. Persistir baralhos, cartões, origem, versão do algoritmo e histórico imutável de
   revisões como entidades separadas. O aluno aprova cartões gerados por IA.
2. Integrar o agendador com relógio e fuso controlados; registrar resposta real,
   dificuldade, intervalo, vencimento e estado antes/depois de cada revisão.
3. Criar fila de revisão, suspensão, edição, exclusão e desfazer da última resposta.
4. Acrescentar simulados cronometrados ligados às mesmas disciplinas e conceitos,
   com justificativa das respostas e possibilidade de corrigir questões defeituosas.
5. Usar desempenho observado para sugerir revisões no planner; apresentar retenção
   como estimativa do modelo, sem equipará-la a domínio comprovado da disciplina.

**Aceite:** a mesma sequência de revisões produz resultados reproduzíveis com o
mesmo relógio/configuração; reinício e sincronização preservam o histórico; conflito
não duplica revisão; cartões excluídos saem da fila. Testes cobrem fusos, atraso,
reaprendizagem, desfazer e importação/exportação. O aluno consegue inspecionar a
origem de uma questão e alterar a recomendação de estudo.

**Decisão de versão verificada:** a documentação oficial registra `ts-fsrs 6.0.0`
em 28/10/2026, FSRS-7 como padrão do `DefaultScheduler` e requisito Node.js 24+.
Versão do pacote e versão do modelo são conceitos distintos. Fixar a versão na
implementação e persistir a identificação do modelo; não adaptar exemplos antigos
por simples troca de nomes.
[Notas oficiais do ts-fsrs 6.0.0](https://open-spaced-repetition.github.io/ts-fsrs/updates/fsrs/6.0.0).

**Dependências e limites:** biblioteca e referências da Fase 02; decisão de runtime
Node 24 antes de instalar o agendador. Otimização individual exige histórico
suficiente. Se houver migração de cartões já aprendidos, preservar histórico e
vencimentos e seguir a migração oficial; não inventar estados de memória ausentes.
[Guia oficial de migração](https://open-spaced-repetition.github.io/ts-fsrs/guide/migration).

## Fase 04 — Knowledge System

**Resultado esperado:** o aluno conecta uma nota a outra, encontra backlinks e usa
um mapa ou quadro para navegar pelo mesmo acervo.

1. Acrescentar links internos estáveis ao Tiptap, backlinks e resolução de destino
   excluído, preservando exportação legível fora do aplicativo.
2. Criar conceitos e relações com origem e autoria. A IA sugere conexões; o aluno
   aceita, altera ou descarta cada sugestão.
3. Entregar mapa filtrável por disciplina, tipo e vizinhança, com alternativa em
   lista e navegação por teclado antes de expandir a visualização global.
4. Acrescentar quadro infinito com cartões ligados aos registros existentes,
   desenho e conectores. Persistir objetos e posições sem duplicar a nota original.
5. Conectar exercícios, cartões e materiais aos conceitos para orientar revisões.

**Aceite:** renomear nota mantém links; excluir destino não quebra a navegação;
rejeitar sugestão não a transforma em conexão confirmada; mapa e lista mostram as
mesmas relações. Quadro recupera posições após reinício e exporta uma representação
utilizável. Volume de teste e orçamento de memória são definidos antes do lançamento.

**Dependências e limites:** IDs e versões das fases anteriores. Escolher Vue Flow,
Cytoscape ou Konva conforme os protótipos necessários; não instalar todos para
resolver a mesma interação. Um gráfico grande não substitui a busca nem a hierarquia
acadêmica já existente.

## Fase 05 — Virtual Campus

**Resultado esperado:** participantes autorizados estudam em uma sala com presença,
Pomodoro compartilhado e edição simultânea de um caderno específico.

1. Evoluir grupos atuais com papéis e permissões explícitas para chat, documento,
   presença e convite. Revogar acesso em todas as conexões ativas.
2. Implementar presença efêmera e sessão de foco com relógio do servidor e estados
   recuperáveis após reconexão; separar esses dados dos documentos acadêmicos.
3. Prototipar Tiptap + Yjs/Hocuspocus com autenticação Supabase e persistência de
   atualizações/checkpoints. Definir uma única fonte de verdade para cada documento.
4. Adicionar moderação, denúncia e limites para grupos públicos antes de abri-los.
   Videochamada exige decisão própria de infraestrutura e custo.

**Aceite:** duas sessões editam o mesmo documento e convergem após desconexão;
usuário removido perde leitura/escrita; visitante não acessa documento por conhecer
seu ID; reinício do servidor preserva conteúdo; apagar grupo encerra participação.
Testar convite expirado, reconexão, token renovado e revogação durante uma sessão.

**Decisão de tecnologia verificada:** Hocuspocus 4 foi anunciado estável em
08/05/2026. É um backend WebSocket baseado em Yjs; a publicação informa Node 22+.
Sua existência não adiciona colaboração ao Tiptap automaticamente: autenticação,
autorização, persistência e hospedagem de conexões continuam responsabilidades da
aplicação.
[Anúncio oficial do Hocuspocus 4](https://tiptap.dev/blog/release-notes/hocuspocus-4-stable-release).

**Dependências e limites:** Foundation e modelo de vínculos da Fase 04. A hospedagem
atual de funções serverless precisa de uma decisão complementar para conexões
WebSocket duradouras. Evitar que snapshot JSON e CRDT concorram pela mesma versão
do documento. Adotar Redis apenas se a escala exigir coordenação entre instâncias.

## Fase 06 — Autonomous Academy

**Resultado esperado:** o aluno pede uma ação acadêmica, revisa uma proposta concreta
e acompanha sua execução, podendo desfazer as alterações suportadas.

1. Criar catálogo de ferramentas com esquemas de entrada/saída, escopo por conta,
   limites e registro de execução. Começar com ações reversíveis do planner.
2. Fazer o agente propor plano e alterações antes de executá-las; exigir confirmação
   específica para compartilhamento, exclusão e ações externas com efeitos reais.
3. Adicionar memória acadêmica editável com origem e exclusão pelo aluno. Separar
   preferências explícitas de inferências e do histórico de chat.
4. Integrar voz como camada sobre as ferramentas existentes: gravação explícita,
   transcrição editável, narração cancelável e indicação de processamento local ou
   externo. Podcasts devem manter vínculo aos materiais usados.
5. Avaliar MCP e conectores somente para serviços definidos pelo aluno, com
   permissões mínimas e possibilidade de revogação.

**Aceite:** repetir uma solicitação não duplica eventos; ação negada não é executada;
material malicioso não altera permissões; o aluno vê parâmetros, resultado e origem
de cada ação. Cancelamento de voz interrompe captura e execução pendente. Exclusão
da memória remove sua utilização posterior. Falhas parciais são identificáveis e
recuperáveis, sem afirmar sucesso antes da confirmação de cada ferramenta.

**Dependências e limites:** identidade, permissões, revisão e observabilidade da
Foundation; fontes da Fase 02; ações e entidades estáveis das fases posteriores.
Agentes, áudio e pesquisa extensa têm custos e latência próprios; manter cotas e
escolha de provedor visíveis ao aluno.

## Ordem e decisões de escopo

As fases dependem de contratos de dados e validação, não apenas de novas telas.
Concluir uma entrega vertical pequena antes de expandi-la: documento → trecho →
resposta citada; trecho → cartão → revisão; nota → vínculo → mapa; grupo → documento
compartilhado; proposta → ação confirmada → registro de execução.

Smart Planner e Daily Briefing entram conforme existirem prazos e revisões reais.
Cognitive Analytics acompanha eventos de aprendizagem da Fase 03 e apresenta a
incerteza das estimativas. Audio Academy pertence à Fase 06. Language Lab, Coding
Lab, portfólio e gamificação ficam no backlog até haver objetivo de aprendizagem,
contrato de dados e critério de aceite próprios.

Não há cronograma ou custo estimado neste roteiro. Cada fase deve receber orçamento,
limite de escala, política de dados e teste de aceite antes da implementação. As
versões das tecnologias futuras foram conferidas em 16/11/2026 e precisam ser
revalidadas quando a fase correspondente começar.
