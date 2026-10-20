import http from '../http.ts'
import type { LoginParams, RegisterParams } from '@/types/user'

const AUTH_BASE = '/api/auth'

export const AuthAPI = {
  login(data: LoginParams) {
    return http.post(`${AUTH_BASE}/login`, data)
  },
  register(data: RegisterParams) {
    return http.post(`${AUTH_BASE}/register`, data)
  },
}

export default AuthAPI
