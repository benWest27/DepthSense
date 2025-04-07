const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-dsn-url' });

app.use(Sentry.Handlers.errorHandler());