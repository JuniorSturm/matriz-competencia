// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string }
export interface LoginResponse { id: string; token: string; name: string; isManager: boolean }

// ─── Cargos / Níveis ──────────────────────────────────────────────────────────
export interface CargoOption { id: number; nome: string }
export interface NivelOption { id: number; nome: string; ordinal: number }
export interface CategoryResponse { id: number; nome: string }

// ─── Users ────────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: string
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  gradeId: number | null
  gradeName: string | null
  isManager: boolean
  createdAt: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  roleId: number | null
  gradeId: number | null
  isManager: boolean
}

export interface UpdateUserRequest {
  name: string
  roleId: number | null
  gradeId: number | null
  isManager: boolean
}

export interface ResetPasswordRequest {
  password: string
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export interface SkillResponse   { id: number; name: string; category: string }
export interface CreateSkillRequest { name: string; category: string }
export interface UpdateSkillRequest { name: string; category: string }

export interface SkillDescriptionDto {
  id: number
  skillId: number
  roleId: number
  level: string
  description: string
}

export interface UpsertDescriptionRequest {
  skillId: number
  roleId: number
  level: string
  description: string
}

export interface UpsertExpectationRequest {
  skillId: number
  roleId: number
  gradeId: number
  expectedLevel: CompetencyLevel
  isRequired: boolean
}

export interface SkillExpectationDto {
  id: number
  skillId: number
  roleId: number
  gradeId: number
  expectedLevel: CompetencyLevel
  isRequired: boolean
}

// ─── Assessments ──────────────────────────────────────────────────────────────
export interface AssessmentResponse {
  skillId: number
  skillName: string
  expectedLevel: CompetencyLevel
  currentLevel: CompetencyLevel
  gap: number
  roleName: string | null
}

export interface UpsertAssessmentRequest {
  userId: string
  skillId: number
  currentLevel: CompetencyLevel
}

// ─── Comparison ───────────────────────────────────────────────────────────────
export interface ComparisonRow {
  skillId: number
  skillName: string
  expectedLevel: CompetencyLevel
  userALevel: CompetencyLevel
  userBLevel: CompetencyLevel
  gapA: number
  gapB: number
  userCLevel?: CompetencyLevel | null
  gapC?: number | null
}

// ─── Enums ────────────────────────────────────────────────────────────────────
export type CompetencyLevel = 'DESCONHECE' | 'BRONZE' | 'PRATA' | 'OURO'
export const LEVELS: CompetencyLevel[] = ['DESCONHECE', 'BRONZE', 'PRATA', 'OURO']
export const LEVEL_VALUES: Record<CompetencyLevel, number> = {
  DESCONHECE: 0, BRONZE: 1, PRATA: 2, OURO: 3,
}
