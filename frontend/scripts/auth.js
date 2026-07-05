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
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>';
    const result = await API.post('/auth/login', { email, password });
    API.setToken(result.token);
    currentUser = result.user;
    showMainApp();
    showToast('Welcome back!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span>';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px"></span>';
    const result = await API.post('/auth/register', { email, password });
    API.setToken(result.token);
    currentUser = result.user;
    showMainApp();
    showToast('Account created successfully!', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    const btn = e.target.querySelector('button[type="submit"]');
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
  updateUserUI();
  loadDashboard();
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

function togglePasswordVisibility(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showForgotPassword(e) {
  if (e) e.preventDefault();
  document.getElementById('forgot-email').value = '';
  openModal('forgot-modal');
}

async function sendForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) {
    showToast('Please enter your email', 'warning');
    return;
  }
  try {
    const result = await API.post('/auth/forgot-password', { email });
    closeModal();
    showToast(result.message, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}
