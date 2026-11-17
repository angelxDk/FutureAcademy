import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spotifyRoutes from './routes/spotifyRoutes.js';
import exchangeRoutes from './routes/exchangeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { authorize, securityHeaders, reportServerError } from './security.js';
import { communityApi } from './controllers/communityController.js';
import { billingApi, stripeWebhook } from './controllers/billingController.js';
import { deleteAccount, exportAccount } from './controllers/accountController.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const host = String(process.env.HOST || '127.0.0.1');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

app.disable('x-powered-by');
app.use(securityHeaders);
app.post('/api/stripe-webhook', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api', async (req, res, next) => { if (await authorize(req, res)) next(); });
app.all('/api/community', communityApi);
app.delete('/api/account', deleteAccount);
app.get('/api/account', exportAccount);
app.all('/api/billing', billingApi);

app.use('/api/spotify', spotifyRoutes);
app.use('/api/exchange', exchangeRoutes);
app.use('/api', aiRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`Future Academy API server running on http://${host}:${port}`);
});

app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Conteúdo excede o limite permitido.' });
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido.' });
  reportServerError(error, res);
});
