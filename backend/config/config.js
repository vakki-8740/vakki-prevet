const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'cloud-storage-secret-key-2024-production',
  JWT_EXPIRES_IN: '7d',
  MAX_FILE_SIZE: 500 * 1024 * 1024,
  UPLOAD_DIR: path.join(__dirname, '..', '..', 'uploads'),
  DATABASE_DIR: path.join(__dirname, '..', '..', 'database'),
  DB_PATH: path.join(__dirname, '..', '..', 'database', 'cloudstorage.db'),
  AVATARS_DIR: path.join(__dirname, '..', '..', 'uploads', 'avatars'),
  THUMBNAILS_DIR: path.join(__dirname, '..', '..', 'uploads', 'thumbnails'),
  ALLOWED_MIMETYPES: [],
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 100,
  UPLOAD_RATE_LIMIT_MAX: 20,
  USER_STORAGE_LIMIT: 10 * 1024 * 1024 * 1024,
  FRONTEND_DIR: path.join(__dirname, '..', '..', 'frontend'),
};
