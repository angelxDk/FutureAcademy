import { captureServerError } from './monitoring.js';
export function cleanErrorMessage(err, fallback = 'Falha ao processar a solicitação.') {
    void captureServerError(err);
    console.error(JSON.stringify({ event: 'integration_failed', code: err?.code || err?.name || 'internal' }));
    return fallback;
}

export function requireEnv(name) {
    const value = String(process.env[name] || '').trim();
    if (!value) {
        throw new Error(`Configuração ausente: ${name}`);
    }
    return value;
}
