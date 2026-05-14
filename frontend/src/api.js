import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/signup') && path !== '/') {
        localStorage.clear();
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
