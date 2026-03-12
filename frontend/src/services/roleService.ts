import { api } from './api'
import type {
  RoleOption,
  RoleDetailResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  PagedResult,
} from '../types'

export const roleService = {
  getAll: async (companyId?: number | null): Promise<RoleDetailResponse[]> => {
    const params = companyId != null ? { companyId } : {}
    const res = await api.get<RoleDetailResponse[]>('/roles', { params })
    return res.data
  },

  getPaged: async (page: number, pageSize: number, companyId?: number | null): Promise<PagedResult<RoleDetailResponse>> => {
    const res = await api.get<PagedResult<RoleDetailResponse>>('/roles/paged', {
      params: {
        page,
        pageSize,
        companyId: companyId ?? undefined,
      },
    })
    return res.data
  },

  getByCompany: async (companyId: number): Promise<RoleOption[]> => {
    const res = await api.get<RoleOption[]>(`/roles/by-company/${companyId}`)
    return res.data
  },

  getById: async (id: number): Promise<RoleDetailResponse | null> => {
    const res = await api.get<RoleDetailResponse>(`/roles/${id}`)
    return res.data
  },

  create: async (data: CreateRoleRequest): Promise<number> => {
    const res = await api.post<{ id: number }>('/roles', data)
    return res.data.id
  },

  update: async (id: number, data: UpdateRoleRequest): Promise<void> => {
    await api.put(`/roles/${id}`, data)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`)
  },
}
