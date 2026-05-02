// Sentry client configuration for Next.js
import * as Sentry from '@sentry/nextjs';

// Solo inicializar en producción o si SENTRY_DSN está definido
const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

if (dsn || environment === 'production') {
  Sentry.init({
    dsn: dsn || 'https://tu-dsn@sentry.io/0',
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    environment,
    
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
    
    // Set sample rate for profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
  });
}

export default Sentry;
