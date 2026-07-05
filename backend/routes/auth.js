const express = require('express');

function authRoutes(authCtrl) {
  const router = express.Router();
  router.post('/register', authCtrl.register);
  router.post('/login', authCtrl.login);
  router.post('/logout', authCtrl.logout);
  return router;
}

module.exports = authRoutes;
