// Sentry edge configuration for Next.js (middleware)
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;
const environment = process.env.NODE_ENV || 'development';

if (dsn || environment === 'production') {
  Sentry.init({
    dsn: dsn || 'https://tu-dsn@sentry.io/0',
    environment,
  });
}

export default Sentry;
