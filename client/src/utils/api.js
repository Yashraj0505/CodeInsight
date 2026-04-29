const BASE = 'http://localhost:5000';

export const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
