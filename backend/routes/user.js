const express = require('express');

function userRoutes(authCtrl) {
  const router = express.Router();
  router.get('/profile', authCtrl.getProfile);
  router.put('/profile', authCtrl.updateProfile);
  router.put('/password', authCtrl.changePassword);
  router.post('/avatar', authCtrl.uploadAvatar);
  return router;
}

module.exports = userRoutes;
