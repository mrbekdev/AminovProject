// Use @sentry/node for SDK init on the server.
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? 'https://2edc6264958bb053b58f71c6df56b3f3@o4511265782366208.ingest.us.sentry.io/4511265786429440',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
