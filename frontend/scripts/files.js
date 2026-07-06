async function loadAllFiles() {
  const container = document.getElementById('files-container');
  const loading = document.getElementById('files-loading');
  const empty = document.getElementById('files-empty');

  container.innerHTML = '';
  loading.style.display = 'flex';
  empty.style.display = 'none';

  try {
    const result = await API.get('/files?limit=1000&sort=date&order=desc');
    loading.style.display = 'none';

    window._allFiles = result.files;

    if (result.files.length === 0) {
      empty.style.display = 'flex';
      return;
    }

    result.files.forEach(file => {
      const el = document.createElement('div');
      el.className = 'file-card';
      el.dataset.id = file.id;

      const ext = file.extension || '';
      const category = getFileCategory(ext);
      const color = getFileIconColor(ext);

      let preview = '';

      if (category === 'image') {
        preview = `<img src="${BACKEND_URL}${escapeHtml(file.file_path)}" alt="${escapeHtml(file.original_name)}" loading="lazy">`;
      } else if (category === 'video') {
        preview = `
          <video src="${BACKEND_URL}${escapeHtml(file.file_path)}" preload="metadata" muted playsinline></video>
          <div class="play-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>`;
      } else {
        preview = `<div class="file-icon" style="background:linear-gradient(135deg,${color},${color}dd)">${getFileTypeIcon(ext)}</div>`;
      }

      const typeLabel = category === 'image' ? 'img' : category === 'video' ? 'vid' : category === 'audio' ? 'aud' : category === 'pdf' ? 'pdf' : '';

      el.innerHTML = `
        <div class="file-card-preview">${preview}</div>
        ${typeLabel ? `<span class="file-type-badge">${typeLabel}</span>` : ''}
        <div class="file-card-info">
          <div class="file-card-name" title="${escapeHtml(file.original_name)}">${escapeHtml(file.original_name)}</div>
          <div class="file-card-size">${formatSize(file.file_size)}</div>
          <button class="dl-btn" onclick="event.stopPropagation();downloadFile(${file.id})" title="Download">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="del-btn" onclick="event.stopPropagation();deleteFile(${file.id})" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      `;

      el.addEventListener('click', () => openFile(file));

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
    a.href = url; a.download = filename;
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
