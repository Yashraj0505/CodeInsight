const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) console.error('VITE_API_URL is not defined — set it in .env or Vercel environment variables');
console.log('API BASE URL:', BASE_URL);

export const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export const BASE = BASE_URL;
