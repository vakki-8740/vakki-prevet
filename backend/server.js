const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const { initDatabase } = require('./config/database');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');
const fileController = require('./controllers/fileController');
const folderController = require('./controllers/folderController');
const dashboardController = require('./controllers/dashboardController');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const fileRoutes = require('./routes/files');
const folderRoutes = require('./routes/folders');
const dashboardRoutes = require('./routes/dashboard');

const db = initDatabase();
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS - Allow ALL origins for separate frontend hosting
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Initialize controllers
const authCtrl = authController(db);
const fileCtrl = fileController(db);
const folderCtrl = folderController(db);
const dashCtrl = dashboardController(db);
const authenticate = authMiddleware(db);

// Ensure uploads directory exists
const uploadsDir = path.join(config.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Serve uploaded files (static, no auth needed for file preview via URL)
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// API Routes
app.use('/api/auth', authRoutes(authCtrl));
app.use('/api/user', authenticate, userRoutes(authCtrl));
app.use('/api/files', authenticate, fileRoutes(fileCtrl));
app.use('/api/folders', authenticate, folderRoutes(folderCtrl));
app.use('/api/dashboard', authenticate, dashboardRoutes(dashCtrl));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 500MB' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 10 files per upload' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`CloudVault API server running on http://localhost:${config.PORT}`);
  console.log(`CORS enabled for all origins`);
});

module.exports = app;
