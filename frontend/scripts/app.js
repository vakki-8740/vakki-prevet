document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initEventListeners();
});

function initEventListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeImageViewer();
      closeVideoPlayer();
      closeAudioPlayer();
      closeTextViewer();
      closePdfViewer();
    }
  });

  document.addEventListener('click', (e) => {
    const fileItem = e.target.closest('.file-item');
    if (fileItem && !e.target.closest('.file-item-actions')) {
      const id = parseInt(fileItem.dataset.id);
      const files = window._allFiles || [];
      const file = files.find(f => f.id === id);
      if (file) openFile(file);
    }
  });
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function getFileIconColor(ext) {
  const colors = {
    image: '#34C759', video: '#FF3B30', audio: '#AF52DE',
    pdf: '#FF3B30', document: '#007AFF', spreadsheet: '#34C759',
    presentation: '#FF9500', archive: '#8E8E93', text: '#5856D6',
    other: '#8E8E93'
  };
  return colors[getFileCategory(ext)] || colors.other;
}

function getFileCategory(ext) {
  if (!ext) return 'other';
  ext = ext.toLowerCase().replace('.', '');
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['json', 'html', 'css', 'js', 'ts', 'py', 'java', 'xml', 'yaml', 'yml', 'md'].includes(ext)) return 'text';
  return 'other';
}

function getFileTypeIcon(ext) {
  const category = getFileCategory(ext);
  const icons = {
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
  };
  return icons[category] || icons.other;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
