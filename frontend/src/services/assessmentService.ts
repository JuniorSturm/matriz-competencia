import { api } from './api'
import type {
  AssessmentResponse,
  UpsertAssessmentRequest,
  ComparisonRow,
} from '../types'

export const assessmentService = {
  getByUser: async (userId: string): Promise<AssessmentResponse[]> => {
    const res = await api.get<AssessmentResponse[]>(`/assessments/${userId}`)
    return res.data
  },
  upsert: async (data: UpsertAssessmentRequest): Promise<void> => {
    await api.post('/assessments', data)
  },
  compare: async (userAId: string, userBId: string, userCId?: string): Promise<ComparisonRow[]> => {
    const params: Record<string, string> = { userA: userAId, userB: userBId }
    if (userCId) params.userC = userCId
    const res = await api.get<ComparisonRow[]>('/comparisons', { params })
    return res.data
  },
}
