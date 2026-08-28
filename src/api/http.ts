import axios from "axios";
import { staffToken, clearStaffToken } from "@/platform/auth";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

// Operator console calls carry the staff session token.
http.interceptors.request.use((config) => {
  if (staffToken.value) config.headers.Authorization = `Bearer ${staffToken.value}`;
  return config;
});

// A 401 mid-session means the staff token expired — drop it so the console
// returns to the operator login.
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && staffToken.value) clearStaffToken();
    return Promise.reject(error);
  }
);
