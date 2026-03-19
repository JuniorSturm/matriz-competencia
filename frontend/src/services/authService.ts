import { api } from './api'
import type { LoginRequest, LoginResponse, RefreshRequest, RefreshResponse } from '../types'

type SignupRequest = {
  name: string
  document: string
  email: string
  phone?: string
  userName: string
  userEmail: string
  password: string
}

type SignupVerifyRequest = {
  email: string
  code: string
}

type SignupResendCodeRequest = {
  email: string
}

type PasswordResetRequest = {
  token: string
  newPassword: string
}

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', data)
    return res.data
  },

  signup: async (data: SignupRequest): Promise<{ companyId: number; userId: string; email: string; requiresVerification?: boolean; login?: LoginResponse | null }> => {
    const res = await api.post('/auth/signup', data)
    return res.data
  },

  verifySignup: async (data: SignupVerifyRequest): Promise<{ verified: boolean; email: string; login?: LoginResponse | null }> => {
    const res = await api.post('/auth/signup/verify', data)
    return res.data
  },

  resendSignupCode: async (data: SignupResendCodeRequest): Promise<void> => {
    await api.post('/auth/signup/resend-code', data)
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/password/forgot', { email })
  },

  validatePasswordReset: async (token: string): Promise<void> => {
    await api.get('/auth/password/reset', { params: { token } })
  },

  resetPassword: async (data: PasswordResetRequest): Promise<void> => {
    await api.post('/auth/password/reset', data)
  },

  refresh: async (): Promise<RefreshResponse | null> => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return null
    const res = await api.post<RefreshResponse>('/auth/refresh', { refreshToken } satisfies RefreshRequest)
    return res.data
  },
}
