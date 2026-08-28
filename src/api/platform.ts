// Operator console authentication (Sentinel staff).
import { http } from '@/api/http'
import { setStaffToken, type StaffUser } from '@/platform/auth'

interface LoginResponse { token: string; user: StaffUser }

export const staffLogin = async (email: string, password: string): Promise<StaffUser> => {
  const { data } = await http.post<LoginResponse>('/staff/login', { email, password })
  setStaffToken(data.token)
  return data.user
}

export const staffMe = async (): Promise<StaffUser> => {
  const { data } = await http.get<StaffUser>('/staff/me')
  return data
}

// ── Staff user management (admins only) ──
export interface StaffUserFull extends StaffUser { is_active: boolean }

export const listStaff = async (): Promise<StaffUserFull[]> => {
  const { data } = await http.get<StaffUserFull[]>('/staff/users')
  return data
}
export const createStaff = async (payload: {
  email: string; password: string; name?: string; role?: string
}): Promise<StaffUserFull> => {
  const { data } = await http.post<StaffUserFull>('/staff/users', payload)
  return data
}
export const updateStaff = async (
  id: number, payload: { name?: string; role?: string; is_active?: boolean; password?: string },
): Promise<StaffUserFull> => {
  const { data } = await http.patch<StaffUserFull>(`/staff/users/${id}`, payload)
  return data
}
export const deleteStaff = async (id: number): Promise<void> => {
  await http.delete(`/staff/users/${id}`)
}
