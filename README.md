# Future Academy

O Future Academy é um hub acadêmico feito para organizar rotina de estudo em um único lugar: matérias, grade semanal, agenda, trabalhos, pomodoro, comunidade e apoio com IA.

Repositório: `https://github.com/angelxDk/FutureAcademy`

## Visão geral

- Frontend em Vue 3 (SFC), Vite 8, Vuetify e CSS responsivo.
- Backend em Node + Express para proteger chaves e intermediar integrações externas.
- Autenticação com Firebase (Google, Facebook e e-mail/senha).
- Persistência dos dados do usuário no Firestore.

## Funcionalidades principais

- Login e cadastro com Google, Facebook ou e-mail/senha.
- Painel com visão rápida da rotina e registro de estudo.
- Cadastro de matérias com dados de professor.
- Grade semanal com edição e lembretes.
- Importação gratuita de horários em `.pdf` ou `.docx` com extração e parser de tabelas.
- Agenda de eventos acadêmicos com notificações.
- Trabalhos e registros com editor rico e exportação em `.md`, `.docx` e `.pdf`.
- Pomodoro configurável por ciclos.
- Comunidades de estudo com chat e comandos rápidos (`/tempo`, `/spotify`, `/cambio`, `/ia`).
- Tutor com IA real local via WebLLM ou Ollama e pesquisa de referências na Crossref.
- Área de foco com player Spotify persistente e presets visuais 3D.

## Stack técnica

- `vue` + `vite`
- `vuetify`
- `tailwindcss`
- `gsap`
- `three`
- `firebase` (Auth + Firestore)
- `express`
- `docx` (exportação de registros)

## Pré-requisitos

- Node.js `22.13+` (recomendado `24+`)
- npm
- Python 3 (usado no parser de importação de horários)
- Projeto Firebase configurado (Auth + Firestore)
- Chaves de API para integrações opcionais (OpenAI, Spotify e ExchangeRate)

## Como rodar localmente

```bash
npm install
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais e rode:

```bash
npm run dev
```

Ambientes em desenvolvimento:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8787`

## Variáveis de ambiente

Arquivo base: `.env.example`.

### Backend

- `PORT` porta do servidor Express (padrão: `8787`)
- `HOST` host do servidor Express (padrão: `127.0.0.1`)
- `OPENAI_API_KEY` chave da OpenAI
- `OPENAI_MODEL` modelo padrão do backend (`gpt-4.1-mini` por padrão)
- `SPOTIFY_CLIENT_ID` client ID do Spotify
- `SPOTIFY_CLIENT_SECRET` client secret do Spotify
- `SPOTIFY_ACCESS_TOKEN` opcional, para token estático
- `EXCHANGERATE_API_KEY` chave da ExchangeRate-API

### Frontend (Vite)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Scripts disponíveis

- `npm run dev` inicia frontend e backend em paralelo
- `npm run dev:client` inicia apenas o frontend (Vite)
- `npm run dev:server` inicia apenas o backend (Node com watch)
- `npm run build` build de produção do frontend
- `npm run preview` preview local da build do frontend
- `npm run start` sobe backend em produção e serve `dist/` (requer build gerada)

## Endpoints do backend

- `GET /api/health`
- `GET /api/spotify/search?q=<termo>&limit=<n>`
- `GET /api/exchange?amount=<valor>&from=<moeda>&to=<moeda>`
- `POST /api/openai`
- `POST /api/parse-timetable`

## Estrutura do projeto

```text
.
├── src/
│   ├── App.vue
│   ├── appOptions.js
│   ├── firebase.js
│   └── sections/
├── server/
│   ├── index.js
│   └── parse_timetable.py
├── index.html
├── package.json
└── .env.example
```

## Observações importantes

- As chaves de integração ficam no backend e não devem ir para o repositório.
- PDF.js e Mammoth são dependências locais, carregadas sob demanda. A fonte de ícones MDI ainda usa CDN.
- Sem `.env` configurado, o app ainda abre, mas recursos que dependem de API externa podem falhar.

## Publicando no GitHub pela primeira vez

```bash
git init
git add .
git commit -m "chore: adiciona projeto Future Academy com README inicial"
git branch -M main
git remote add origin https://github.com/angelxDk/FutureAcademy.git
git push -u origin main
```

## Fluxo acadêmico integrado

O painel organiza as prioridades a partir dos dados reais de cada aluno: disciplinas,
aulas do dia, trabalhos pendentes, atrasos e minutos estudados na semana, de segunda
a domingo. Não há uma turma ou turno fixo no painel.

Em **Trabalhos e registros**, o aluno escreve no editor, acompanha a contagem de
palavras, salva e exporta com os formatos existentes. O formulário em edição gera
um rascunho recuperável por usuário, com cópia local imediata e sincronização
posterior. O botão de salvar confirma o trabalho na lista; o rascunho não o substitui
até essa confirmação. Busca, status e disciplina filtram a biblioteca de trabalhos.

Trabalhos não concluídos com prazo aparecem automaticamente na linha do tempo da
**Agenda**, junto aos eventos, sem duplicar os dados. Concluir um trabalho retira sua
entrega da agenda. Prazos sem horário vencem ao término da data local do aluno.
Excluir uma disciplina preserva trabalhos, eventos e histórico de estudo, removendo
apenas o vínculo com a disciplina e suas aulas na grade.

### Verificação

```bash
npm test
npm run build
```

Os testes cobrem classificação de prazos, união da agenda, edição de disciplinas
e validação de conflitos de horário. Login, sincronização remota e integrações
externas precisam ser verificados com as respectivas contas e serviços configurados.

## Fichário e mesa de estudo

A **Grade semanal** abre como uma folha de fichário, com dias nas colunas,
intervalos reais das aulas nas linhas, cores por disciplina, professor e local.
Clique em uma aula para editar ou em uma célula vazia para adicionar. O menu da
grade oferece lista alternativa, impressão/PDF e exportação `.ics` com recorrência
semanal. Os horários do `.ics` seguem o calendário local de quem importa.

**Abrir ao lado** adiciona uma ferramenta até o limite de quatro espaços.
**Mesa de estudo** abre Caderno, IA, Sons e Comunidade em uma grade 2 × 2 e recolhe
o menu lateral. Cada espaço tem rolagem independente, ampliar/restaurar e ocultar.
Ocultar ou trocar a distribuição mantém a instância da ferramenta, a edição e o
áudio. O controle de divisão ajusta a largura das colunas. No celular, os espaços
são empilhados. As abas guardam as ferramentas visitadas durante a sessão.

O caderno usa as extensões abertas do Tiptap: títulos, listas, tarefas, marca-texto,
citações, código e histórico de desfazer/refazer. Os modelos de aula, Cornell,
trabalho e revisão são inseridos sem substituir o conteúdo existente. Os detalhes
acadêmicos ficam recolhidos para dar espaço à escrita. Rascunhos de documentos
diferentes são preservados separadamente e aparecem acima do editor.

### Recursos gratuitos

- **WebLLM:** a IA executa em um Web Worker no navegador, com WebGPU. O usuário
  inicia explicitamente o download dos modelos. Qwen 2.5 0.5B é a opção multilíngue;
  Qwen 2.5 1.5B oferece mais capacidade com maior uso de memória; SmolLM2 360M é a opção menor. O primeiro download exige conexão, espaço e centenas
  de MB de transferência; a execução depende da GPU e da memória disponíveis.
  Não há garantia de funcionamento em todos os celulares ou navegadores. Modelos
  pequenos podem errar e não substituem a conferência do conteúdo.
- **Ollama:** alternativa local sem chave de API. Instale em
  <https://ollama.com/download>, baixe um modelo pelo aplicativo e inicie o serviço
  no computador do backend. Em IA de estudo, selecione Ollama e **Buscar modelos
  locais**. `OLLAMA_BASE_URL` é opcional e usa `http://127.0.0.1:11434` por padrão.
  Em hospedagem serverless, localhost não é o computador do aluno; prefira WebLLM.
- **Crossref:** busca de metadados bibliográficos sem cadastro, acionada pelo aluno.
  É possível abrir o DOI e salvar uma referência no caderno. A consulta é separada
  do tutor; as respostas da IA não são apresentadas como pesquisa nessa base.
  O texto integral de uma publicação pode ter acesso restrito.
- **Sons de foco:** ruído marrom e texturas de chuva/brisa sintetizados pela Web
  Audio API. Mistura de volumes independente de Spotify, assinatura ou arquivos.

Conversas e rascunhos usam a persistência existente por conta (cópia local e
Firestore). Processamento local de IA não significa que a conversa não seja
sincronizada com a conta. Os limites gratuitos do Firebase continuam aplicáveis.
O snapshot atual usa um documento por usuário; acervos grandes precisarão de
persistência por documento para ultrapassar o limite de tamanho do Firestore.

A seção Comunidade mantém grupos e registros pessoais. Chat entre contas em tempo
real ainda não está implementado. Mensagens normais não disparam API paga;
`/ia <pergunta>` prepara uma pergunta no tutor gratuito ao lado. Integrações pagas
legadas do backend permanecem opcionais e não são usadas pelo novo tutor.

### Validação da mesa de estudo

`npm test` inclui testes de componentes para edição, desfazer, carregamento de
conteúdo, preservação de rascunhos entre documentos, ocultação/ampliação sem
remontar ferramentas, grade semanal, exportação de calendário, sanitização de HTML,
cache por conta e contrato da API local de IA. `npm run build` gera o frontend.
Os arquivos pesados de IA e importação são carregados sob demanda.

## Entrada da academia

A tela pública `/entrar` combina uma ilustração própria de ágora futurista com
mármore, azul noturno, detalhes dourados e tipografia Cormorant Garamond.
A composição adapta-se ao celular, com o formulário abaixo da ilustração.
Google, Facebook e e-mail usam o Firebase já configurado. A validação indica
campos incompletos, permite mostrar a senha e preserva o formulário em caso de
erro de autenticação. Quem já está conectado pode voltar ao fichário pelo link no
cabeçalho. O canvas 3D fica desativado nesta página para não competir com a arte.

A seta no próprio cabeçalho da navegação lateral recolhe o menu para uma faixa de
ícones; a seta inversa o expande. Os atalhos continuam acessíveis e a preferência
fica salva junto à organização da mesa.

Arte: `src/assets/agora-futura.png`, gerada com a ferramenta integrada ImageGen.
O prompt e a direção visual estão em `src/assets/agora-futura.prompt.md`.

## Rolagem e organização visual

Uma página usa a rolagem do documento, incluindo gestos feitos sobre o editor.
Na mesa dividida de desktop, cada painel tem sua área rolável; ao chegar ao limite,
a rolagem pode continuar na página. Textareas e históricos de mensagens mantêm seu
scroll próprio. Gestos horizontais e atalhos de zoom do navegador são preservados.
No celular os painéis acompanham a rolagem normal da página.

A navegação global fica agrupada na lateral (Organizar, Aprender e Conectar), e as
abas representam as ferramentas abertas. O caderno tem largura de leitura limitada,
cabeçalho compacto e editor de 16px. As superfícies são opacas e discretas; a animação
3D fica restrita à página de música, sem competir com a escrita.

### Corretor ortográfico
O botão Ortografia no caderno usa Hunspell em um Web Worker e o dicionário pt-BR VERO (`dictionary-pt`). Os textos não são enviados a APIs. A revisão é manual e não analisa gramática; sugestões substituem uma ocorrência de cada vez e podem ser desfeitas. Dicionário e licença estão em `public/dictionaries/pt-BR`. `scripts/patch-spelling-deps.mjs` adapta os wrappers WASM à API atualizada do nanoid e à importação ESM; é executado no postinstall.
