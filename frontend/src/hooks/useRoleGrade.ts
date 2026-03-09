import { useQuery } from '@tanstack/react-query'
import { roleGradeService } from '../services/roleGradeService'

export const useCargos = () =>
  useQuery({ queryKey: ['cargos'], queryFn: roleGradeService.getCargos })

export const useNiveis = () =>
  useQuery({ queryKey: ['niveis'], queryFn: roleGradeService.getNiveis })

export const useCategories = () =>
  useQuery({ queryKey: ['skill-categories'], queryFn: roleGradeService.getCategories })
