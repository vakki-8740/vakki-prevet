const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const config = require('../config/config');
const { getFileCategory, paginate, sortFiles, formatFileSize } = require('../utils/helpers');

function fileController(db) {
  const upload = (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const folderId = req.body.folder_id ? parseInt(req.body.folder_id) : null;
      if (folderId) {
        const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(folderId, req.user.id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
      }
      const uploadedFiles = [];
      const insertStmt = db.prepare(`INSERT INTO files (name, original_name, extension, mime_type, file_size, file_path, folder_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertMany = db.transaction((files) => {
        for (const file of files) {
          const ext = path.extname(file.originalname).toLowerCase().substring(1);
          const mime = file.mimetype || 'application/octet-stream';
          const category = getFileCategory(mime, ext);
          const result = insertStmt.run(
            file.filename,
            file.originalname,
            ext,
            mime,
            file.size,
            `/uploads/${req.user.id}/${file.filename}`,
            folderId,
            req.user.id
          );
          uploadedFiles.push({
            id: result.lastInsertRowid,
            name: file.filename,
            original_name: file.originalname,
            extension: ext,
            mime_type: mime,
            file_size: file.size,
            file_path: `/uploads/${req.user.id}/${file.filename}`,
            folder_id: folderId,
            category,
            created_at: new Date().toISOString(),
          });
        }
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        db.prepare('UPDATE users SET storage_used = storage_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(totalSize, req.user.id);
      });
      insertMany(req.files);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_name, details) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, 'upload', 'file',
        req.files.map(f => f.originalname).join(', '),
        `Uploaded ${req.files.length} file(s)`
      );
      res.status(201).json({ files: uploadedFiles, message: `${req.files.length} file(s) uploaded` });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  };

  const list = (req, res) => {
    try {
      const { folder_id, page = 1, limit = 50, sort = 'name', order = 'asc', type, search } = req.query;
      let query = 'SELECT * FROM files WHERE owner_id = ? AND is_deleted = 0';
      const params = [req.user.id];
      if (folder_id === 'null' || folder_id === 'undefined' || folder_id === '') {
        query += ' AND folder_id IS NULL';
      } else if (folder_id) {
        query += ' AND folder_id = ?';
        params.push(parseInt(folder_id));
      }
      if (type && type !== 'all') {
        if (type === 'image') { query += " AND mime_type LIKE 'image/%'"; }
        else if (type === 'video') { query += " AND mime_type LIKE 'video/%'"; }
        else if (type === 'audio') { query += " AND mime_type LIKE 'audio/%'"; }
        else if (type === 'document') { query += " AND (mime_type LIKE '%pdf%' OR mime_type LIKE '%word%' OR mime_type LIKE '%document%' OR mime_type LIKE '%sheet%' OR mime_type LIKE '%excel%' OR mime_type LIKE '%presentation%' OR mime_type LIKE '%powerpoint%')"; }
        else if (type === 'archive') { query += " AND (mime_type LIKE '%zip%' OR mime_type LIKE '%rar%' OR mime_type LIKE '%tar%' OR mime_type LIKE '%gz%')"; }
        else if (type === 'text') { query += " AND (mime_type LIKE 'text/%' OR extension IN ('json','html','css','js','ts','py','java','md','txt','xml','yaml','yml'))"; }
      }
      if (search) {
        query += ' AND original_name LIKE ?';
        params.push(`%${search}%`);
      }
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const countResult = db.prepare(countQuery).get(...params);
      const sortColumn = sort === 'size' ? 'file_size' : sort === 'date' ? 'created_at' : sort === 'type' ? 'extension' : 'original_name';
      const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sortColumn} ${sortOrder}`;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
      const files = db.prepare(query).all(...params);
      res.json({
        files,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / parseInt(limit)),
        }
      });
    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({ error: 'Failed to list files' });
    }
  };

  const download = (req, res) => {
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      const filePath = path.join(config.UPLOAD_DIR, String(req.user.id), file.name);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Type', file.mime_type);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Download failed' });
    }
  };

  const downloadMultiple = (req, res) => {
    try {
      const { file_ids } = req.body;
      if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
        return res.status(400).json({ error: 'No file IDs provided' });
      }
      const files = db.prepare(`SELECT * FROM files WHERE id IN (${file_ids.map(() => '?').join(',')}) AND owner_id = ? AND is_deleted = 0`).all(...file_ids, req.user.id);
      if (files.length === 0) return res.status(404).json({ error: 'No files found' });
      res.json({ files: files.map(f => ({ id: f.id, name: f.original_name, path: f.file_path, size: f.file_size })) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get files' });
    }
  };

  const preview = (req, res) => {
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      const filePath = path.join(config.UPLOAD_DIR, String(req.user.id), file.name);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', file.file_size);
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Preview failed' });
    }
  };

  const rename = (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      db.prepare('UPDATE files SET original_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, req.params.id);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, details) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.user.id, 'rename', 'file', file.id, name, `Renamed from "${file.original_name}" to "${name}"`
      );
      res.json({ message: 'File renamed', file: { ...file, original_name: name } });
    } catch (error) {
      res.status(500).json({ error: 'Rename failed' });
    }
  };

  const remove = (req, res) => {
    try {
      const ids = req.params.id.includes(',') ? req.params.id.split(',').map(Number) : [parseInt(req.params.id)];
      const placeholders = ids.map(() => '?').join(',');
      const files = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND owner_id = ? AND is_deleted = 0`).all(...ids, req.user.id);
      if (files.length === 0) return res.status(404).json({ error: 'Files not found' });
      db.prepare(`UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND owner_id = ?`).run(...ids, req.user.id);
      files.forEach(f => {
        db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, details) VALUES (?, ?, ?, ?, ?, ?)').run(
          req.user.id, 'delete', 'file', f.id, f.original_name, 'Moved to recycle bin'
        );
      });
      res.json({ message: `${files.length} file(s) moved to recycle bin` });
    } catch (error) {
      res.status(500).json({ error: 'Delete failed' });
    }
  };

  const permanentDelete = (req, res) => {
    try {
      const ids = req.params.id.includes(',') ? req.params.id.split(',').map(Number) : [parseInt(req.params.id)];
      const placeholders = ids.map(() => '?').join(',');
      const files = db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND owner_id = ? AND is_deleted = 1`).all(...ids, req.user.id);
      let totalSize = 0;
      files.forEach(f => {
        const filePath = path.join(config.UPLOAD_DIR, String(req.user.id), f.name);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        totalSize += f.file_size;
      });
      db.prepare(`DELETE FROM files WHERE id IN (${placeholders}) AND owner_id = ? AND is_deleted = 1`).run(...ids, req.user.id);
      if (totalSize > 0) {
        db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(totalSize, req.user.id);
      }
      res.json({ message: `${files.length} file(s) permanently deleted` });
    } catch (error) {
      res.status(500).json({ error: 'Permanent delete failed' });
    }
  };

  const restore = (req, res) => {
    try {
      const ids = req.params.id.includes(',') ? req.params.id.split(',').map(Number) : [parseInt(req.params.id)];
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE id IN (${placeholders}) AND owner_id = ? AND is_deleted = 1`).run(...ids, req.user.id);
      res.json({ message: 'File(s) restored' });
    } catch (error) {
      res.status(500).json({ error: 'Restore failed' });
    }
  };

  const toggleFavorite = (req, res) => {
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      const newFav = file.is_favorite ? 0 : 1;
      db.prepare('UPDATE files SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newFav, req.params.id);
      res.json({ is_favorite: newFav });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update favorite' });
    }
  };

  const getFavorites = (req, res) => {
    try {
      const files = db.prepare('SELECT * FROM files WHERE owner_id = ? AND is_favorite = 1 AND is_deleted = 0 ORDER BY updated_at DESC').all(req.user.id);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get favorites' });
    }
  };

  const getRecycleBin = (req, res) => {
    try {
      const files = db.prepare('SELECT * FROM files WHERE owner_id = ? AND is_deleted = 1 ORDER BY deleted_at DESC').all(req.user.id);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get recycle bin' });
    }
  };

  const move = (req, res) => {
    try {
      const { file_ids, folder_id } = req.body;
      if (!file_ids || !Array.isArray(file_ids)) return res.status(400).json({ error: 'File IDs required' });
      if (folder_id) {
        const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(folder_id, req.user.id);
        if (!folder) return res.status(404).json({ error: 'Destination folder not found' });
      }
      const placeholders = file_ids.map(() => '?').join(',');
      db.prepare(`UPDATE files SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND owner_id = ?`).run(folder_id || null, ...file_ids, req.user.id);
      res.json({ message: 'Files moved' });
    } catch (error) {
      res.status(500).json({ error: 'Move failed' });
    }
  };

  const copy = (req, res) => {
    try {
      const { file_id, folder_id } = req.body;
      const original = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(file_id, req.user.id);
      if (!original) return res.status(404).json({ error: 'File not found' });
      const srcPath = path.join(config.UPLOAD_DIR, String(req.user.id), original.name);
      const ext = path.extname(original.name);
      const base = path.basename(original.name, ext);
      const newName = `${base}_copy_${Date.now()}${ext}`;
      const destPath = path.join(config.UPLOAD_DIR, String(req.user.id), newName);
      if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
      const result = db.prepare('INSERT INTO files (name, original_name, extension, mime_type, file_size, file_path, folder_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        newName, `Copy of ${original.original_name}`, original.extension, original.mime_type, original.file_size,
        `/uploads/${req.user.id}/${newName}`, folder_id || original.folder_id, req.user.id
      );
      db.prepare('UPDATE users SET storage_used = storage_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(original.file_size, req.user.id);
      res.status(201).json({ file: { id: result.lastInsertRowid, name: newName, original_name: `Copy of ${original.original_name}` } });
    } catch (error) {
      res.status(500).json({ error: 'Copy failed' });
    }
  };

  const duplicate = (req, res) => {
    try {
      const original = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!original) return res.status(404).json({ error: 'File not found' });
      const srcPath = path.join(config.UPLOAD_DIR, String(req.user.id), original.name);
      const ext = path.extname(original.name);
      const base = path.basename(original.name, ext);
      const newName = `${base}_dup_${Date.now()}${ext}`;
      const destPath = path.join(config.UPLOAD_DIR, String(req.user.id), newName);
      if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
      const result = db.prepare('INSERT INTO files (name, original_name, extension, mime_type, file_size, file_path, folder_id, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        newName, original.original_name, original.extension, original.mime_type, original.file_size,
        `/uploads/${req.user.id}/${newName}`, original.folder_id, req.user.id
      );
      db.prepare('UPDATE users SET storage_used = storage_used + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(original.file_size, req.user.id);
      res.status(201).json({ file: { id: result.lastInsertRowid, name: newName } });
    } catch (error) {
      res.status(500).json({ error: 'Duplicate failed' });
    }
  };

  const getProperties = (req, res) => {
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!file) return res.status(404).json({ error: 'File not found' });
      const category = getFileCategory(file.mime_type, file.extension);
      res.json({
        file: {
          ...file,
          category,
          formatted_size: formatFileSize(file.file_size),
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get properties' });
    }
  };

  const exportAll = (req, res) => {
    try {
      const files = db.prepare('SELECT * FROM files WHERE owner_id = ? AND is_deleted = 0 ORDER BY original_name').all(req.user.id);
      if (files.length === 0) return res.status(404).json({ error: 'No files to export' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="vakki-prevet-export.zip"');

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', (err) => { throw err; });
      archive.pipe(res);

      files.forEach(file => {
        const filePath = path.join(config.UPLOAD_DIR, String(req.user.id), file.name);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file.original_name });
        }
      });

      archive.finalize();
    } catch (error) {
      console.error('Export error:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Export failed' });
    }
  };

  return { upload, list, download, downloadMultiple, preview, rename, remove, permanentDelete, restore, toggleFavorite, getFavorites, getRecycleBin, move, copy, duplicate, getProperties, exportAll };
}

module.exports = fileController;
