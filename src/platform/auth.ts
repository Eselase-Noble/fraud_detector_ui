// Operator (staff) session for the /platform console. Separate credential and
// storage key from the partner portal, so the two sessions never mix.
import { ref } from 'vue'

const STORE_KEY = 'sentinel_staff_token'

export interface StaffUser { id: number; email: string; name?: string | null; role: string }

export const staffToken = ref<string | null>(sessionStorage.getItem(STORE_KEY))
export const staffUser = ref<StaffUser | null>(null)

export const setStaffToken = (t: string) => {
  staffToken.value = t
  sessionStorage.setItem(STORE_KEY, t)
}
export const clearStaffToken = () => {
  staffToken.value = null
  staffUser.value = null
  sessionStorage.removeItem(STORE_KEY)
}
