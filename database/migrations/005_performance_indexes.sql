-- ============================================================
-- Índices de Performance - Otimização de queries frequentes
-- ============================================================

SET client_encoding = 'UTF8';

-- Busca de usuários por empresa (UserService.GetAllByCompanyAsync)
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id);

-- Expectativas por skill_id (JOINs de assessment matrix)
CREATE INDEX IF NOT EXISTS idx_expectation_skill ON skill_expectations (skill_id);

-- Avaliações: índice cobrindo user_id + skill_id para LEFT JOIN da matrix
CREATE INDEX IF NOT EXISTS idx_assessment_user_skill ON skill_assessments (user_id, skill_id);

-- Descrições por skill_id (SkillRepository.GetDescriptionsAsync)
CREATE INDEX IF NOT EXISTS idx_skill_descriptions_skill ON skill_descriptions (skill_id);

-- Times: membros por user_id com is_leader (filtros de team membership)
CREATE INDEX IF NOT EXISTS idx_team_members_user_leader ON team_members (user_id, is_leader);
