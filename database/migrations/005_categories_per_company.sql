-- ============================================================
-- Categorias dinâmicas por empresa (substitui skill_categories)
-- - Nova tabela categories (company_id, name), máx 50 por empresa na aplicação
-- - skills passa a usar category_id em vez de category (string)
-- ============================================================

SET client_encoding = 'UTF8';

-- 1. Criar tabela categories
CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_company_id ON categories (company_id);

-- 2. Adicionar category_id em skills (nullable para migração)
ALTER TABLE skills ADD COLUMN IF NOT EXISTS category_id INT REFERENCES categories(id);

-- 3. Migrar dados: para cada (company_id, category) distinto, criar categoria e atualizar skills
INSERT INTO categories (company_id, name)
SELECT DISTINCT company_id, category
  FROM skills
 WHERE company_id IS NOT NULL
   AND category IS NOT NULL
   AND TRIM(category) <> ''
ON CONFLICT (company_id, name) DO NOTHING;

UPDATE skills s
   SET category_id = (SELECT c.id FROM categories c WHERE c.company_id = s.company_id AND c.name = s.category LIMIT 1)
 WHERE s.company_id IS NOT NULL
   AND s.category IS NOT NULL
   AND s.category_id IS NULL;

-- Para skills que não casaram (ex.: category vazio ou inexistente), usar primeira categoria da empresa
UPDATE skills s
   SET category_id = (SELECT c.id FROM categories c WHERE c.company_id = s.company_id ORDER BY c.id LIMIT 1)
 WHERE s.company_id IS NOT NULL
   AND s.category_id IS NULL;

-- 4. Remover coluna category e tornar category_id NOT NULL
ALTER TABLE skills ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE skills DROP COLUMN IF EXISTS category;

-- 5. Índices: remover os que usam category e criar para category_id
DROP INDEX IF EXISTS idx_skill_category;
DROP INDEX IF EXISTS idx_skills_company_category_name;
DROP INDEX IF EXISTS idx_skills_category_name;

CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills (category_id);
CREATE INDEX IF NOT EXISTS idx_skills_company_category_id_name ON skills (company_id, category_id, name);

-- 6. Remover tabela antiga skill_categories
DROP TABLE IF EXISTS skill_categories CASCADE;
