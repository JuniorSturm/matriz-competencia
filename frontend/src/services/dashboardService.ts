import { api } from './api'
import type { AdminDashboardStats } from '../types'

export const dashboardService = {
  getAdminStats: async (): Promise<AdminDashboardStats> => {
    const res = await api.get<AdminDashboardStats>('/dashboard/admin-stats')
    return res.data
  },
}

