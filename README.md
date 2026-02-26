# Future Academy

O Future Academy é um hub acadêmico feito para organizar rotina de estudo em um único lugar: matérias, grade semanal, agenda, trabalhos, pomodoro, comunidade e apoio com IA.

Repositório: `https://github.com/angelxDk/FutureAcademy`

## Visão geral

- Frontend em Vue 3 (SFC), Vite, Vuetify e Tailwind.
- Backend em Node + Express para proteger chaves e intermediar integrações externas.
- Autenticação com Firebase (Google, Facebook e e-mail/senha).
- Persistência dos dados do usuário no Firestore.

## Funcionalidades principais

- Login e cadastro com Google, Facebook ou e-mail/senha.
- Painel com visão rápida da rotina e registro de estudo.
- Cadastro de matérias com dados de professor.
- Grade semanal com edição e lembretes.
- Importação de horários a partir de arquivo `.pdf` ou `.docx` (extração + análise por IA).
- Agenda de eventos acadêmicos com notificações.
- Trabalhos e registros com editor rico e exportação em `.md`, `.docx` e `.pdf`.
- Pomodoro configurável por ciclos.
- Comunidades de estudo com chat e comandos rápidos (`/tempo`, `/spotify`, `/cambio`, `/ia`).
- Seção de IA acadêmica com respostas e fontes oficiais indexadas.
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

- Node.js `18+` (recomendado `20+`)
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
- O app usa scripts externos via CDN para alguns recursos no navegador (`pdf.js`, `mammoth` e fonte de ícones MDI).
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
