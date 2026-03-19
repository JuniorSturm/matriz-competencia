import { useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import AdminDashboardPage from './AdminDashboardPage'
import ManagerDashboardPage from './ManagerDashboardPage'
import CoordinatorDashboardPage from './CoordinatorDashboardPage'
import CollaboratorDashboardPage from './CollaboratorDashboardPage'

export default function DashboardRouterPage() {
  const { user } = useAuth()

  const view = useMemo(() => {
    if (!user) return 'collaborator'
    if (user.isAdmin) return 'admin'
    if (user.isManager) return 'manager'
    if (user.isCoordinator) return 'coordinator'
    return 'collaborator'
  }, [user])

  if (view === 'admin') return <AdminDashboardPage />
  if (view === 'manager') return <ManagerDashboardPage />
  if (view === 'coordinator') return <CoordinatorDashboardPage />
  return <CollaboratorDashboardPage />
}

