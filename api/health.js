import { securityHeaders } from '../server/security.js';
export default function health(req, res) {
  securityHeaders(req, res);
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  return res.json({ ok: true, timestamp: new Date().toISOString() });
}
