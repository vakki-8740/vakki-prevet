const API = {
  baseURL: typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:3000/api',
  token: localStorage.getItem('cloudvault_token'),

  async request(method, url, data = null, isFormData = false) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const config = { method, headers, mode: 'cors' };
    if (data) {
      config.body = isFormData ? data : JSON.stringify(data);
    }
    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      if (response.status === 401) {
        this.setToken(null);
        window.location.reload();
        throw new Error('Session expired');
      }
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Request failed');
      }
      return json;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Backend server is not reachable. Please check the URL in config.js');
      }
      throw error;
    }
  },

  get(url) { return this.request('GET', url); },
  post(url, data) { return this.request('POST', url, data); },
  put(url, data) { return this.request('PUT', url, data); },
  delete(url) { return this.request('DELETE', url); },

  upload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseURL}${url}`);
      xhr.mode = 'cors';
      if (this.token) xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(json);
          else reject(new Error(json.error || 'Upload failed'));
        } catch (e) {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error. Backend server may be unreachable.'));
      xhr.send(formData);
    });
  },

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('cloudvault_token', token);
    else localStorage.removeItem('cloudvault_token');
  }
};
