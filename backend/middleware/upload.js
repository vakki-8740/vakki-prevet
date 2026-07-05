const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { generateUniqueFilename } = require('../utils/helpers');

function createUploadMiddleware() {
  if (!fs.existsSync(config.UPLOAD_DIR)) {
    fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const userDir = path.join(config.UPLOAD_DIR, String(req.user.id));
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = generateUniqueFilename(file.originalname);
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: config.MAX_FILE_SIZE,
      files: 10,
    },
  });
}

module.exports = { createUploadMiddleware };
