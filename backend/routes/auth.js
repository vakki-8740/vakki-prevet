const express = require('express');

function authRoutes(authCtrl, authenticate) {
  const router = express.Router();
  router.post('/register', authCtrl.register);
  router.post('/login', authCtrl.login);
  router.post('/logout', authenticate, authCtrl.logout);
  router.post('/forgot-password', authCtrl.forgotPassword);
  router.post('/reset-password', authCtrl.resetPassword);
  return router;
}

module.exports = authRoutes;
