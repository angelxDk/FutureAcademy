import { captureServerError } from './monitoring.js';
import { randomUUID } from 'node:crypto';
import { adminServices } from './admin.js';

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next?.();
}

export async function authorize(req, res, { verify, quota } = {}) {
  securityHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
  if (!token) { res.status(401).json({ error: 'Entre na sua conta para continuar.' }); return false; }
  let identity;
  try { identity = await (verify || (token => adminServices().auth.verifyIdToken(token, true)))(token); }
  catch { res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' }); return false; }
  req.identity = identity;
  try {
    const allowed = await (quota || consumeQuota)(identity.uid, req.originalUrl || req.url || 'api');
    if (!allowed) { res.setHeader('Retry-After', '60'); res.status(429).json({ error: 'Limite de uso atingido. Aguarde antes de tentar novamente.' }); return false; }
  } catch (error) { if (error.code === 'account/deleting') { res.status(403).json({ error: 'Exclusão de conta em andamento. Use o perfil para concluir.' }); return false; } res.status(503).json({ error: 'Não foi possível verificar o limite de uso. Tente novamente.' }); return false; }
  return true;
}

// A shared transactional counter works across Express processes and serverless instances.
export async function consumeQuota(uid, route) {
  const { db } = adminServices();
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10), minute = Math.floor(now / 60000);
  const paid = route.split('?')[0].endsWith('/openai');
  const ref = db.doc(`apiUsage/${uid}`);
  return db.runTransaction(async tx => {
    const deletion = await tx.get(db.doc(`accountDeletions/${uid}`));
    if (deletion.exists && !route.split('?')[0].endsWith('/account')) throw Object.assign(new Error('Deletion in progress'), { code: 'account/deleting' });
    const snap = await tx.get(ref), previous = snap.data() || {};
    const daily = previous.day === day ? previous.daily || 0 : 0;
    const minuteCount = previous.minute === minute ? previous.minuteCount || 0 : 0;
    const paidCount = previous.day === day ? previous.paidCount || 0 : 0;
    if (daily >= 1000 || minuteCount >= 30 || (paid && paidCount >= 20)) return false;
    tx.set(ref, { day, minute, daily: daily + 1, minuteCount: minuteCount + 1, paidCount: paidCount + Number(paid) });
    return true;
  });
}

export function protectedHandler(handler) {
  return async (req, res) => {
    if (!await authorize(req, res)) return;
    try { return await handler(req, res); }
    catch (error) { return reportServerError(error, res); }
  };
}
export async function reportServerError(error, res) {
  const requestId = randomUUID();
  console.error(JSON.stringify({ event: 'request_failed', requestId, code: error?.code || 'internal' }));
  await captureServerError(error);
  return res.status(500).json({ error: 'Não foi possível concluir. Tente novamente.', requestId });
}
