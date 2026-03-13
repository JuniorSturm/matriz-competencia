import { useQuery } from '@tanstack/react-query'
import { auditService, type AuditFilters } from '../services/auditService'
import type { AuditLogResponse, PagedResult } from '../types'

export const useAuditLogs = (page: number, pageSize: number, filters?: AuditFilters) =>
  useQuery<PagedResult<AuditLogResponse>>({
    queryKey: ['audit-logs', page, pageSize, filters?.entityType, filters?.operation, filters?.dateFrom, filters?.dateTo],
    queryFn: () => auditService.getPaged(page, pageSize, filters),
  })

