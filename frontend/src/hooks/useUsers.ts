import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '../services/userService'
import type { CreateUserRequest, UpdateUserRequest, ResetPasswordRequest, PagedResult, UserResponse } from '../types'

export const useUsers = (enabled: boolean = true) =>
  useQuery({ queryKey: ['users'], queryFn: userService.getAll, enabled })

export const usePagedUsers = (
  page: number,
  pageSize: number,
  name?: string,
  onlyCollaborators: boolean = true,
  companyId?: number | null,
  availableForCompanyId?: number | null,
  availableForTeamCompanyId?: number | null,
  excludeTeamId?: number | null,
  onlyManagers?: boolean | null,
  onlyCoordinators?: boolean | null,
  enabled: boolean = true,
) =>
  useQuery<PagedResult<UserResponse>>({
    queryKey: ['users-paged', page, pageSize, name ?? '', onlyCollaborators, companyId ?? '', availableForCompanyId ?? '', availableForTeamCompanyId ?? '', excludeTeamId ?? '', onlyManagers ?? '', onlyCoordinators ?? ''],
    queryFn: () => userService.getPaged(page, pageSize, name, onlyCollaborators, companyId, availableForCompanyId, availableForTeamCompanyId, excludeTeamId, onlyManagers, onlyCoordinators),
    enabled,
  })

export const useUser = (id: string) =>
  useQuery({ queryKey: ['users', id], queryFn: () => userService.getById(id), enabled: !!id })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => userService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['users-paged'] })
    },
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      userService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['users-paged'] })
    },
  })
}

export const useResetPassword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResetPasswordRequest }) =>
      userService.resetPassword(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['users-paged'] })
    },
  })
}
