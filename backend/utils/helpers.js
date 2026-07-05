function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileCategory(mimeType, extension) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document') || extension === 'doc' || extension === 'docx') return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || extension === 'xls' || extension === 'xlsx') return 'spreadsheet';
  if (mimeType.includes('presentation') || extension === 'ppt' || extension === 'pptx') return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz') || extension === '7z') return 'archive';
  if (mimeType.startsWith('text/') || ['json', 'html', 'css', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'rb', 'php', 'xml', 'yaml', 'yml', 'md', 'txt', 'log', 'ini', 'cfg', 'conf'].includes(extension)) return 'text';
  return 'other';
}

function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .trim();
}

function generateUniqueFilename(originalName) {
  const ext = require('path').extname(originalName);
  const base = require('path').basename(originalName, ext);
  const safe = sanitizeFilename(base);
  const uuid = require('uuid').v4().substring(0, 8);
  const timestamp = Date.now();
  return `${safe}_${timestamp}_${uuid}${ext}`;
}

function paginate(array, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const items = array.slice(offset, offset + limit);
  return {
    items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: array.length,
      pages: Math.ceil(array.length / limit),
      hasNext: offset + limit < array.length,
      hasPrev: page > 1,
    },
  };
}

function sortFiles(files, sortBy = 'name', order = 'asc') {
  const sorted = [...files];
  sorted.sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'name': valA = a.original_name.toLowerCase(); valB = b.original_name.toLowerCase(); break;
      case 'size': valA = a.file_size; valB = b.file_size; break;
      case 'date': valA = a.created_at; valB = b.created_at; break;
      case 'type': valA = a.extension.toLowerCase(); valB = b.extension.toLowerCase(); break;
      default: valA = a.original_name.toLowerCase(); valB = b.original_name.toLowerCase();
    }
    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

module.exports = { formatFileSize, getFileCategory, sanitizeFilename, generateUniqueFilename, paginate, sortFiles };
