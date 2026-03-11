import { useQuery } from '@tanstack/react-query'
import { companyService } from '../services/companyService'

export const useCompanies = (enabled = true) =>
  useQuery({ queryKey: ['companies'], queryFn: companyService.getAll, enabled })
