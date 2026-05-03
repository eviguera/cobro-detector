// Sentry client configuration for Next.js
import * as Sentry from '@sentry/nextjs';

// Solo inicializar si SENTRY_DSN está definido y es válido
const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

// Validar que el DSN sea válido (contiene @ y no sea el placeholder)
const isValidDsn = dsn && dsn.includes('@') && !dsn.includes('tu-dsn');

if (isValidDsn && environment === 'production') {
  Sentry.init({
    dsn: dsn,
    
    // Performance monitoring
    tracesSampleRate: 0.1,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    environment,
    
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
    
    // Set sample rate for profiling
    profilesSampleRate: 0.1,
  });
}

export default Sentry;
