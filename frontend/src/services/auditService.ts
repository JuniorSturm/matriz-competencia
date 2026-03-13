import { api } from './api'
import type { AuditLogResponse, AuditLogDetailResponse, PagedResult } from '../types'

export interface AuditFilters {
  entityType?: string
  operation?: string
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string   // YYYY-MM-DD
}

export const auditService = {
  getPaged: async (
    page: number,
    pageSize: number,
    filters?: AuditFilters
  ): Promise<PagedResult<AuditLogResponse>> => {
    const params: Record<string, string | number | undefined> = { page, pageSize }
    if (filters?.entityType) params.entityType = filters.entityType
    if (filters?.operation) params.operation = filters.operation
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom
    if (filters?.dateTo) params.dateTo = filters.dateTo
    const res = await api.get<PagedResult<AuditLogResponse>>('/audit/logs', { params })
    return res.data
  },

  getById: async (id: number): Promise<AuditLogDetailResponse> => {
    const res = await api.get<AuditLogDetailResponse>(`/audit/logs/${id}`)
    return res.data
  },
}

