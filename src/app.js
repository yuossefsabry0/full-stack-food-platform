'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { requestLogger } = require('./middlewares/requestLogger.middleware');

const app = express();

// Do not advertise the framework in responses (fingerprinting hygiene).
app.disable('x-powered-by');

// deployment/proxy-aware client IP (rate limiting keys on req.ip).
app.set('trust proxy', env.trustProxy);

// security headers (helmet defaults; API serves JSON only).
// Note: frontend token storage (localStorage) and the httpOnly-cookie
// migration remain documented in docs/security-notes.md; that migration
// needs a cookie parser + CORS credentials change and is intentionally not
// done here to avoid new dependencies and contract breaks.
app.use(helmet());

// CORS configuration (origins from environment).
const corsOptions =
  !env.corsOrigin || env.corsOrigin === '*'
    ? {}
    : { origin: env.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean) };
app.use(cors(corsOptions));

// enforced request size limit (oversize -> 413, see error middleware).
app.use(express.json({ limit: env.requestBodyLimit }));

// operational logging (method/route/status/duration, no secrets).
app.use(requestLogger);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
