let currentFilesPage = 1;
const filesPerPage = 50;

async function loadFiles(page = 1) {
  const container = document.getElementById('files-container');
  const loading = document.getElementById('files-loading');
  const empty = document.getElementById('files-empty');
  const pagination = document.getElementById('pagination');

  container.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';
  pagination.innerHTML = '';

  try {
    const params = new URLSearchParams({
      page, limit: filesPerPage,
      sort: currentSort.by, order: currentSort.order
    });
    if (currentFolderId) params.set('folder_id', currentFolderId);

    const result = await API.get(`/files?${params}`);
    loading.style.display = 'none';

    updateBreadcrumb();

    if (result.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }

    const folders = await loadFoldersForCurrentFolder();
    renderFolders(folders, container);
    result.files.forEach(file => renderFileItem(file, container));

    if (result.pagination.pages > 1) {
      renderPagination(result.pagination, pagination);
    }
  } catch (error) {
    loading.style.display = 'none';
    showToast(error.message, 'error');
  }
}

async function loadFoldersForCurrentFolder() {
  try {
    const params = new URLSearchParams();
    if (currentFolderId) params.set('parent_id', currentFolderId);
    const result = await API.get(`/folders?${params}`);
    return result.folders || [];
  } catch (e) {
    return [];
  }
}

function renderFolders(folders, container) {
  folders.forEach(folder => {
    const el = document.createElement('div');
    el.className = 'file-item';
    el.innerHTML = `
      <div class="file-item-preview">
        <div class="file-icon" style="background: ${folder.color || '#007AFF'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="32" height="32">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
        </div>
      </div>
      <div class="file-item-info">
        <div class="file-item-name">${escapeHtml(folder.name)}</div>
        <div class="file-item-meta">Folder</div>
      </div>
    `;
    el.addEventListener('dblclick', () => navigateFolder(folder.id));
    el.addEventListener('click', (e) => {
      if (e.target.closest('.file-item-favorite')) return;
      toggleFileSelection(el, folder.id, 'folder');
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      contextMenuItem = { id: folder.id, type: 'folder', name: folder.name, data: folder };
      showContextMenu(e, el);
    });
    container.appendChild(el);
  });
}

function renderFileItem(file, container) {
  const el = document.createElement('div');
  el.className = 'file-item';
  el.dataset.id = file.id;
  el.dataset.type = 'file';

  const ext = file.extension || '';
  const category = getFileCategory(ext);
  const color = getFileIconColor(ext);

  let preview = '';
  if (category === 'image') {
    preview = `<img src="/api/files/${file.id}/preview" alt="${escapeHtml(file.original_name)}" loading="lazy">`;
  } else {
    preview = `<div class="file-icon" style="background: linear-gradient(135deg, ${color}, ${color}dd)">${getFileTypeIcon(ext)}</div>`;
  }

  el.innerHTML = `
    <div class="file-item-checkbox" onclick="event.stopPropagation(); toggleFileSelection(this.closest('.file-item'), ${file.id}, 'file')"></div>
    <button class="file-item-favorite ${file.is_favorite ? 'is-fav' : ''}" onclick="event.stopPropagation(); toggleFavorite(${file.id}, this)">
      <svg viewBox="0 0 24 24" fill="${file.is_favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </button>
    <div class="file-item-preview">${preview}</div>
    <div class="file-item-info">
      <div class="file-item-name" title="${escapeHtml(file.original_name)}">${escapeHtml(file.original_name)}</div>
      <div class="file-item-meta">${formatSize(file.file_size)} · ${formatDate(file.created_at)}</div>
    </div>
  `;

  el.addEventListener('click', (e) => {
    if (e.target.closest('.file-item-checkbox') || e.target.closest('.file-item-favorite')) return;
    toggleFileSelection(el, file.id, 'file');
  });

  el.addEventListener('dblclick', () => openFile(file));

  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenuItem = { id: file.id, type: 'file', name: file.original_name, data: file };
    showContextMenu(e, el);
  });

  container.appendChild(el);
}

async function loadFilteredFiles(type, containerId) {
  const container = document.getElementById(`${containerId}-container`);
  const empty = document.getElementById(`${containerId}-empty`);
  container.innerHTML = '';
  empty.style.display = 'none';

  try {
    const result = await API.get(`/files?type=${type}&limit=100`);
    if (result.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }
    result.files.forEach(file => renderFileItem(file, container));
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadRecentFiles() {
  const container = document.getElementById('recent-container');
  const empty = document.getElementById('recent-empty');
  container.innerHTML = '';
  empty.style.display = 'none';

  try {
    const result = await API.get('/files?sort=date&order=desc&limit=50');
    if (result.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }
    result.files.forEach(file => renderFileItem(file, container));
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadFavorites() {
  const container = document.getElementById('favorites-container');
  const empty = document.getElementById('favorites-empty');
  container.innerHTML = '';
  empty.style.display = 'none';

  try {
    const result = await API.get('/files/favorites');
    if (result.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }
    result.files.forEach(file => renderFileItem(file, container));
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadTrash() {
  const container = document.getElementById('trash-container');
  const empty = document.getElementById('trash-empty');
  const emptyTrashBtn = document.getElementById('empty-trash-btn');
  container.innerHTML = '';
  empty.style.display = 'none';

  try {
    const result = await API.get('/files/recycle-bin');
    if (result.files.length === 0) {
      empty.style.display = 'flex';
      emptyTrashBtn.style.display = 'none';
      return;
    }
    emptyTrashBtn.style.display = 'inline-flex';
    result.files.forEach(file => {
      const el = document.createElement('div');
      el.className = 'file-item';
      const ext = file.extension || '';
      const color = getFileIconColor(ext);
      el.innerHTML = `
        <div class="file-item-preview">
          <div class="file-icon" style="background: linear-gradient(135deg, ${color}, ${color}dd)">${getFileTypeIcon(ext)}</div>
        </div>
        <div class="file-item-info">
          <div class="file-item-name">${escapeHtml(file.original_name)}</div>
          <div class="file-item-meta">Deleted ${formatDate(file.deleted_at)}</div>
        </div>
        <div style="padding:8px; display:flex; gap:8px;">
          <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px" onclick="restoreFile(${file.id})">Restore</button>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:12px" onclick="permanentDeleteFile(${file.id})">Delete</button>
        </div>
      `;
      container.appendChild(el);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let html = `<a href="#" onclick="navigateFolder(null, event)">My Files</a>`;

  if (currentFolderId) {
    try {
      const result = await API.get(`/folders/${currentFolderId}/breadcrumbs`);
      result.breadcrumbs.forEach((b, i) => {
        html += `<span class="separator">/</span>`;
        if (i === result.breadcrumbs.length - 1) {
          html += `<span class="current">${escapeHtml(b.name)}</span>`;
        } else {
          html += `<a href="#" onclick="navigateFolder(${b.id}, event)">${escapeHtml(b.name)}</a>`;
        }
      });
    } catch (e) {}
  }

  breadcrumb.innerHTML = html;
}

function renderPagination(pagination, container) {
  let html = '';
  html += `<button ${pagination.page <= 1 ? 'disabled' : ''} onclick="loadFiles(${pagination.page - 1})">Prev</button>`;
  for (let i = 1; i <= pagination.pages; i++) {
    if (i === 1 || i === pagination.pages || Math.abs(i - pagination.page) <= 2) {
      html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadFiles(${i})">${i}</button>`;
    } else if (Math.abs(i - pagination.page) === 3) {
      html += `<button disabled>...</button>`;
    }
  }
  html += `<button ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="loadFiles(${pagination.page + 1})">Next</button>`;
  container.innerHTML = html;
}

function toggleFileSelection(el, id, type) {
  const key = `${type}-${id}`;
  if (selectedFiles.has(key)) {
    selectedFiles.delete(key);
    el.classList.remove('selected');
  } else {
    selectedFiles.add(key);
    el.classList.add('selected');
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const actions = document.getElementById('selection-actions');
  const count = document.getElementById('selection-count');
  if (selectedFiles.size > 0) {
    actions.style.display = 'flex';
    count.textContent = `${selectedFiles.size} selected`;
  } else {
    actions.style.display = 'none';
  }
}

async function toggleFavorite(fileId, btn) {
  try {
    const result = await API.put(`/files/${fileId}/favorite`);
    if (result.is_favorite) {
      btn.classList.add('is-fav');
      btn.querySelector('svg').setAttribute('fill', 'currentColor');
    } else {
      btn.classList.remove('is-fav');
      btn.querySelector('svg').setAttribute('fill', 'none');
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function openFile(file) {
  const ext = (file.extension || '').toLowerCase();
  const category = getFileCategory(ext);

  switch (category) {
    case 'image': openImageViewer(file); break;
    case 'video': openVideoPlayer(file); break;
    case 'audio': openAudioPlayer(file); break;
    case 'pdf': openPdfViewer(file); break;
    case 'text': openTextViewer(file); break;
    default: downloadFile(file.id); break;
  }
}

async function downloadFile(fileId) {
  try {
    const response = await fetch(`/api/files/${fileId}/download`, {
      headers: { 'Authorization': `Bearer ${API.token}` }
    });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = 'download';
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) filename = decodeURIComponent(match[1]);
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download started', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteFile(fileId) {
  try {
    await API.delete(`/files/${fileId}`);
    showToast('File moved to trash', 'success');
    refreshCurrentPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function restoreFile(fileId) {
  try {
    await API.post(`/files/restore/${fileId}`);
    showToast('File restored', 'success');
    loadTrash();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function permanentDeleteFile(fileId) {
  if (!confirm('This will permanently delete the file. Continue?')) return;
  try {
    await API.delete(`/files/permanent/${fileId}`);
    showToast('File permanently deleted', 'success');
    loadTrash();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function emptyTrash() {
  if (!confirm('Permanently delete all files in trash?')) return;
  try {
    const result = await API.get('/files/recycle-bin');
    for (const file of result.files) {
      await API.delete(`/files/permanent/${file.id}`);
    }
    showToast('Trash emptied', 'success');
    loadTrash();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showRenameModal(id, name, type) {
  document.getElementById('rename-input').value = name;
  document.getElementById('rename-input').dataset.id = id;
  document.getElementById('rename-input').dataset.type = type;
  openModal('rename-modal');
}

async function confirmRename() {
  const input = document.getElementById('rename-input');
  const id = input.dataset.id;
  const type = input.dataset.type;
  const name = input.value.trim();
  if (!name) return;

  try {
    if (type === 'folder') {
      await API.put(`/folders/${id}/rename`, { name });
    } else {
      await API.put(`/files/${id}/rename`, { name });
    }
    closeModal();
    showToast('Renamed successfully', 'success');
    refreshCurrentPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function createFolder() {
  const name = document.getElementById('folder-name-input').value.trim();
  if (!name) return;
  const colorEl = document.querySelector('.color-option.active');
  const color = colorEl ? colorEl.dataset.color : '#007AFF';

  try {
    await API.post('/folders', { name, color, parent_id: currentFolderId });
    closeModal();
    showToast('Folder created', 'success');
    document.getElementById('folder-name-input').value = '';
    refreshCurrentPage();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function selectFolderColor(el) {
  document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function openCreateFolderModal() {
  openModal('folder-modal');
  setTimeout(() => document.getElementById('folder-name-input').focus(), 100);
}

async function deleteSelected() {
  if (selectedFiles.size === 0) return;
  if (!confirm(`Delete ${selectedFiles.size} item(s)?`)) return;

  const fileIds = [];
  for (const key of selectedFiles) {
    if (key.startsWith('file-')) fileIds.push(parseInt(key.replace('file-', '')));
  }

  if (fileIds.length > 0) {
    try {
      await API.delete(`/files/${fileIds.join(',')}`);
      showToast(`${fileIds.length} file(s) moved to trash`, 'success');
      selectedFiles.clear();
      updateSelectionUI();
      refreshCurrentPage();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }
}

async function downloadSelected() {
  for (const key of selectedFiles) {
    if (key.startsWith('file-')) {
      const id = parseInt(key.replace('file-', ''));
      await downloadFile(id);
    }
  }
}

function refreshCurrentPage() {
  switch (currentPage) {
    case 'files': loadFiles(); break;
    case 'recent': loadRecentFiles(); break;
    case 'favorites': loadFavorites(); break;
    case 'trash': loadTrash(); break;
    case 'images': loadFilteredFiles('image', 'images'); break;
    case 'videos': loadFilteredFiles('video', 'videos'); break;
    case 'audio': loadFilteredFiles('audio', 'audio'); break;
    case 'documents': loadFilteredFiles('document', 'documents'); break;
    case 'dashboard': loadDashboard(); break;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
