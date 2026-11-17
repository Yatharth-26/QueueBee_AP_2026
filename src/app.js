// Express Application Setup & Middleware Orchestration
// Course: Advanced Programming (AP) · B.Tech 2nd Year
// Smart Queue (QueueBee)

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rate-limit.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Security Headers (Helmet)
// Note: Configured with loose Content-Security-Policy to allow vanilla frontend scripts & CDN KaTeX/charts if used
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(cors());

// HTTP Request Logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Body Parsing Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static Frontend Serving (Vanilla HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// Rate Limiter for API endpoints
app.use('/api', apiLimiter);

// Mount API Routes
app.use('/api', apiRoutes);

// Catch unmatched /api routes
app.use('/api/*', notFoundHandler);

// Fallback to index.html for root or SPA route navigation
app.get('*', (req, res, next) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else {
    next();
  }
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
