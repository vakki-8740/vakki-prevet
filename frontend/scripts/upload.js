let pendingUploads = [];
let isUploading = false;

function openUploadModal() {
  pendingUploads = [];
  document.getElementById('upload-list').innerHTML = '';
  document.getElementById('upload-start-btn').style.display = 'none';
  openModal('upload-modal');
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  addFilesToUploadList(files);
  event.target.value = '';
}

function handleModalFileSelect(event) {
  const files = Array.from(event.target.files);
  addFilesToUploadList(files);
  event.target.value = '';
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  if (files.length > 0) {
    addFilesToUploadList(files);
    openUploadModal();
  }
}

function handleModalDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const files = Array.from(event.dataTransfer.files);
  addFilesToUploadList(files);
}

function addFilesToUploadList(files) {
  const uploadList = document.getElementById('upload-list');
  const startBtn = document.getElementById('upload-start-btn');

  files.forEach(file => {
    if (file.size > 500 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 500MB)`, 'error');
      return;
    }
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = file.name.split('.').pop().toLowerCase();
    const color = getFileIconColor(ext);

    pendingUploads.push({ id, file, status: 'pending' });

    const el = document.createElement('div');
    el.className = 'upload-item';
    el.id = id;
    el.innerHTML = `
      <div class="upload-item-icon" style="background: linear-gradient(135deg, ${color}, ${color}dd)">
        ${getFileTypeIcon(ext)}
      </div>
      <div class="upload-item-info">
        <div class="upload-item-name">${escapeHtml(file.name)}</div>
        <div class="upload-item-size">${formatSize(file.size)}</div>
        <div class="upload-item-progress"><div class="upload-item-progress-fill" style="width:0%"></div></div>
      </div>
      <button class="upload-item-remove" onclick="removePendingUpload('${id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    uploadList.appendChild(el);
  });

  if (pendingUploads.length > 0) {
    startBtn.style.display = 'inline-flex';
  }
}

function removePendingUpload(id) {
  pendingUploads = pendingUploads.filter(u => u.id !== id);
  document.getElementById(id)?.remove();
  if (pendingUploads.length === 0) {
    document.getElementById('upload-start-btn').style.display = 'none';
  }
}

async function startUpload() {
  if (isUploading || pendingUploads.length === 0) return;
  isUploading = true;

  const startBtn = document.getElementById('upload-start-btn');
  startBtn.disabled = true;
  startBtn.textContent = 'Uploading...';

  let successCount = 0;
  let failCount = 0;

  for (const item of pendingUploads) {
    if (item.status !== 'pending') continue;
    item.status = 'uploading';

    const el = document.getElementById(item.id);
    const progressFill = el?.querySelector('.upload-item-progress-fill');
    const removeBtn = el?.querySelector('.upload-item-remove');

    if (removeBtn) removeBtn.style.display = 'none';

    try {
      const formData = new FormData();
      formData.append('files', item.file);
      if (currentFolderId) formData.append('folder_id', currentFolderId);

      await API.upload('/files/upload', formData, (pct) => {
        if (progressFill) progressFill.style.width = `${pct}%`;
      });

      item.status = 'done';
      if (progressFill) {
        progressFill.style.width = '100%';
        progressFill.style.background = 'var(--success)';
      }
      successCount++;
    } catch (error) {
      item.status = 'error';
      if (progressFill) {
        progressFill.style.width = '100%';
        progressFill.style.background = 'var(--danger)';
      }
      failCount++;
    }
  }

  isUploading = false;
  startBtn.disabled = false;
  startBtn.textContent = 'Upload';
  document.getElementById('upload-start-btn').style.display = 'none';

  if (successCount > 0) {
    showToast(`${successCount} file(s) uploaded successfully`, 'success');
    loadProfile();
    refreshCurrentPage();
  }
  if (failCount > 0) {
    showToast(`${failCount} file(s) failed to upload`, 'error');
  }

  pendingUploads = [];
}
