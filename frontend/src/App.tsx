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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <AppLayout>{children}</AppLayout> : <Navigate to='/login' replace />
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to='/login' replace />
  if (!user.isManager) return <Navigate to='/' replace />
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
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  )
}
