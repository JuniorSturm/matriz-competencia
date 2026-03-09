import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assessmentService } from '../services/assessmentService'
import type { UpsertAssessmentRequest } from '../types'

export const useAssessments = (userId: string) =>
  useQuery({
    queryKey: ['assessments', userId],
    queryFn: () => assessmentService.getByUser(userId),
    enabled: !!userId,
  })

export const useUpsertAssessment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertAssessmentRequest) => assessmentService.upsert(data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['assessments', vars.userId] }),
  })
}

export const useComparison = (userAId: string, userBId: string, userCId?: string) =>
  useQuery({
    queryKey: ['comparison', userAId, userBId, userCId ?? ''],
    queryFn: () => assessmentService.compare(userAId, userBId, userCId || undefined),
    enabled: !!userAId && !!userBId,
  })
