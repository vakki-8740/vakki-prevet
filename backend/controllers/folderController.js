function folderController(db) {
  const create = (req, res) => {
    try {
      const { name, color, parent_id } = req.body;
      if (!name) return res.status(400).json({ error: 'Folder name is required' });
      if (parent_id) {
        const parent = db.prepare('SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(parent_id, req.user.id);
        if (!parent) return res.status(404).json({ error: 'Parent folder not found' });
      }
      const existing = db.prepare('SELECT id FROM folders WHERE name = ? AND owner_id = ? AND parent_id IS ? AND is_deleted = 0').get(name, req.user.id, parent_id || null);
      if (existing) return res.status(409).json({ error: 'Folder with this name already exists' });
      const result = db.prepare('INSERT INTO folders (name, color, parent_id, owner_id) VALUES (?, ?, ?, ?)').run(name, color || '#007AFF', parent_id || null, req.user.id);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, details) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.user.id, 'create', 'folder', result.lastInsertRowid, name, `Created folder "${name}"`
      );
      res.status(201).json({
        folder: {
          id: result.lastInsertRowid,
          name,
          color: color || '#007AFF',
          parent_id: parent_id || null,
          owner_id: req.user.id,
          is_deleted: 0,
          created_at: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  };

  const list = (req, res) => {
    try {
      const { parent_id, search } = req.query;
      let query = 'SELECT * FROM folders WHERE owner_id = ? AND is_deleted = 0';
      const params = [req.user.id];
      if (parent_id === 'null' || parent_id === 'undefined' || parent_id === '') {
        query += ' AND parent_id IS NULL';
      } else if (parent_id) {
        query += ' AND parent_id = ?';
        params.push(parseInt(parent_id));
      }
      if (search) {
        query += ' AND name LIKE ?';
        params.push(`%${search}%`);
      }
      query += ' ORDER BY name ASC';
      const folders = db.prepare(query).all(...params);
      res.json({ folders });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list folders' });
    }
  };

  const getOne = (req, res) => {
    try {
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
      res.json({ folder });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get folder' });
    }
  };

  const rename = (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
      db.prepare('UPDATE folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, req.params.id);
      res.json({ message: 'Folder renamed', folder: { ...folder, name } });
    } catch (error) {
      res.status(500).json({ error: 'Rename failed' });
    }
  };

  const remove = (req, res) => {
    try {
      const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(req.params.id, req.user.id);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
      db.prepare('UPDATE folders SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
      const moveFilesToTrash = (folderId) => {
        const subfolders = db.prepare('SELECT id FROM folders WHERE parent_id = ? AND is_deleted = 0').all(folderId);
        subfolders.forEach(sf => moveFilesToTrash(sf.id));
        db.prepare('UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE folder_id = ? AND is_deleted = 0').run(folderId);
      };
      moveFilesToTrash(parseInt(req.params.id));
      db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, entity_name, details) VALUES (?, ?, ?, ?, ?, ?)').run(
        req.user.id, 'delete', 'folder', folder.id, folder.name, 'Moved to recycle bin'
      );
      res.json({ message: 'Folder moved to recycle bin' });
    } catch (error) {
      res.status(500).json({ error: 'Delete failed' });
    }
  };

  const move = (req, res) => {
    try {
      const { folder_ids, parent_id } = req.body;
      if (!folder_ids || !Array.isArray(folder_ids)) return res.status(400).json({ error: 'Folder IDs required' });
      if (parent_id) {
        const parent = db.prepare('SELECT id FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(parent_id, req.user.id);
        if (!parent) return res.status(404).json({ error: 'Destination folder not found' });
      }
      const placeholders = folder_ids.map(() => '?').join(',');
      db.prepare(`UPDATE folders SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND owner_id = ?`).run(parent_id || null, ...folder_ids, req.user.id);
      res.json({ message: 'Folders moved' });
    } catch (error) {
      res.status(500).json({ error: 'Move failed' });
    }
  };

  const getBreadcrumbs = (req, res) => {
    try {
      const breadcrumbs = [];
      let currentId = req.params.id ? parseInt(req.params.id) : null;
      while (currentId) {
        const folder = db.prepare('SELECT id, name, parent_id FROM folders WHERE id = ? AND owner_id = ? AND is_deleted = 0').get(currentId, req.user.id);
        if (!folder) break;
        breadcrumbs.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parent_id;
      }
      res.json({ breadcrumbs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get breadcrumbs' });
    }
  };

  return { create, list, getOne, rename, remove, move, getBreadcrumbs };
}

module.exports = folderController;
