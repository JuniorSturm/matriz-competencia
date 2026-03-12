-- ============================================================
-- Cargos (roles) por Empresa + descrição
-- Adiciona: company_id e description em roles
-- ============================================================

SET client_encoding = 'UTF8';

-- 1. Adicionar colunas em roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Vincular cargos existentes à primeira empresa
UPDATE roles SET company_id = (SELECT id FROM companies ORDER BY id LIMIT 1) WHERE company_id IS NULL;

-- 3. Tornar company_id obrigatório
ALTER TABLE roles ALTER COLUMN company_id SET NOT NULL;

-- 4. Ajustar constraint: mesmo nome de cargo pode existir em empresas diferentes
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE roles ADD CONSTRAINT roles_company_name_unique UNIQUE (company_id, name);

-- 5. Índice para listagem por empresa
CREATE INDEX IF NOT EXISTS idx_roles_company ON roles (company_id);
