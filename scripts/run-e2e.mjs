import { spawn, spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
const cli = spawnSync('supabase', ['status', '--output', 'env'], { encoding: 'utf8' });
if (cli.status !== 0) throw new Error('Inicie o Supabase local com npx supabase start antes do E2E autenticado. Requer Docker.');
const local = dotenv.parse(cli.stdout);
const publicKey = local.ANON_KEY || local.PUBLISHABLE_KEY;
const secretKey = local.SERVICE_ROLE_KEY || local.SECRET_KEY;
if (!local.API_URL || !publicKey || !secretKey) throw new Error('Não foi possível ler as credenciais do Supabase local.');
if (!['localhost', '127.0.0.1'].includes(new URL(local.API_URL).hostname)) throw new Error('E2E só pode usar Supabase local e isolado.');
const env = { ...process.env, E2E_SUPABASE: '1', VITE_SUPABASE_URL: local.API_URL, VITE_SUPABASE_ANON_KEY: publicKey,
  SUPABASE_URL: local.API_URL, SUPABASE_SERVICE_ROLE_KEY: secretKey,
  API_PROXY_TARGET: 'http://127.0.0.1:8879', PORT: '8879', HOST: '127.0.0.1', ENABLE_PAID_AI: 'false',
  STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', STRIPE_PRO_PRICE_ID: '', SENTRY_DSN: '', VITE_SENTRY_DSN: '' };
const run = (command, args) => new Promise((resolve, reject) => { const child = spawn(command, args, { env, stdio: 'inherit' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))); });
await run('npm', ['run', 'build']);
const server = spawn(process.execPath, ['server/index.js'], { env, stdio: 'inherit' });
try {
  let available = false;
  for (let retry = 0; retry < 50; retry++) {
    try { available = (await fetch('http://127.0.0.1:8879/api/health')).ok; } catch {}
    if (available) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!available) throw new Error('E2E backend did not start.');
  await run('npx', ['playwright', 'test']);
} finally { server.kill('SIGTERM'); }
