'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { requestLogger } = require('./middlewares/requestLogger.middleware');

const app = express();

// deployment/proxy-aware client IP (rate limiting keys on req.ip).
app.set('trust proxy', env.trustProxy);

// security headers.
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
