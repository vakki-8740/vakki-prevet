function openUploadModal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) startUpload(files);
  };
  input.click();
}

async function startUpload(files) {
  const overlay = document.getElementById('upload-overlay');
  const list = document.getElementById('upload-sheet-list');
  const fill = document.getElementById('upload-sheet-fill');
  const text = document.getElementById('upload-progress-text');

  list.innerHTML = '';
  fill.style.width = '0%';
  text.textContent = '0%';
  overlay.style.display = 'flex';

  let total = files.length;
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop().toLowerCase();
    const color = getFileIconColor(ext);

    const item = document.createElement('div');
    item.className = 'upload-sheet-item';
    item.id = `ul-${Date.now()}-${i}`;
    item.innerHTML = `
      <div class="upload-item-icon" style="background:linear-gradient(135deg,${color},${color}dd)">${getFileTypeIcon(ext)}</div>
      <div class="upload-item-info">
        <div class="upload-item-name">${escapeHtml(file.name)}</div>
        <div class="upload-item-size">${formatSize(file.size)}</div>
        <div class="upload-item-progress"><div class="upload-item-progress-fill" style="width:0%"></div></div>
      </div>
      <div class="upload-item-status pending">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
      </div>
    `;
    list.appendChild(item);

    try {
      const pFill = item.querySelector('.upload-item-progress-fill');
      const status = item.querySelector('.upload-item-status');

      status.className = 'upload-item-status uploading';
      status.innerHTML = '<div class="spinner-sm"></div>';

      const formData = new FormData();
      formData.append('files', file);

      await API.upload('/files/upload', formData, (pct) => {
        if (pFill) pFill.style.width = `${pct}%`;
        const overall = Math.round(((completed + (pct / 100)) / total) * 100);
        fill.style.width = `${overall}%`;
        text.textContent = `${overall}%`;
      });

      pFill.style.width = '100%';
      pFill.style.background = '#34C759';
      status.className = 'upload-item-status done';
      status.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      completed++;

    } catch (err) {
      const pFill = item.querySelector('.upload-item-progress-fill');
      if (pFill) { pFill.style.width = '100%'; pFill.style.background = '#FF3B30'; }
      const status = item.querySelector('.upload-item-status');
      status.className = 'upload-item-status error';
      status.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      failed++;
    }

    const pct = Math.round(((completed + failed) / total) * 100);
    fill.style.width = `${pct}%`;
    text.textContent = `${pct}%`;
  }

  if (completed > 0) {
    showToast(`${completed} file(s) uploaded successfully`, 'success');
    setTimeout(() => {
      overlay.style.display = 'none';
      loadAllFiles();
    }, 1200);
  } else {
    showToast('Upload failed', 'error');
    setTimeout(() => overlay.style.display = 'none', 1500);
  }
}
