let imageRotation = 0;
let imageScale = 1;
let currentFile = null;

function downloadCurrentFile() {
  if (currentFile) downloadFile(currentFile.id);
}

function openImageViewer(file) {
  currentFile = file;
  const viewer = document.getElementById('image-viewer');
  const img = document.getElementById('viewer-image');
  const filename = document.getElementById('viewer-filename');

  filename.textContent = file.original_name;
  img.src = `${API.baseURL}/files/${file.id}/preview`;
  imageRotation = 0;
  imageScale = 1;
  img.style.transform = `rotate(${imageRotation}deg) scale(${imageScale})`;
  viewer.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.getElementById('image-viewer').addEventListener('click', function(e) {
  if (e.target === this) closeImageViewer();
});

function closeImageViewer() {
  document.getElementById('image-viewer').style.display = 'none';
  document.body.style.overflow = '';
}

function rotateImage(deg) {
  imageRotation += deg;
  document.getElementById('viewer-image').style.transform = `rotate(${imageRotation}deg) scale(${imageScale})`;
}

function zoomImage(delta) {
  imageScale = Math.max(0.1, Math.min(5, imageScale + delta));
  document.getElementById('viewer-image').style.transform = `rotate(${imageRotation}deg) scale(${imageScale})`;
}

function openVideoPlayer(file) {
  currentFile = file;
  const player = document.getElementById('video-player');
  const video = document.getElementById('video-element');
  const filename = document.getElementById('video-filename');

  filename.textContent = file.original_name;
  video.src = `${API.baseURL}/files/${file.id}/preview`;
  player.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  video.play().catch(() => {});
}

document.getElementById('video-player').addEventListener('click', function(e) {
  if (e.target === this) closeVideoPlayer();
});

function closeVideoPlayer() {
  const video = document.getElementById('video-element');
  video.pause();
  video.src = '';
  document.getElementById('video-player').style.display = 'none';
  document.body.style.overflow = '';
}

function openAudioPlayer(file) {
  const player = document.getElementById('audio-player');
  const audio = document.getElementById('audio-element');
  const filename = document.getElementById('audio-filename');

  filename.textContent = file.original_name;
  audio.src = `${API.baseURL}/files/${file.id}/preview`;
  player.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  audio.play().catch(() => {});
}

function closeAudioPlayer() {
  const audio = document.getElementById('audio-element');
  audio.pause();
  audio.src = '';
  document.getElementById('audio-player').style.display = 'none';
  document.body.style.overflow = '';
}

async function openTextViewer(file) {
  const viewer = document.getElementById('text-viewer');
  const content = document.getElementById('text-content');
  const filename = document.getElementById('text-filename');

  filename.textContent = file.original_name;
  viewer.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  content.textContent = 'Loading...';

  try {
    const response = await fetch(`${API.baseURL}/files/${file.id}/preview`, {
      headers: { 'Authorization': `Bearer ${API.token}` }
    });
    const text = await response.text();
    content.textContent = text;
  } catch (error) {
    content.textContent = 'Failed to load file content';
  }
}

function closeTextViewer() {
  document.getElementById('text-viewer').style.display = 'none';
  document.body.style.overflow = '';
}

function openPdfViewer(file) {
  const viewer = document.getElementById('pdf-viewer');
  const iframe = document.getElementById('pdf-iframe');
  const filename = document.getElementById('pdf-filename');

  filename.textContent = file.original_name;
  iframe.src = `${API.baseURL}/files/${file.id}/preview`;
  viewer.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePdfViewer() {
  const iframe = document.getElementById('pdf-iframe');
  iframe.src = '';
  document.getElementById('pdf-viewer').style.display = 'none';
  document.body.style.overflow = '';
}
