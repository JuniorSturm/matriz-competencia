import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService } from '../services/roleService'
import { roleGradeService } from '../services/roleGradeService'
import { categoryService } from '../services/categoryService'
import type { PagedResult, RoleDetailResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../types'

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
  useQuery<PagedResult<RoleDetailResponse>>({
    queryKey: ['roles-paged', page, pageSize, companyId],
    queryFn: () => roleService.getPaged(page, pageSize, companyId ?? undefined),
  })

export const useNiveis = () =>
  useQuery({ queryKey: ['niveis'], queryFn: roleGradeService.getNiveis })

/** Categorias da empresa (para dropdown em Competência). Só busca quando companyId está definido. */
export const useCategoriesByCompany = (companyId: number | null) =>
  useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => categoryService.getByCompany(companyId!),
    enabled: companyId != null,
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCategoryRequest) => categoryService.create(data),
    onSuccess: (_id, vars) => qc.invalidateQueries({ queryKey: ['categories', vars.companyId] }),
  })
}

export const useUpdateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryRequest }) =>
      categoryService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export const useDeleteCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoryService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}
