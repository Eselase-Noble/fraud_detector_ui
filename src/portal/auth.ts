// Minimal reactive auth store — holds the portal session token. Humans sign in
// with email + password; the token authorizes every subsequent request.
import { ref } from 'vue'

const STORE_KEY = 'sentinel_portal_token'

export const token = ref<string | null>(sessionStorage.getItem(STORE_KEY))

export const setToken = (t: string) => {
  token.value = t
  sessionStorage.setItem(STORE_KEY, t)
}

export const clearToken = () => {
  token.value = null
  sessionStorage.removeItem(STORE_KEY)
}
