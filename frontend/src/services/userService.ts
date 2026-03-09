import { api } from './api'
import type { UserResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest } from '../types'

export const userService = {
  getAll: async (): Promise<UserResponse[]> => {
    const res = await api.get<UserResponse[]>('/users')
    return res.data
  },
  getById: async (id: string): Promise<UserResponse> => {
    const res = await api.get<UserResponse>(`/users/${id}`)
    return res.data
  },
  create: async (data: CreateUserRequest): Promise<void> => {
    await api.post('/users', data)
  },
  update: async (id: string, data: UpdateUserRequest): Promise<void> => {
    await api.put(`/users/${id}`, data)
  },
  resetPassword: async (id: string, data: ResetPasswordRequest): Promise<void> => {
    await api.put(`/users/${id}/password`, data)
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
}
