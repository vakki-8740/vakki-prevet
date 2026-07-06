const express = require('express');
const { createUploadMiddleware } = require('../middleware/upload');

function fileRoutes(fileCtrl) {
  const router = express.Router();
  const upload = createUploadMiddleware();

  router.post('/upload', upload.array('files', 10), fileCtrl.upload);
  router.get('/', fileCtrl.list);
  router.get('/favorites', fileCtrl.getFavorites);
  router.get('/recycle-bin', fileCtrl.getRecycleBin);
  router.get('/export-all', fileCtrl.exportAll);
  router.get('/:id/download', fileCtrl.download);
  router.get('/:id/preview', fileCtrl.preview);
  router.get('/:id/properties', fileCtrl.getProperties);
  router.post('/download-multiple', fileCtrl.downloadMultiple);
  router.put('/:id/rename', fileCtrl.rename);
  router.put('/:id/favorite', fileCtrl.toggleFavorite);
  router.delete('/:id', fileCtrl.remove);
  router.delete('/permanent/:id', fileCtrl.permanentDelete);
  router.post('/restore/:id', fileCtrl.restore);
  router.post('/move', fileCtrl.move);
  router.post('/copy', fileCtrl.copy);
  router.post('/:id/duplicate', fileCtrl.duplicate);

  return router;
}

module.exports = fileRoutes;
