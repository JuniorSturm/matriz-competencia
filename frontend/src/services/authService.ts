import { api } from './api'
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from '../types'

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', data)
    return res.data
  },

  refresh: async (): Promise<RefreshResponse | null> => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return null
    const res = await api.post<RefreshResponse>('/auth/refresh', { refreshToken } satisfies RefreshRequest)
    return res.data
  },
}
