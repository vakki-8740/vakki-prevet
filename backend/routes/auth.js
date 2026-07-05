const express = require('express');

function authRoutes(authCtrl) {
  const router = express.Router();
  router.post('/register', authCtrl.register);
  router.post('/login', authCtrl.login);
  router.post('/logout', authCtrl.logout);
  router.post('/forgot-password', authCtrl.forgotPassword);
  router.post('/reset-password', authCtrl.resetPassword);
  return router;
}

module.exports = authRoutes;
