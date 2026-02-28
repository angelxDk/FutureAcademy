import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import spotifyRoutes from './routes/spotifyRoutes.js';
import exchangeRoutes from './routes/exchangeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const host = String(process.env.HOST || '127.0.0.1');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist');

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

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
