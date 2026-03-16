import axios, { type InternalAxiosRequestConfig } from 'axios'
import { getNavigate } from '../navigation'
import { authService } from './authService'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'

const FORBIDDEN_MESSAGE = 'Você não tem permissão para esta ação.'

export const api = axios.create({ baseURL: BASE_URL })

let refreshPromise: Promise<string | null> | null = null

function clearSessionAndRedirectToLogin() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status
    const url    = err.config?.url as string | undefined
    const config = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (status === 403) {
      const message = err.response?.data?.message ?? FORBIDDEN_MESSAGE
      const enhanced = Object.assign(err, { message })
      const navigate = getNavigate()
      if (navigate) {
        navigate('/forbidden')
      } else {
        window.location.href = '/forbidden'
      }
      return Promise.reject(enhanced)
    }

    if (status === 401) {
      if (url && url.includes('/auth/login')) {
        return Promise.reject(err)
      }
      if (url && url.includes('/auth/refresh')) {
        refreshPromise = null
        clearSessionAndRedirectToLogin()
        return Promise.reject(err)
      }

      if (config._retry) {
        clearSessionAndRedirectToLogin()
        return Promise.reject(err)
      }

      const doRefresh = async (): Promise<string | null> => {
        const data = await authService.refresh()
        if (!data) return null
        localStorage.setItem('token', data.accessToken)
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken)
        }
        return data.accessToken
      }

      if (!refreshPromise) {
        refreshPromise = doRefresh()
      }
      const newToken = await refreshPromise
      refreshPromise = null

      if (!newToken) {
        clearSessionAndRedirectToLogin()
        return Promise.reject(err)
      }

      config._retry = true
      config.headers.Authorization = `Bearer ${newToken}`
      return api.request(config)
    }

    return Promise.reject(err)
  }
)
