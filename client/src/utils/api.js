const BASE_URL = import.meta.env.VITE_API_URL || 'https://codeinsight-wo53.onrender.com';

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
