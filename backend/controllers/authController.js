const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/token');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

function authController(db) {
  const register = async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name, email, hashedPassword);
      const user = db.prepare('SELECT id, name, email, avatar, storage_used, storage_limit, theme, language, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
      const token = generateToken(user);
      const userDir = path.join(config.UPLOAD_DIR, String(user.id));
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)').run(user.id, 'register', 'user', `User ${name} registered`);
      res.status(201).json({ user, token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  };

  const login = async (req, res) => {
    try {
      const { email, password, remember } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const token = generateToken(user);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)').run(user.id, token, req.ip, req.headers['user-agent'], expiresAt);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)').run(user.id, 'login', 'user', 'User logged in');
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  };

  const logout = (req, res) => {
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'logout', 'user', 'User logged out');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  };

  const getProfile = (req, res) => {
    res.json({ user: req.user });
  };

  const updateProfile = async (req, res) => {
    try {
      const { name, email, theme, language } = req.body;
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (email) {
        const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
        if (existing) return res.status(409).json({ error: 'Email already in use' });
        updates.push('email = ?'); params.push(email);
      }
      if (theme) { updates.push('theme = ?'); params.push(theme); }
      if (language) { updates.push('language = ?'); params.push(language); }
      if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      const user = db.prepare('SELECT id, name, email, avatar, storage_used, storage_limit, theme, language, created_at FROM users WHERE id = ?').get(req.user.id);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Update failed' });
    }
  };

  const changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Password change failed' });
    }
  };

  const uploadAvatar = (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const avatarPath = `/uploads/avatars/${req.user.id}/${req.file.filename}`;
      const avatarDir = path.join(config.UPLOAD_DIR, 'avatars', String(req.user.id));
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      const finalPath = path.join(avatarDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);
      db.prepare('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(avatarPath, req.user.id);
      res.json({ avatar: avatarPath });
    } catch (error) {
      res.status(500).json({ error: 'Avatar upload failed' });
    }
  };

  return { register, login, logout, getProfile, updateProfile, changePassword, uploadAvatar };
}

module.exports = authController;
