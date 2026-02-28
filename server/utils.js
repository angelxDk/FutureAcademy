export function cleanErrorMessage(err, fallback = 'Falha ao processar a solicitação.') {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}

export function requireEnv(name) {
    const value = String(process.env[name] || '').trim();
    if (!value) {
        throw new Error(`Configuração ausente: ${name}`);
    }
    return value;
}
