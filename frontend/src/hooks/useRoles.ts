import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { roleService } from '../services/roleService'
import type { CreateRoleRequest, UpdateRoleRequest } from '../types'

export const useRole = (id: number | null) =>
  useQuery({
    queryKey: ['roles', id],
    queryFn: () => roleService.getById(id!),
    enabled: id != null,
  })

export const useCreateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => roleService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useUpdateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleRequest }) =>
      roleService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useDeleteRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => roleService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}
