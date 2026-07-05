async function loadAllFiles() {
  const container = document.getElementById('files-container');
  const loading = document.getElementById('files-loading');
  const empty = document.getElementById('files-empty');
  const count = document.getElementById('files-count');

  container.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';
  count.textContent = '';

  try {
    const result = await API.get('/files?limit=1000&sort=date&order=desc');
    loading.style.display = 'none';

    window._allFiles = result.files;

    if (result.files.length === 0) {
      empty.style.display = 'flex';
      count.textContent = 'No files';
      return;
    }

    count.textContent = `${result.files.length} file${result.files.length > 1 ? 's' : ''}`;

    result.files.forEach(file => {
      const el = document.createElement('div');
      el.className = 'file-item';
      el.dataset.id = file.id;

      const ext = file.extension || '';
      const category = getFileCategory(ext);
      const color = getFileIconColor(ext);

      let preview = '';
      if (category === 'image') {
        preview = `<img src="${API.baseURL}/files/${file.id}/preview" alt="${escapeHtml(file.original_name)}" loading="lazy">`;
      } else {
        preview = `<div class="file-icon" style="background:linear-gradient(135deg,${color},${color}dd)">${getFileTypeIcon(ext)}</div>`;
      }

      el.innerHTML = `
        <div class="file-item-preview">${preview}</div>
        <div class="file-item-info">
          <div class="file-item-name" title="${escapeHtml(file.original_name)}">${escapeHtml(file.original_name)}</div>
          <div class="file-item-meta">${formatSize(file.file_size)}</div>
        </div>
        <div class="file-item-actions">
          <button class="file-dl-btn" onclick="event.stopPropagation();downloadFile(${file.id})" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      `;

      el.addEventListener('dblclick', (e) => {
        e.preventDefault();
        downloadFile(file.id);
      });

      container.appendChild(el);
    });
  } catch (error) {
    loading.style.display = 'none';
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
    const response = await fetch(`${API.baseURL}/files/${fileId}/download`, {
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
  if (!confirm('Delete this file?')) return;
  try {
    await API.delete(`/files/${fileId}`);
    showToast('File deleted', 'success');
    loadAllFiles();
  } catch (error) {
    showToast(error.message, 'error');
  }
}
