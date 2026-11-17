const base = new URL(process.env.APP_URL || '');
if (base.protocol !== 'https:') throw new Error('APP_URL deve usar HTTPS.');
for (const path of ['/api/health', '/entrar', '/redefinir-senha', '/conhecer', '/privacidade', '/termos']) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Falha em ${path}: HTTP ${response.status}`);
  if (path === '/api/health' && !(await response.json()).ok) throw new Error('Health check inválido.');
  console.log(`OK ${path}`);
}
const protectedResponse = await fetch(new URL('/api/openai', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) });
if (protectedResponse.status !== 401) throw new Error('A API precisa rejeitar chamadas sem autenticação.');
console.log('API rejeitou acesso anônimo.');
