import { api } from './api'
import type { CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest } from '../types'

export const categoryService = {
  getByCompany: async (companyId: number): Promise<CategoryResponse[]> => {
    const res = await api.get<CategoryResponse[]>('/categories', {
      params: { companyId },
    })
    return res.data
  },
  getById: async (id: number): Promise<CategoryResponse | null> => {
    try {
      const res = await api.get<CategoryResponse>(`/categories/${id}`)
      return res.data
    } catch {
      return null
    }
  },
  create: async (data: CreateCategoryRequest): Promise<number> => {
    const res = await api.post<{ id: number }>('/categories', data)
    return res.data.id
  },
  update: async (id: number, data: UpdateCategoryRequest): Promise<void> => {
    await api.put(`/categories/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },
}
