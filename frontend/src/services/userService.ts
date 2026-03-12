import { api } from './api'
import type { UserResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest, PagedResult } from '../types'

export const userService = {
  getAll: async (): Promise<UserResponse[]> => {
    const res = await api.get<UserResponse[]>('/users')
    return res.data
  },
  getPaged: async (page: number, pageSize: number, name?: string, onlyCollaborators: boolean = true): Promise<PagedResult<UserResponse>> => {
    const res = await api.get<PagedResult<UserResponse>>('/users/paged', {
      params: {
        page,
        pageSize,
        name: name || undefined,
        onlyCollaborators,
      },
    })
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
