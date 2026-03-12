-- Seed de volume para testes de desempenho
-- Gera dados sintéticos em grande quantidade preservando relacionamentos
-- Quantidades aproximadas:
-- - 500 empresas
-- - 2000 cargos
-- - 20.000 colaboradores
-- - 100.000 competências
-- - 2000 times

SET client_encoding = 'UTF8';

-- ============================================================
-- EMPRESAS (500)
-- ============================================================
INSERT INTO companies (name, document, email, phone, is_active, created_at)
SELECT
  'LT Empresa ' || gs                                          AS name,
  lpad(gs::text, 14, '0')                                      AS document,
  'empresa' || gs || '@loadtest.com'                           AS email,
  '+55 47 9' || lpad((100000 + gs)::text, 8, '0')              AS phone,
  TRUE                                                         AS is_active,
  NOW()                                                        AS created_at
FROM generate_series(1, 500) AS gs;

-- ============================================================
-- CARGOS (2000) distribuídos entre empresas
-- ============================================================
-- Máximo de 10 cargos por empresa.
-- Aqui criamos exatamente 4 cargos por empresa (500 * 4 = 2000).
INSERT INTO roles (name, description, company_id)
SELECT
  'LT Cargo ' || c.id || '-' || gs                                                 AS name,
  'Cargo de carga de desempenho ' || c.id || '-' || gs                             AS description,
  c.id                                                                             AS company_id
FROM companies c
CROSS JOIN generate_series(1, 4) AS gs;

-- ============================================================
-- TIMES (2000) distribuídos entre empresas
-- ============================================================
-- Também criamos 4 times por empresa (500 * 4 = 2000).
INSERT INTO teams (company_id, name, description, created_at)
SELECT
  c.id                                                                              AS company_id,
  'LT Time ' || c.id || '-' || gs                                                  AS name,
  'Time de carga de desempenho ' || c.id || '-' || gs                               AS description,
  NOW()                                                                             AS created_at
FROM companies c
CROSS JOIN generate_series(1, 4) AS gs;

-- ============================================================
-- COLABORADORES (>= 20.000) distribuídos entre empresas
--  - mínimo 10 por empresa (na prática ~40+ por empresa)
--  - entre 1 e 3 gestores por empresa
--  - entre 1 e 3 coordenadores por empresa
-- ============================================================
DO $$
DECLARE
  c_rec        RECORD;
  base_count   INTEGER;
  mgr_count    INTEGER;
  coord_count  INTEGER;
BEGIN
  FOR c_rec IN SELECT id FROM companies LOOP
    -- Quantidade base de colaboradores "normais" por empresa (30 a 45).
    base_count  := 30 + floor(random() * 16)::INT;
    mgr_count   := 1 + floor(random() * 3)::INT;  -- 1 a 3 gestores
    coord_count := 1 + floor(random() * 3)::INT;  -- 1 a 3 coordenadores

    -- Colaboradores normais
    INSERT INTO users (
      id, name, email, password, role_id, grade_id,
      is_manager, is_admin, is_coordinator, company_id, created_at
    )
    SELECT
      gen_random_uuid()                                                                 AS id,
      format('LT Colaborador %s-%s', c_rec.id, gs)                                      AS name,
      format('colab%s_%s@loadtest.com', c_rec.id, gs)                                   AS email,
      '$2a$11$utjxWptHPiu/5Ctui/MsNuEKYtrNURbMj4XdjVG.WP/xrs0QHp7vm'                   AS password, -- senha: Mudar@123
      (SELECT id FROM roles  WHERE company_id = c_rec.id ORDER BY random() LIMIT 1)     AS role_id,
      (SELECT id FROM grades ORDER BY random() LIMIT 1)                                 AS grade_id,
      FALSE                                                                             AS is_manager,
      FALSE                                                                             AS is_admin,
      FALSE                                                                             AS is_coordinator,
      c_rec.id                                                                          AS company_id,
      NOW()                                                                             AS created_at
    FROM generate_series(1, base_count) AS gs;

    -- Gestores
    INSERT INTO users (
      id, name, email, password, role_id, grade_id,
      is_manager, is_admin, is_coordinator, company_id, created_at
    )
    SELECT
      gen_random_uuid()                                                                 AS id,
      format('LT Gestor %s-%s', c_rec.id, gs)                                           AS name,
      format('gestor%s_%s@loadtest.com', c_rec.id, gs)                                  AS email,
      '$2a$11$utjxWptHPiu/5Ctui/MsNuEKYtrNURbMj4XdjVG.WP/xrs0QHp7vm'                   AS password,
      (SELECT id FROM roles  WHERE company_id = c_rec.id ORDER BY random() LIMIT 1)     AS role_id,
      (SELECT id FROM grades ORDER BY random() LIMIT 1)                                 AS grade_id,
      TRUE                                                                              AS is_manager,
      FALSE                                                                             AS is_admin,
      FALSE                                                                             AS is_coordinator,
      c_rec.id                                                                          AS company_id,
      NOW()                                                                             AS created_at
    FROM generate_series(1, mgr_count) AS gs;

    -- Coordenadores
    INSERT INTO users (
      id, name, email, password, role_id, grade_id,
      is_manager, is_admin, is_coordinator, company_id, created_at
    )
    SELECT
      gen_random_uuid()                                                                 AS id,
      format('LT Coordenador %s-%s', c_rec.id, gs)                                      AS name,
      format('coord%s_%s@loadtest.com', c_rec.id, gs)                                   AS email,
      '$2a$11$utjxWptHPiu/5Ctui/MsNuEKYtrNURbMj4XdjVG.WP/xrs0QHp7vm'                   AS password,
      (SELECT id FROM roles  WHERE company_id = c_rec.id ORDER BY random() LIMIT 1)     AS role_id,
      (SELECT id FROM grades ORDER BY random() LIMIT 1)                                 AS grade_id,
      FALSE                                                                             AS is_manager,
      FALSE                                                                             AS is_admin,
      TRUE                                                                              AS is_coordinator,
      c_rec.id                                                                          AS company_id,
      NOW()                                                                             AS created_at
    FROM generate_series(1, coord_count) AS gs;
  END LOOP;
END
$$;

-- ============================================================
-- COMPETÊNCIAS (100.000) distribuídas entre categorias e empresas
-- ============================================================
INSERT INTO skills (name, category, is_meta_2026, company_id)
SELECT
  'LT Skill ' || gs                                                                 AS name,
  (ARRAY[
    'Desenvolvimento',
    'DevOps',
    'Qualidade',
    'Gestão',
    'Soft Skill'
  ])[1 + floor(random() * 5)::int]                                                 AS category,
  (random() < 0.25)                                                                 AS is_meta_2026,
  -- Distribui as competências entre empresas, garantindo que cada empresa receba várias.
  (SELECT id FROM companies ORDER BY random() LIMIT 1)                              AS company_id
FROM generate_series(1, 100000) AS gs;

-- ============================================================
-- EXPECTATIVAS POR COMPETÊNCIA (1 por skill, ligada a cargo/grade)
-- ============================================================
INSERT INTO skill_expectations (
  skill_id, role_id, grade_id, expected_level, is_required
)
SELECT
  s.id                                                                              AS skill_id,
  r.id                                                                              AS role_id,
  g.id                                                                              AS grade_id,
  (ARRAY['DESCONHECE','BRONZE','PRATA','OURO'])[1 + floor(random() * 4)::int]      AS expected_level,
  (random() < 0.6)                                                                  AS is_required
FROM skills AS s
JOIN LATERAL (
  SELECT id FROM roles ORDER BY random() LIMIT 1
) AS r ON TRUE
JOIN LATERAL (
  SELECT id FROM grades ORDER BY random() LIMIT 1
) AS g ON TRUE
ON CONFLICT (skill_id, role_id, grade_id) DO NOTHING;

-- ============================================================
-- AVALIAÇÕES (1 avaliação por colaborador, em uma skill aleatória)
-- ============================================================
INSERT INTO skill_assessments (user_id, skill_id, current_level, last_updated)
SELECT
  u.id                                                                              AS user_id,
  s.id                                                                              AS skill_id,
  (ARRAY['DESCONHECE','BRONZE','PRATA','OURO'])[1 + floor(random() * 4)::int]      AS current_level,
  NOW()                                                                             AS last_updated
FROM users AS u
JOIN LATERAL (
  SELECT id FROM skills ORDER BY random() LIMIT 1
) AS s ON TRUE
ON CONFLICT (user_id, skill_id) DO NOTHING;

-- ============================================================
-- TIME_MEMBERS (cada time com 5 a 20 membros)
-- ============================================================
DO $$
DECLARE
  t_rec        RECORD;
  member_count INTEGER;
BEGIN
  FOR t_rec IN
    SELECT t.id, t.company_id
    FROM teams t
    WHERE t.name LIKE 'LT Time %'
  LOOP
    member_count := 5 + floor(random() * 16)::INT; -- 5 a 20 membros

    INSERT INTO team_members (team_id, user_id, is_leader)
    SELECT
      t_rec.id                                                                    AS team_id,
      u.id                                                                        AS user_id,
      (ROW_NUMBER() OVER ()) = 1                                                 AS is_leader
    FROM (
      SELECT id
      FROM users
      WHERE company_id = t_rec.company_id
      ORDER BY random()
      LIMIT member_count
    ) AS u
    ON CONFLICT (team_id, user_id) DO NOTHING;
  END LOOP;
END
$$;

-- ============================================================
-- TIME_COMPETENCIES (cada time com ~10 competências aleatórias)
-- ============================================================
INSERT INTO team_competencies (team_id, skill_id)
SELECT
  t.id                                                                              AS team_id,
  s.id                                                                              AS skill_id
FROM teams AS t
JOIN LATERAL (
  -- Seleciona até 10 competências da mesma empresa do time, para melhor distribuição.
  SELECT id
  FROM skills
  WHERE company_id = t.company_id
  ORDER BY random()
  LIMIT 10
) AS s ON TRUE
ON CONFLICT (team_id, skill_id) DO NOTHING;

