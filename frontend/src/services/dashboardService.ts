import { api } from './api'
import type {
  AdminDashboardStats,
  AdminHealthStats,
  ManagerCompanyDashboard,
  CoordinatorTeamsDashboard,
} from '../types'

export const dashboardService = {
  getAdminStats: async (): Promise<AdminDashboardStats> => {
    const res = await api.get<AdminDashboardStats>('/dashboard/admin-stats')
    return res.data
  },
  getAdminHealth: async (): Promise<AdminHealthStats> => {
    const res = await api.get<AdminHealthStats>('/dashboard/admin-health')
    return res.data
  },
  getManagerCompany: async (): Promise<ManagerCompanyDashboard> => {
    const res = await api.get<ManagerCompanyDashboard>('/dashboard/manager-company')
    return res.data
  },
  getCoordinatorTeams: async (): Promise<CoordinatorTeamsDashboard> => {
    const res = await api.get<CoordinatorTeamsDashboard>('/dashboard/coordinator-teams')
    return res.data
  },
}

