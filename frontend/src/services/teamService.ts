import { api } from './api'
import type {
  TeamResponse,
  TeamListItemResponse,
  CreateTeamRequest,
  UpdateTeamRequest,
  PagedResult,
} from '../types'

export const teamService = {
  getAll: async (): Promise<TeamListItemResponse[]> => {
    const res = await api.get<TeamListItemResponse[]>('/teams')
    return res.data
  },
  getPaged: async (
    page: number,
    pageSize: number,
    companyId?: number | null,
    name?: string | null,
  ): Promise<PagedResult<TeamListItemResponse>> => {
    const res = await api.get<PagedResult<TeamListItemResponse>>('/teams/paged', {
      params: { page, pageSize, companyId: companyId ?? undefined, name: name ?? undefined },
    })
    return res.data
  },
  getAssignedMemberIds: async (excludeTeamId?: number, companyId?: number | null): Promise<string[]> => {
    const params: Record<string, number> = {}
    if (excludeTeamId) params.excludeTeamId = excludeTeamId
    if (companyId != null && companyId > 0) params.companyId = companyId
    const res = await api.get<string[]>('/teams/assigned-member-ids', { params: Object.keys(params).length ? params : undefined })
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
