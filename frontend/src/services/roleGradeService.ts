import { api } from './api'
import type { NivelOption, CategoryResponse } from '../types'

export const roleGradeService = {
  getNiveis: async (): Promise<NivelOption[]> => {
    const res = await api.get<NivelOption[]>('/niveis')
    return res.data
  },
  getCategories: async (): Promise<CategoryResponse[]> => {
    const res = await api.get<CategoryResponse[]>('/skill-categories')
    return res.data
  },
}
