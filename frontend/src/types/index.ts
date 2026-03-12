// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest  { email: string; password: string }
export interface LoginResponse { id: string; token: string; name: string; isManager: boolean; isAdmin: boolean; isCoordinator: boolean; companyId: number | null }

// ─── Roles (cargos) / Níveis ────────────────────────────────────────────────────
export interface RoleOption { id: number; nome: string }
export interface RoleDetailResponse {
  id: number
  nome: string
  descricao: string | null
  companyId: number
  companyName: string | null
}
export interface CreateRoleRequest { nome: string; descricao?: string | null; companyId?: number | null }
export interface UpdateRoleRequest { nome: string; descricao?: string | null }
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
  isAdmin: boolean
  isCoordinator: boolean
  companyId: number | null
  companyName: string | null
  createdAt: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
  roleId: number | null
  gradeId: number | null
  isManager: boolean
  isCoordinator?: boolean
  companyId?: number | null
}

export interface UpdateUserRequest {
  name: string
  roleId: number | null
  gradeId: number | null
  isManager: boolean
  isCoordinator?: boolean
  companyId?: number | null
}

export interface ResetPasswordRequest {
  password: string
}

// ─── Skills ───────────────────────────────────────────────────────────────────
export interface SkillResponse   { id: number; name: string; category: string; companyId: number }
export interface CreateSkillRequest { name: string; category: string; companyId?: number | null }
export interface UpdateSkillRequest { name: string; category: string }

export interface PagedResult<T> {
  items: T[]
  totalCount: number
}

export interface AdminDashboardStats {
  totalUsers: number
  totalSkills: number
  totalManagers: number
}

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

// ─── Companies ────────────────────────────────────────────────────────────────
export interface CompanyResponse {
  id: number
  name: string
  document: string | null
  email: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  users: CompanyUserResponse[]
}

export interface CompanyUserResponse {
  id: string
  name: string
  email: string
  isManager: boolean
}

export interface CreateCompanyRequest {
  name: string
  document?: string | null
  email?: string | null
  phone?: string | null
  userIds?: string[]
}

export interface UpdateCompanyRequest {
  name: string
  document?: string | null
  email?: string | null
  phone?: string | null
  isActive: boolean
  userIds?: string[]
}

// ─── Teams ────────────────────────────────────────────────────────────────────
export interface TeamResponse {
  id: number
  companyId: number
  companyName: string | null
  name: string
  description: string | null
  createdAt: string
  members: TeamMemberResponse[]
  competencyIds: number[]
}

export interface TeamMemberResponse {
  userId: string
  userName: string
  userEmail: string
  isLeader: boolean
}

export interface TeamListItemResponse {
  id: number
  companyId: number
  companyName: string | null
  name: string
  description: string | null
  memberCount: number
  leaderName: string | null
  createdAt: string
}

export interface CreateTeamRequest {
  companyId: number
  name: string
  description?: string | null
  members: TeamMemberRequest[]
  competencyIds?: number[]
}

export interface TeamMemberRequest {
  userId: string
  isLeader: boolean
}

export interface UpdateTeamRequest {
  name: string
  description?: string | null
  members: TeamMemberRequest[]
  competencyIds?: number[]
}
