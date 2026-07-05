let currentPage = 'dashboard';
let currentFolderId = null;
let currentSort = { by: 'name', order: 'asc' };
let currentView = 'grid';
let selectedFiles = new Set();
let contextMenuItem = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuth();
  initEventListeners();
});

function initEventListeners() {
  document.addEventListener('click', () => {
    document.getElementById('context-menu')?.classList.remove('show');
    document.getElementById('sort-dropdown')?.classList.remove('show');
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
    }
    if (e.key === 'Escape') {
      closeAllModals();
      closeImageViewer();
      closeVideoPlayer();
      closeAudioPlayer();
      closeTextViewer();
      closePdfViewer();
    }
  });

  document.addEventListener('contextmenu', (e) => {
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
      e.preventDefault();
      showContextMenu(e, fileItem);
    }
  });

  const uploadZone = document.getElementById('upload-zone');
  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', handleDrop);
    uploadZone.addEventListener('click', () => document.getElementById('file-input').click());
  }

  const modalUploadZone = document.getElementById('modal-upload-zone');
  if (modalUploadZone) {
    modalUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); modalUploadZone.classList.add('drag-over'); });
    modalUploadZone.addEventListener('dragleave', () => modalUploadZone.classList.remove('drag-over'));
    modalUploadZone.addEventListener('drop', handleModalDrop);
  }

  document.addEventListener('mousemove', (e) => {
    if (e.shiftKey && window._isDraggingFiles) return;
  });
}

function navigateTo(page, e) {
  if (e) e.preventDefault();
  currentPage = page;
  currentFolderId = null;
  selectedFiles.clear();
  updateSelectionUI();

  // Update sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sidebarItem = document.querySelector(`.sidebar .nav-item[data-page="${page}"]`);
  if (sidebarItem) sidebarItem.classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.nav-item-bottom').forEach(n => n.classList.remove('active'));
  const bottomItem = document.querySelector(`.nav-item-bottom[data-page="${page}"]`);
  if (bottomItem) bottomItem.classList.add('active');

  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'files': loadFiles(); break;
    case 'recent': loadRecentFiles(); break;
    case 'favorites': loadFavorites(); break;
    case 'trash': loadTrash(); break;
    case 'images': loadFilteredFiles('image', 'images'); break;
    case 'videos': loadFilteredFiles('video', 'videos'); break;
    case 'audio': loadFilteredFiles('audio', 'audio'); break;
    case 'documents': loadFilteredFiles('document', 'documents'); break;
    case 'settings': loadSettings(); break;
  }

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function navigateFolder(folderId, e) {
  if (e) e.preventDefault();
  currentFolderId = folderId;
  currentPage = 'files';
  selectedFiles.clear();
  updateSelectionUI();

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-page="files"]')?.classList.add('active');
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.getElementById('page-files')?.classList.add('active');

  loadFiles();
}

function updateUserUI() {
  if (!currentUser) return;
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-email').textContent = currentUser.email;
  document.getElementById('dash-user-name').textContent = currentUser.name;

  const used = currentUser.storage_used || 0;
  const limit = currentUser.storage_limit || 10 * 1024 * 1024 * 1024;
  const pct = Math.round((used / limit) * 100);
  document.getElementById('sidebar-storage-text').textContent = `${formatSize(used)} / ${formatSize(limit)}`;
  document.getElementById('sidebar-storage-fill').style.width = `${pct}%`;

  if (currentUser.avatar) {
    document.getElementById('sidebar-avatar').innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
  }
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  document.querySelectorAll('.files-container').forEach(c => {
    c.classList.remove('grid-view', 'list-view');
    c.classList.add(`${view}-view`);
  });
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function toggleSortDropdown() {
  document.getElementById('sort-dropdown').classList.toggle('show');
}

function sortFiles(by, order) {
  currentSort = { by, order };
  document.getElementById('sort-dropdown').classList.remove('show');
  if (currentPage === 'files') loadFiles();
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
  const category = getFileCategory(ext);
  return colors[category] || colors.other;
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

function getFileCategoryLabel(ext) {
  const labels = {
    image: 'Image', video: 'Video', audio: 'Audio', pdf: 'PDF',
    document: 'Document', spreadsheet: 'Spreadsheet', presentation: 'Presentation',
    archive: 'Archive', text: 'Text', other: 'File'
  };
  return labels[getFileCategory(ext)] || 'File';
}

function getFileTypeIcon(ext) {
  const category = getFileCategory(ext);
  const icons = {
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    spreadsheet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    presentation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
  };
  return icons[category] || icons.other;
}
