import { api } from './api'
import type {
  TeamResponse,
  TeamListItemResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
} from '../types'

export const teamService = {
  getAll: async (): Promise<TeamListItemResponse[]> => {
    const res = await api.get<TeamListItemResponse[]>('/teams')
    return res.data
  },
  getAssignedMemberIds: async (excludeTeamId?: number): Promise<string[]> => {
    const params = excludeTeamId ? { excludeTeamId } : {}
    const res = await api.get<string[]>('/teams/assigned-member-ids', { params })
    return res.data
  },
  getByCompany: async (companyId: number): Promise<TeamListItemResponse[]> => {
    const res = await api.get<TeamListItemResponse[]>(`/teams/company/${companyId}`)
    return res.data
  },
  getById: async (id: number): Promise<TeamResponse> => {
    const res = await api.get<TeamResponse>(`/teams/${id}`)
    return res.data
  },
  create: async (data: CreateTeamRequest): Promise<{ id: number }> => {
    const res = await api.post<{ id: number }>('/teams', data)
    return res.data
  },
  update: async (id: number, data: UpdateTeamRequest): Promise<void> => {
    await api.put(`/teams/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/teams/${id}`)
  },
}
