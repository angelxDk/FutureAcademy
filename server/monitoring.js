import { sanitizeMonitoringEvent } from '../src/utils/monitoring.js';
let initializing;
export async function captureServerError(error) {
  if (!process.env.SENTRY_DSN) return;
  try {
    initializing ||= import('@sentry/node').then(sentry => {
      sentry.init({ dsn: process.env.SENTRY_DSN, defaultIntegrations: false, tracesSampleRate: 0, sendDefaultPii: false, beforeSend: sanitizeMonitoringEvent });
      return sentry;
    });
    const sentry = await initializing;
    sentry.captureException(error);
    await sentry.flush(1500);
  } catch { /* Monitoring must never prevent an API response. */ }
}
