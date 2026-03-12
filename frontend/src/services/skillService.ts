import { api } from './api'
import type {
  SkillResponse,
  CreateSkillRequest,
  UpdateSkillRequest,
  UpsertExpectationRequest,
  SkillDescriptionDto,
  UpsertDescriptionRequest,
  SkillExpectationDto,
  PagedResult,
} from '../types'

export const skillService = {
  getAll: async (roleId?: number, companyId?: number): Promise<SkillResponse[]> => {
    const params: Record<string, number> = {}
    if (roleId) params.roleId = roleId
    if (companyId) params.companyId = companyId
    const res = await api.get<SkillResponse[]>('/skills', {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
    return res.data
  },
  getPaged: async (page: number, pageSize: number, companyId?: number): Promise<PagedResult<SkillResponse>> => {
    const res = await api.get<PagedResult<SkillResponse>>('/skills/paged', {
      params: {
        page,
        pageSize,
        companyId: companyId ?? undefined,
      },
    })
    return res.data
  },
  getById: async (id: number): Promise<SkillResponse> => {
    const res = await api.get<SkillResponse>(`/skills/${id}`)
    return res.data
  },
  create: async (data: CreateSkillRequest): Promise<number> => {
    const res = await api.post<{ id: number }>('/skills', data)
    return res.data.id
  },
  update: async (id: number, data: UpdateSkillRequest): Promise<void> => {
    await api.put(`/skills/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/skills/${id}`)
  },
  upsertExpectation: async (data: UpsertExpectationRequest): Promise<void> => {
    await api.post('/skills/expectations', data)
  },
  getExpectations: async (skillId: number): Promise<SkillExpectationDto[]> => {
    const res = await api.get<SkillExpectationDto[]>(`/skills/${skillId}/expectations`)
    return res.data
  },
  deleteExpectation: async (skillId: number, roleId: number, gradeId: number): Promise<void> => {
    await api.delete(`/skills/${skillId}/expectations`, { params: { roleId, gradeId } })
  },
  getDescriptions: async (skillId: number): Promise<SkillDescriptionDto[]> => {
    const res = await api.get<SkillDescriptionDto[]>(`/skills/${skillId}/descriptions`)
    return res.data
  },
  upsertDescription: async (data: UpsertDescriptionRequest): Promise<void> => {
    await api.post('/skills/descriptions', data)
  },
}
