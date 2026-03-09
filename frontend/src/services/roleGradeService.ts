import { api } from './api'
import type { CargoOption, NivelOption, CategoryResponse } from '../types'

export const roleGradeService = {
  getCargos: async (): Promise<CargoOption[]> => {
    const res = await api.get<CargoOption[]>('/cargos')
    return res.data
  },
  getNiveis: async (): Promise<NivelOption[]> => {
    const res = await api.get<NivelOption[]>('/niveis')
    return res.data
  },
  getCategories: async (): Promise<CategoryResponse[]> => {
    const res = await api.get<CategoryResponse[]>('/skill-categories')
    return res.data
  },
}
