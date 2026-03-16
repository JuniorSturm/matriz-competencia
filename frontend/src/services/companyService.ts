import { api } from './api'
import type {
  CompanyOptionResponse,
  CompanyResponse,
  CompanyListItemResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  PagedResult,
} from '../types'

export const companyService = {
  /** Opções para dropdown/filtro (id, name, isActive) — paginado e com busca por nome. */
  getOptionsPaged: async (
    page: number,
    pageSize: number,
    name?: string | null,
  ): Promise<PagedResult<CompanyOptionResponse>> => {
    const res = await api.get<PagedResult<CompanyOptionResponse>>('/companies/options', {
      params: { page, pageSize, name: name ?? undefined },
    })
    return res.data
  },
  getAll: async (): Promise<CompanyResponse[]> => {
    const res = await api.get<CompanyResponse[]>('/companies')
    return res.data
  },
  getPaged: async (page: number, pageSize: number, name?: string | null): Promise<PagedResult<CompanyListItemResponse>> => {
    const res = await api.get<PagedResult<CompanyListItemResponse>>('/companies/paged', {
      params: { page, pageSize, name: name ?? undefined },
    })
    return res.data
  },
  getById: async (id: number): Promise<CompanyResponse> => {
    const res = await api.get<CompanyResponse>(`/companies/${id}`)
    return res.data
  },
  create: async (data: CreateCompanyRequest): Promise<{ id: number }> => {
    const res = await api.post<{ id: number }>('/companies', data)
    return res.data
  },
  update: async (id: number, data: UpdateCompanyRequest): Promise<void> => {
    await api.put(`/companies/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/companies/${id}`)
  },
  addUser: async (companyId: number, userId: string): Promise<void> => {
    await api.post(`/companies/${companyId}/users/${userId}`)
  },
  removeUser: async (companyId: number, userId: string): Promise<void> => {
    await api.delete(`/companies/${companyId}/users/${userId}`)
  },
}
