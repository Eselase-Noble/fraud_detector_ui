import axios from 'axios'
import { token, clearToken } from '@/portal/auth'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach the session token to every request.
http.interceptors.request.use((config) => {
  if (token.value) config.headers.Authorization = `Bearer ${token.value}`
  return config
})

// A 401 mid-session means the token expired — drop it so the app returns to login.
http.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && token.value) clearToken()
    return Promise.reject(error)
  },
)
