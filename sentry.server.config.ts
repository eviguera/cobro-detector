// Sentry server configuration for Next.js
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

if (dsn || environment === 'production') {
  Sentry.init({
    dsn: dsn || 'https://tu-dsn@sentry.io/0',
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    environment,
    
    // Disable session replay for server
    integrations: [
      Sentry.httpIntegration(),
    ],
  });
}

export default Sentry;
