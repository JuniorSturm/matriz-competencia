import { useQuery } from '@tanstack/react-query'
import { roleService } from '../services/roleService'
import { roleGradeService } from '../services/roleGradeService'

/** Roles da empresa (para dropdown em Colaborador e Competência). Só busca quando companyId está definido. */
export const useRolesByCompany = (companyId: number | null) =>
  useQuery({
    queryKey: ['roles', 'company', companyId],
    queryFn: () => roleService.getByCompany(companyId!),
    enabled: companyId != null,
  })

/** Lista de roles para a tela de cadastro (com filtro opcional por empresa para Admin). */
export const useRolesList = (companyId?: number | null) =>
  useQuery({
    queryKey: ['roles', companyId],
    queryFn: () => roleService.getAll(companyId ?? undefined),
  })

export const useRolesPagedList = (page: number, pageSize: number, companyId?: number | null) =>
  useQuery({
    queryKey: ['roles-paged', page, pageSize, companyId],
    queryFn: () => roleService.getPaged(page, pageSize, companyId ?? undefined),
    keepPreviousData: true,
  })

export const useNiveis = () =>
  useQuery({ queryKey: ['niveis'], queryFn: roleGradeService.getNiveis })

export const useCategories = () =>
  useQuery({ queryKey: ['skill-categories'], queryFn: roleGradeService.getCategories })
