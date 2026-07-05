const express = require('express');

function folderRoutes(folderCtrl) {
  const router = express.Router();
  router.post('/', folderCtrl.create);
  router.get('/', folderCtrl.list);
  router.get('/:id', folderCtrl.getOne);
  router.get('/:id/breadcrumbs', folderCtrl.getBreadcrumbs);
  router.put('/:id/rename', folderCtrl.rename);
  router.delete('/:id', folderCtrl.remove);
  router.post('/move', folderCtrl.move);
  return router;
}

module.exports = folderRoutes;
