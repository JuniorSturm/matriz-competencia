import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import UserFormPage from './pages/UserFormPage'
import SkillsPage from './pages/SkillsPage'
import SkillFormPage from './pages/SkillFormPage'
import AssessmentsPage from './pages/AssessmentsPage'
import ComparisonPage from './pages/ComparisonPage'
import CompaniesPage from './pages/CompaniesPage'
import CompanyFormPage from './pages/CompanyFormPage'
import RolesPage from './pages/RolesPage'
import RoleFormPage from './pages/RoleFormPage'
import TeamsPage from './pages/TeamsPage'
import TeamFormPage from './pages/TeamFormPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <AppLayout>{children}</AppLayout> : <Navigate to='/login' replace />
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (!user.isManager && !user.isAdmin && !user.isCoordinator) return <Navigate to='/' replace />
  return <AppLayout>{children}</AppLayout>
}

function ManagerAdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (!user.isManager && !user.isAdmin) return <Navigate to='/' replace />
  return <AppLayout>{children}</AppLayout>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (!user.isAdmin) return <Navigate to='/' replace />
  return <AppLayout>{children}</AppLayout>
}

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/' element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path='/users' element={<ManagerRoute><UsersPage /></ManagerRoute>} />
      <Route path='/users/new' element={<ManagerRoute><UserFormPage /></ManagerRoute>} />
      <Route path='/users/:id/edit' element={<ManagerRoute><UserFormPage /></ManagerRoute>} />
      <Route path='/skills' element={<ManagerRoute><SkillsPage /></ManagerRoute>} />
      <Route path='/skills/new' element={<ManagerRoute><SkillFormPage /></ManagerRoute>} />
      <Route path='/skills/:id/edit' element={<ManagerRoute><SkillFormPage /></ManagerRoute>} />
      <Route path='/assessments' element={<PrivateRoute><AssessmentsPage /></PrivateRoute>} />
      <Route path='/comparison' element={<ManagerRoute><ComparisonPage /></ManagerRoute>} />
      <Route path='/companies' element={<AdminRoute><CompaniesPage /></AdminRoute>} />
      <Route path='/companies/new' element={<AdminRoute><CompanyFormPage /></AdminRoute>} />
      <Route path='/companies/:id/edit' element={<AdminRoute><CompanyFormPage /></AdminRoute>} />
      <Route path='/roles' element={<ManagerRoute><RolesPage /></ManagerRoute>} />
      <Route path='/roles/new' element={<ManagerRoute><RoleFormPage /></ManagerRoute>} />
      <Route path='/roles/:id/edit' element={<ManagerRoute><RoleFormPage /></ManagerRoute>} />
      <Route path='/teams' element={<ManagerRoute><TeamsPage /></ManagerRoute>} />
      <Route path='/teams/new' element={<ManagerAdminRoute><TeamFormPage /></ManagerAdminRoute>} />
      <Route path='/teams/:id/edit' element={<ManagerRoute><TeamFormPage /></ManagerRoute>} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}
