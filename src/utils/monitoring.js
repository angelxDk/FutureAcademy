// Allowlist diagnostics. Never send request payloads, identifiers or raw error messages.
export function sanitizeMonitoringEvent(event) {
  return {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: 'error',
    release: event.release,
    exception: { values: (event.exception?.values || []).map(value => ({
      type: /^[A-Za-z0-9_]{1,50}$/.test(value.type || '') ? value.type : 'Error',
      value: 'Erro técnico no Future Academy',
      stacktrace: { frames: (value.stacktrace?.frames || []).map(frame => ({
        filename: String(frame.filename || '').split('?')[0].split('/').pop(),
        function: frame.function, lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app
      })) }
    })) }
  };
}
