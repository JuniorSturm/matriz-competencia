-- ============================================================
-- Migração SaaS - Transformação Multi-tenant
-- Adiciona: tabela companies, campo is_admin em users,
--           campo company_id em users, novo gestor padrão
-- ============================================================

SET client_encoding = 'UTF8';

-- 1. Adicionar coluna is_admin na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Criar tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    document    VARCHAR(20),
    email       VARCHAR(150),
    phone       VARCHAR(30),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Adicionar company_id na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id);

-- 4. Marcar o admin atual como Administrador (não mais gestor)
UPDATE users SET is_admin = TRUE, is_manager = FALSE WHERE email = 'admin@empresa.com';

-- 5. Criar empresa demo
INSERT INTO companies (name, document, email)
SELECT 'Empresa Demo', '00.000.000/0001-00', 'contato@empresa.com'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Empresa Demo');

-- 6. Criar novo usuário Gestor (senha: Gestor@123)
INSERT INTO users (id, name, email, password, role_id, grade_id, is_manager, is_admin, company_id, created_at)
SELECT
    gen_random_uuid(),
    'Gestor Padrão',
    'gestor@empresa.com',
    '$2a$11$hJlpe4Kww9XQN2JQUg4EkOvRMRbnXy77zPPSI8Mum359TrO.eX22q',
    NULL,
    NULL,
    TRUE,
    FALSE,
    (SELECT id FROM companies WHERE name = 'Empresa Demo'),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'gestor@empresa.com');

-- 7. Associar todos os usuários existentes (exceto admin) à empresa demo
UPDATE users
SET company_id = (SELECT id FROM companies WHERE name = 'Empresa Demo')
WHERE company_id IS NULL AND is_admin = FALSE;
