const { formatFileSize, getFileCategory } = require('../utils/helpers');

function dashboardController(db) {
  const getStats = (req, res) => {
    try {
      const user = db.prepare('SELECT storage_used, storage_limit FROM users WHERE id = ?').get(req.user.id);
      const totalFiles = db.prepare('SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0').get(req.user.id);
      const totalFolders = db.prepare('SELECT COUNT(*) as count FROM folders WHERE owner_id = ? AND is_deleted = 0').get(req.user.id);
      const imageCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0 AND mime_type LIKE 'image/%'").get(req.user.id);
      const videoCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0 AND mime_type LIKE 'video/%'").get(req.user.id);
      const audioCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0 AND mime_type LIKE 'audio/%'").get(req.user.id);
      const documentCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0 AND (mime_type LIKE '%pdf%' OR mime_type LIKE '%word%' OR mime_type LIKE '%document%' OR mime_type LIKE '%sheet%' OR mime_type LIKE '%excel%' OR mime_type LIKE '%presentation%')").get(req.user.id);
      const otherCount = db.prepare("SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 0 AND mime_type NOT LIKE 'image/%' AND mime_type NOT LIKE 'video/%' AND mime_type NOT LIKE 'audio/%' AND mime_type NOT LIKE '%pdf%' AND mime_type NOT LIKE '%word%' AND mime_type NOT LIKE '%document%' AND mime_type NOT LIKE '%sheet%' AND mime_type NOT LIKE '%excel%' AND mime_type NOT LIKE '%presentation%'").get(req.user.id);
      const favoriteCount = db.prepare('SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_favorite = 1 AND is_deleted = 0').get(req.user.id);
      const deletedCount = db.prepare('SELECT COUNT(*) as count FROM files WHERE owner_id = ? AND is_deleted = 1').get(req.user.id);

      const storageByType = db.prepare(`
        SELECT
          CASE
            WHEN mime_type LIKE 'image/%' THEN 'Images'
            WHEN mime_type LIKE 'video/%' THEN 'Videos'
            WHEN mime_type LIKE 'audio/%' THEN 'Audio'
            WHEN mime_type LIKE '%pdf%' OR mime_type LIKE '%word%' OR mime_type LIKE '%document%' THEN 'Documents'
            ELSE 'Other'
          END as type,
          SUM(file_size) as size,
          COUNT(*) as count
        FROM files WHERE owner_id = ? AND is_deleted = 0
        GROUP BY type
      `).all(req.user.id);

      const recentFiles = db.prepare('SELECT * FROM files WHERE owner_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 10').all(req.user.id);
      const recentActivity = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);

      res.json({
        storage: {
          used: user.storage_used,
          limit: user.storage_limit,
          percentage: Math.round((user.storage_used / user.storage_limit) * 100),
          formatted_used: formatFileSize(user.storage_used),
          formatted_limit: formatFileSize(user.storage_limit),
        },
        counts: {
          files: totalFiles.count,
          folders: totalFolders.count,
          images: imageCount.count,
          videos: videoCount.count,
          audio: audioCount.count,
          documents: documentCount.count,
          other: otherCount.count,
          favorites: favoriteCount.count,
          deleted: deletedCount.count,
        },
        storageByType,
        recentFiles,
        recentActivity,
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  };

  const getActivity = (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const total = db.prepare('SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ?').get(req.user.id);
      const activities = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(req.user.id, parseInt(limit), offset);
      res.json({
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total.count,
          pages: Math.ceil(total.count / parseInt(limit)),
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get activity' });
    }
  };

  return { getStats, getActivity };
}

module.exports = dashboardController;
