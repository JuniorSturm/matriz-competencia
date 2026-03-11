-- ============================================================
-- Competências por Empresa + Competências por Time
-- Adiciona: company_id em skills, tabela team_competencies
-- ============================================================

SET client_encoding = 'UTF8';

-- 1. Adicionar company_id na tabela de competências
ALTER TABLE skills ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);

-- 2. Vincular competências existentes à primeira empresa
UPDATE skills SET company_id = (SELECT id FROM companies ORDER BY id LIMIT 1) WHERE company_id IS NULL;

-- 3. Tornar company_id obrigatório
ALTER TABLE skills ALTER COLUMN company_id SET NOT NULL;

-- 4. Ajustar constraint de unicidade: mesmo nome pode existir em empresas diferentes
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_name_key;
ALTER TABLE skills ADD CONSTRAINT skills_company_name_unique UNIQUE (company_id, name);

-- 5. Tabela de competências do time (seleção do banco de competências)
CREATE TABLE IF NOT EXISTS team_competencies (
    team_id   INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_id  INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, skill_id)
);

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_skills_company ON skills (company_id);
CREATE INDEX IF NOT EXISTS idx_team_competencies_team ON team_competencies (team_id);
CREATE INDEX IF NOT EXISTS idx_team_competencies_skill ON team_competencies (skill_id);
