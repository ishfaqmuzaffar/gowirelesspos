// src/api.ts
import axios from "axios";

// We keep URLs exactly as you already use them (full http://localhost:8080/...),
// but we attach the token on every request.
const api = axios.create();

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pos_token"); // same key we used on login
  if (token) {
    if (!config.headers) config.headers = {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: if we ever get 401, we could auto-logout later
// api.interceptors.response.use(
//   (res) => res,
//   (error) => {
//     if (error?.response?.status === 401) {
//       localStorage.removeItem("pos_token");
//       window.location.href = "/login";
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
