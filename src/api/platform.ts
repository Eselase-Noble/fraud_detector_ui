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
