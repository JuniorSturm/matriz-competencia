import { api } from './api'
import type { NivelOption } from '../types'

export const roleGradeService = {
  getNiveis: async (): Promise<NivelOption[]> => {
    const res = await api.get<NivelOption[]>('/niveis')
    return res.data
  },
}
