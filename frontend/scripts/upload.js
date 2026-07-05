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
  const overlay = document.getElementById('upload-sheet-overlay');
  const body = document.getElementById('upload-sheet-body');
  const track = document.getElementById('upload-track-fill');
  const pct = document.getElementById('upload-pct');

  body.innerHTML = '';
  track.style.width = '0%';
  pct.textContent = '0%';
  overlay.style.display = 'flex';

  let total = files.length;
  let done = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop().toLowerCase();
    const color = getFileIconColor(ext);

    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <div class="upload-item-icon" style="background:linear-gradient(135deg,${color},${color}dd)">${getFileTypeIcon(ext)}</div>
      <div class="upload-item-info">
        <div class="upload-item-name">${escapeHtml(file.name)}</div>
        <div class="upload-item-size">${formatSize(file.size)}</div>
        <div class="upload-item-bar"><div class="upload-item-fill" style="width:0%"></div></div>
      </div>
      <div class="upload-item-status"><div class="spinner-sm"></div></div>
    `;
    body.appendChild(item);

    try {
      const fill = item.querySelector('.upload-item-fill');
      const status = item.querySelector('.upload-item-status');

      const formData = new FormData();
      formData.append('files', file);

      await API.upload('/files/upload', formData, (p) => {
        if (fill) fill.style.width = `${p}%`;
        const overall = Math.round(((done + (p / 100)) / total) * 100);
        track.style.width = `${overall}%`;
        pct.textContent = `${overall}%`;
      });

      fill.style.width = '100%';
      fill.style.background = '#34C759';
      status.className = 'upload-item-status done';
      status.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      done++;
    } catch (err) {
      const fill = item.querySelector('.upload-item-fill');
      if (fill) { fill.style.width = '100%'; fill.style.background = '#FF3B30'; }
      const status = item.querySelector('.upload-item-status');
      status.className = 'upload-item-status error';
      status.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    }

    const p = Math.round((() => { let c = 0; body.querySelectorAll('.upload-item').forEach(el => { if (el.querySelector('.done, .error')) c++; }); return c; })() / total * 100);
    track.style.width = `${p}%`;
    pct.textContent = `${p}%`;
  }

  showToast(`${done} file(s) uploaded`, 'success');
  setTimeout(() => {
    overlay.style.display = 'none';
    loadAllFiles();
  }, 1000);
}
