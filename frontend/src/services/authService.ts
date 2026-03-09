import { api } from './api'
import type { LoginRequest, LoginResponse } from '../types'

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', data)
    return res.data
  },
}
