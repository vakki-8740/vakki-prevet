const express = require('express');

function dashboardRoutes(dashCtrl) {
  const router = express.Router();
  router.get('/stats', dashCtrl.getStats);
  router.get('/activity', dashCtrl.getActivity);
  return router;
}

module.exports = dashboardRoutes;
