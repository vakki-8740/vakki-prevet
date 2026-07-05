function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function openModal(id) {
  document.getElementById('modal-overlay').classList.add('show');
  document.getElementById(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  document.body.style.overflow = '';
}

function closeAllModals() {
  closeModal();
}

function showContextMenu(e, el) {
  const menu = document.getElementById('context-menu');
  menu.classList.add('show');
  menu.style.left = `${Math.min(e.clientX, window.innerWidth - 220)}px`;
  menu.style.top = `${Math.min(e.clientY, window.innerHeight - 300)}px`;
}

function contextAction(action) {
  document.getElementById('context-menu').classList.remove('show');
  if (!contextMenuItem) return;

  const { id, type, name, data } = contextMenuItem;

  switch (action) {
    case 'open':
      if (type === 'folder') navigateFolder(id);
      else openFile(data);
      break;
    case 'preview':
      if (type === 'file') openFile(data);
      break;
    case 'download':
      if (type === 'file') downloadFile(id);
      break;
    case 'rename':
      showRenameModal(id, name, type);
      break;
    case 'favorite':
      if (type === 'file') {
        const btn = document.querySelector(`[data-id="${id}"] .file-item-favorite`);
        if (btn) toggleFavorite(id, btn);
      }
      break;
    case 'duplicate':
      if (type === 'file') duplicateFile(id);
      break;
    case 'properties':
      showProperties(id, type);
      break;
    case 'delete':
      if (type === 'file') deleteFile(id);
      else deleteFolder(id);
      break;
  }
}

async function duplicateFile(fileId) {
  try {
    await API.post(`/files/${fileId}/duplicate`);
    showToast('File duplicated', 'success');
    refreshCurrentPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteFolder(folderId) {
  if (!confirm('Move this folder and all its contents to trash?')) return;
  try {
    await API.delete(`/folders/${folderId}`);
    showToast('Folder moved to trash', 'success');
    refreshCurrentPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function showProperties(id, type) {
  const content = document.getElementById('properties-content');
  try {
    let data;
    if (type === 'file') {
      data = await API.get(`/files/${id}/properties`);
      const file = data.file;
      content.innerHTML = `
        <div class="properties-grid">
          <div class="property-row"><span class="property-label">Name</span><span class="property-value">${escapeHtml(file.original_name)}</span></div>
          <div class="property-row"><span class="property-label">Type</span><span class="property-value">${getFileCategoryLabel(file.extension)}</span></div>
          <div class="property-row"><span class="property-label">Size</span><span class="property-value">${file.formatted_size}</span></div>
          <div class="property-row"><span class="property-label">Extension</span><span class="property-value">.${file.extension || 'none'}</span></div>
          <div class="property-row"><span class="property-label">MIME Type</span><span class="property-value">${file.mime_type}</span></div>
          <div class="property-row"><span class="property-label">Created</span><span class="property-value">${new Date(file.created_at).toLocaleString()}</span></div>
          <div class="property-row"><span class="property-label">Modified</span><span class="property-value">${new Date(file.updated_at).toLocaleString()}</span></div>
          <div class="property-row"><span class="property-label">Favorite</span><span class="property-value">${file.is_favorite ? 'Yes' : 'No'}</span></div>
        </div>
      `;
    } else {
      data = await API.get(`/folders/${id}`);
      const folder = data.folder;
      content.innerHTML = `
        <div class="properties-grid">
          <div class="property-row"><span class="property-label">Name</span><span class="property-value">${escapeHtml(folder.name)}</span></div>
          <div class="property-row"><span class="property-label">Type</span><span class="property-value">Folder</span></div>
          <div class="property-row"><span class="property-label">Color</span><span class="property-value"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${folder.color};vertical-align:middle"></span> ${folder.color}</span></div>
          <div class="property-row"><span class="property-label">Created</span><span class="property-value">${new Date(folder.created_at).toLocaleString()}</span></div>
        </div>
      `;
    }
    openModal('properties-modal');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const result = await API.get('/dashboard/stats');

    document.getElementById('stat-files').textContent = result.counts.files;
    document.getElementById('stat-folders').textContent = result.counts.folders;
    document.getElementById('stat-images').textContent = result.counts.images;
    document.getElementById('stat-videos').textContent = result.counts.videos;

    document.getElementById('storage-used').textContent = result.storage.formatted_used;
    document.getElementById('storage-limit').textContent = result.storage.formatted_limit;
    document.getElementById('storage-percentage').textContent = `${result.storage.percentage}%`;

    const circle = document.getElementById('storage-circle-fill');
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (result.storage.percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    const chart = document.getElementById('storage-chart');
    chart.innerHTML = '';
    const typeColors = { Images: '#34C759', Videos: '#FF3B30', Audio: '#AF52DE', Documents: '#007AFF', Other: '#8E8E93' };
    result.storageByType.forEach(item => {
      const color = typeColors[item.type] || '#8E8E93';
      const pct = result.storage.used > 0 ? (item.size / result.storage.used) * 100 : 0;
      chart.innerHTML += `
        <div class="chart-legend-item" style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0"></span>
          <span style="font-size:12px;flex:1">${item.type}</span>
          <span style="font-size:12px;color:var(--text-secondary)">${formatSize(item.size)}</span>
        </div>
      `;
    });

    const recentList = document.getElementById('recent-files-list');
    recentList.innerHTML = '';
    if (result.recentFiles.length === 0) {
      recentList.innerHTML = '<p style="padding:16px;color:var(--text-secondary);font-size:14px;text-align:center">No files yet</p>';
    } else {
      result.recentFiles.forEach(file => {
        const ext = file.extension || '';
        const color = getFileIconColor(ext);
        recentList.innerHTML += `
          <div class="recent-item" onclick="openFile(${JSON.stringify(file).replace(/"/g, '&quot;')})">
            <div class="recent-item-icon" style="background:${color}15;color:${color}">
              ${getFileTypeIcon(ext)}
            </div>
            <div class="recent-item-info">
              <div class="recent-item-name">${escapeHtml(file.original_name)}</div>
              <div class="recent-item-meta">${formatSize(file.file_size)} · ${formatDate(file.created_at)}</div>
            </div>
          </div>
        `;
      });
    }

    const activityList = document.getElementById('activity-list');
    activityList.innerHTML = '';
    if (result.recentActivity.length === 0) {
      activityList.innerHTML = '<p style="padding:16px;color:var(--text-secondary);font-size:14px;text-align:center">No activity yet</p>';
    } else {
      result.recentActivity.slice(0, 10).forEach(log => {
        const actionColors = { upload: '#34C759', delete: '#FF3B30', rename: '#FF9500', create: '#007AFF', login: '#5856D6', logout: '#8E8E93', register: '#AF52DE' };
        const color = actionColors[log.action] || '#8E8E93';
        activityList.innerHTML += `
          <div class="activity-item">
            <div class="activity-item-icon" style="background:${color}15;color:${color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                ${log.action === 'upload' ? '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' :
                  log.action === 'delete' ? '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>' :
                  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>'}
              </svg>
            </div>
            <div class="activity-item-info">
              <div class="activity-item-action">${escapeHtml(log.details || log.action)}</div>
              <div class="activity-item-time">${formatDate(log.created_at)}</div>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

// Settings
async function loadSettings() {
  if (!currentUser) return;
  document.getElementById('settings-name').value = currentUser.name || '';
  document.getElementById('settings-username').value = currentUser.username || '';
  document.getElementById('settings-email').value = currentUser.email || '';
  document.getElementById('settings-joined').textContent = currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : '-';

  if (currentUser.avatar) {
    document.getElementById('settings-avatar').innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
  }

  const used = currentUser.storage_used || 0;
  const limit = currentUser.storage_limit || 10 * 1024 * 1024 * 1024;
  const pct = Math.round((used / limit) * 100);
  document.getElementById('settings-storage-fill').style.width = `${pct}%`;
  document.getElementById('settings-storage-text').textContent = `${formatSize(used)} used of ${formatSize(limit)}`;

  const theme = currentUser.theme || 'auto';
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === theme);
  });
}

async function updateProfile() {
  const name = document.getElementById('settings-name').value.trim();
  const username = document.getElementById('settings-username').value.trim();
  const email = document.getElementById('settings-email').value.trim();
  try {
    const result = await API.put('/user/profile', { name, username: username || undefined, email });
    currentUser = result.user;
    updateUserUI();
    showToast('Profile updated', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function changePassword() {
  const current = document.getElementById('current-password').value;
  const newPass = document.getElementById('new-password').value;
  if (!current || !newPass) {
    showToast('Please fill in both fields', 'warning');
    return;
  }
  try {
    await API.put('/user/password', { currentPassword: current, newPassword: newPass });
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    showToast('Password changed', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const result = await API.upload('/user/avatar', formData);
    currentUser.avatar = result.avatar;
    updateUserUI();
    document.getElementById('settings-avatar').innerHTML = `<img src="${result.avatar}" alt="Avatar">`;
    showToast('Avatar updated', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
  event.target.value = '';
}

// Theme
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === 'light');
  });
}

// Search
let searchTimeout = null;
function handleGlobalSearch(query) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (query.trim()) {
      currentPage = 'files';
      currentFolderId = null;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelector('[data-page="files"]')?.classList.add('active');
      document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
      document.getElementById('page-files')?.classList.add('active');
      searchFiles(query);
    } else {
      loadFiles();
    }
  }, 300);
}

async function searchFiles(query) {
  const container = document.getElementById('files-container');
  const loading = document.getElementById('files-loading');
  const empty = document.getElementById('files-empty');
  const pagination = document.getElementById('pagination');

  container.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';
  pagination.innerHTML = '';

  try {
    const result = await API.get(`/files?search=${encodeURIComponent(query)}&limit=100`);
    loading.style.display = 'none';
    document.getElementById('breadcrumb').innerHTML = `<span class="current">Search: "${escapeHtml(query)}"</span>`;

    if (result.files.length === 0) {
      empty.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><h3>No results found</h3><p>Try a different search term</p>`;
      empty.style.display = 'flex';
      return;
    }
    result.files.forEach(file => renderFileItem(file, container));
  } catch (error) {
    loading.style.display = 'none';
    showToast(error.message, 'error');
  }
}

function toggleNotifications() {
  showToast('No new notifications', 'info');
}

// Properties styles
const propsStyle = document.createElement('style');
propsStyle.textContent = `
  .properties-grid { display: flex; flex-direction: column; gap: 12px; }
  .property-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .property-label { font-size: 14px; color: var(--text-secondary); }
  .property-value { font-size: 14px; font-weight: 500; text-align: right; max-width: 60%; word-break: break-all; }
`;
document.head.appendChild(propsStyle);
