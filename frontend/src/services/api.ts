import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url    = err.config?.url as string | undefined

    if (status === 401) {
      // No login, deixamos a própria tela tratar o erro.
      if (url && url.includes('/auth/login')) {
        return Promise.reject(err)
      }

      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)
