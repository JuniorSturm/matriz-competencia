import { createContext, useContext, useState, type ReactNode } from 'react'
import type { LoginResponse } from '../types'
import { api } from '../services/api'

interface AuthContextValue {
  user: LoginResponse | null
  login: (data: LoginResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? (JSON.parse(stored) as LoginResponse) : null
  })

  const login = (data: LoginResponse) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken)
    } else {
      localStorage.removeItem('refreshToken')
    }
    setUser(data)
  }

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {})
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
