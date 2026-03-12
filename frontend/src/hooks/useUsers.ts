import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '../services/userService'
import type { CreateUserRequest, UpdateUserRequest, ResetPasswordRequest } from '../types'

export const useUsers = (enabled: boolean = true) =>
  useQuery({ queryKey: ['users'], queryFn: userService.getAll, enabled })

export const usePagedUsers = (page: number, pageSize: number, name?: string, onlyCollaborators: boolean = true) =>
  useQuery({
    queryKey: ['users-paged', page, pageSize, name, onlyCollaborators],
    queryFn: () => userService.getPaged(page, pageSize, name, onlyCollaborators),
    keepPreviousData: true,
  })

export const useUser = (id: string) =>
  useQuery({ queryKey: ['users', id], queryFn: () => userService.getById(id), enabled: !!id })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => userService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      userService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
