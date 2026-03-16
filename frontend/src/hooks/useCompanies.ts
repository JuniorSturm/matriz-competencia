import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { companyService } from '../services/companyService'

/** Lista completa (evitar em telas que só precisam de dropdown). */
export const useCompanies = (enabled = true) => {
  const { pathname } = useLocation()
  const isCompaniesListPage = pathname === '/companies'
  return useQuery({
    queryKey: ['companies'],
    queryFn: companyService.getAll,
    enabled: enabled && !isCompaniesListPage,
  })
}

/** Opções paginadas para dropdown/filtro (busca por nome). Só dispara quando enabled (ex.: dropdown aberto). */
export const useCompanyOptionsPaged = (
  page: number,
  pageSize: number,
  name: string | undefined,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ['companies', 'options', page, pageSize, name ?? ''],
    queryFn: () => companyService.getOptionsPaged(page, pageSize, name),
    enabled,
  })
