import { sanitizeMonitoringEvent } from '../utils/monitoring';
export async function configureMonitoring(app) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  try {
    const sentry = await import('@sentry/vue');
    sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, defaultIntegrations: false, tracesSampleRate: 0, sendDefaultPii: false, beforeSend: sanitizeMonitoringEvent });
    app.config.errorHandler = error => { sentry.captureException(error); console.error('[Future Academy] Falha de interface.'); };
    window.addEventListener('error', event => { if (event.error) sentry.captureException(event.error); });
    window.addEventListener('unhandledrejection', event => sentry.captureException(event.reason));
  } catch { console.warn('[Future Academy] Monitoramento indisponível.'); }
}
