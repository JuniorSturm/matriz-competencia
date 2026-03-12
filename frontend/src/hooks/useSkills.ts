import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skillService } from '../services/skillService'
import type { CreateSkillRequest, UpdateSkillRequest, UpsertExpectationRequest, UpsertDescriptionRequest } from '../types'

export const useSkills = (roleId?: number, companyId?: number) =>
  useQuery({ queryKey: ['skills', roleId, companyId], queryFn: () => skillService.getAll(roleId, companyId) })

export const useSkillDescriptions = (skillId: number | null) =>
  useQuery({
    queryKey: ['skill-descriptions', skillId],
    queryFn: () => skillService.getDescriptions(skillId!),
    enabled: skillId !== null,
  })

export const useSkillExpectations = (skillId: number | null) =>
  useQuery({
    queryKey: ['skill-expectations', skillId],
    queryFn: () => skillService.getExpectations(skillId!),
    enabled: skillId !== null,
  })

export const useCreateSkill = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSkillRequest) => skillService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })
}

export const useUpdateSkill = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSkillRequest }) =>
      skillService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })
}

export const useDeleteSkill = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => skillService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })
}

export const useUpsertExpectation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertExpectationRequest) => skillService.upsertExpectation(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  })
}

export const useUpsertDescription = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertDescriptionRequest) => skillService.upsertDescription(data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['skill-descriptions', vars.skillId] }),
  })
}
