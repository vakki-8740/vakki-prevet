let currentUser = null;

function initAuth() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);

  if (API.token) {
    loadProfile();
  } else {
    showAuthPage();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Please fill all fields', 'error'); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>';
  try {
    const result = await API.post('/auth/login', { email, password });
    if (!result.token) throw new Error('No token received');
    API.setToken(result.token);
    currentUser = result.user;
    showMainApp();
    showToast('Welcome back!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span>';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  if (!email || !password) { showToast('Please fill all fields', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>';
  try {
    const result = await API.post('/auth/register', { email, password });
    if (!result.token) throw new Error('No token received from server');
    API.setToken(result.token);
    currentUser = result.user;
    showMainApp();
    showToast('Account created successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
  }
}

async function loadProfile() {
  try {
    const result = await API.get('/user/profile');
    currentUser = result.user;
    showMainApp();
  } catch (error) {
    API.setToken(null);
    showAuthPage();
  }
}

function logout() {
  API.post('/auth/logout').catch(() => {});
  API.setToken(null);
  currentUser = null;
  showAuthPage();
  showToast('Signed out', 'info');
}

function showAuthPage() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('main-app').classList.remove('active');
}

function showMainApp() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('main-app').classList.add('active');
  loadAllFiles();
}

function showLogin(e) {
  if (e) e.preventDefault();
  document.getElementById('login-form').classList.add('active');
  document.getElementById('register-form').classList.remove('active');
}

function showRegister(e) {
  if (e) e.preventDefault();
  document.getElementById('login-form').classList.remove('active');
  document.getElementById('register-form').classList.add('active');
}