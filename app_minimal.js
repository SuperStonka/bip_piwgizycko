// Load environment variables
require('dotenv').config();

// MINIMALNA WERSJA APP.JS - TYMCZASOWE ROZWIĄZANIE PĘTLI PRZEKIEROWAŃ
// Wyłączono wszystkie problematyczne middleware:
// - Sesje
// - Helmet
// - Debug middleware
// - Middleware bazy danych

// Fallback for Phusion Passenger
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const IS_DEV = process.env.NODE_ENV === 'development';

const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL || process.env.BASE_URL || `http://localhost:${PORT}`;

// Trust proxy for correct IP detection
app.set('trust proxy', true);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use EJS layouts
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Make basic variables available to all views
app.use(async (req, res, next) => {
  res.locals.appUrl = APP_URL;
  res.locals.siteSettings = {};
  res.locals.menuStructure = [];
  res.locals.menuItems = null;
  res.locals.breadcrumbs = [
    { title: 'Strona główna', url: '/', isActive: true }
  ];
  next();
});

// Basic middleware (bez problematycznych)
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// TYMCZASOWO WYŁĄCZONE MIDDLEWARE:
// - app.use(helmet({...})); // Wyłączone
// - app.use(session(sessionConfig)); // Wyłączone
// - Debug middleware // Wyłączone
// - Database middleware // Wyłączone

// Routes (mount admin BEFORE main to avoid catch-all :slug capturing /admin)
app.use('/admin', require('./routes/admin'));

// API Routes (must be defined BEFORE main routes to avoid catch-all conflicts)
app.post('/api/article/:id/view', async (req, res) => {
  try {
    console.log('API route hit: /api/article/:id/view');
    res.json({ 
      success: true, 
      viewCount: 0,
      message: 'View count updated successfully (minimal mode)' 
    });
  } catch (error) {
    console.error('Error updating article view count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.use('/', require('./routes/main'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Błąd serwera',
    message: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Strona nie znaleziona',
    message: 'Strona, której szukasz, nie została znaleziona.',
    error: {}
  });
});

// Initialize view counter store and cleanup
app.locals.articleViews = new Map();
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, lastViewTs] of app.locals.articleViews.entries()) {
    if (typeof lastViewTs === 'number' && (now - lastViewTs) > ONE_HOUR_MS) {
      app.locals.articleViews.delete(key);
    }
  }
}, 10 * 60 * 1000); // cleanup every 10 minutes

app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT} (MINIMAL MODE)`);
  if (IS_DEV) console.log(`Aplikacja dostępna pod adresem: http://localhost:${PORT}`);
});

module.exports = app;
