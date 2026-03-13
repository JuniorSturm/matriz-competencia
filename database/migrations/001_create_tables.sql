-- Matriz de Competências - Criação do Banco de Dados
-- Script único de criação de tabelas, índices e estruturas
-- ============================================================

SET client_encoding = 'UTF8';

-- Tabela de categorias de competências
CREATE TABLE IF NOT EXISTS skill_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Empresas
CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    document    VARCHAR(20),
    email       VARCHAR(150),
    phone       VARCHAR(30),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Roles (cargos / áreas de atuação) por empresa
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    description TEXT,
    company_id  INT NOT NULL REFERENCES companies(id),
    CONSTRAINT roles_company_name_unique UNIQUE (company_id, name)
);

-- Grades (senioridade)
CREATE TABLE IF NOT EXISTS grades (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(50) NOT NULL UNIQUE,
    ordinal   INT NOT NULL DEFAULT 0
);

-- Usuários
CREATE TABLE IF NOT EXISTS users (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    role_id       INT REFERENCES roles(id),
    grade_id      INT REFERENCES grades(id),
    is_manager    BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    is_coordinator BOOLEAN NOT NULL DEFAULT FALSE,
    company_id    INT REFERENCES companies(id),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Competências (sem duplicação; vínculo com cargos via skill_expectations)
CREATE TABLE IF NOT EXISTS skills (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(250) NOT NULL,
    category      VARCHAR(100) NOT NULL,
    is_meta_2026  BOOLEAN NOT NULL DEFAULT FALSE,
    company_id    INT REFERENCES companies(id)
);

-- Descritivos por nível (por cargo)
CREATE TABLE IF NOT EXISTS skill_descriptions (
    id          SERIAL PRIMARY KEY,
    skill_id    INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    role_id     INT NOT NULL REFERENCES roles(id),
    level       VARCHAR(10) NOT NULL CHECK (level IN ('BRONZE','PRATA','OURO')),
    description TEXT,
    UNIQUE (skill_id, role_id, level)
);

-- Expectativas por cargo/grade
CREATE TABLE IF NOT EXISTS skill_expectations (
    id             SERIAL PRIMARY KEY,
    skill_id       INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    role_id        INT NOT NULL REFERENCES roles(id),
    grade_id       INT NOT NULL REFERENCES grades(id),
    expected_level VARCHAR(10) NOT NULL CHECK (expected_level IN ('DESCONHECE','BRONZE','PRATA','OURO')),
    is_required    BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (skill_id, role_id, grade_id)
);

-- Avaliações
CREATE TABLE IF NOT EXISTS skill_assessments (
    id            SERIAL PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id      INT  NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    current_level VARCHAR(10) NOT NULL CHECK (current_level IN ('DESCONHECE','BRONZE','PRATA','OURO')),
    last_updated  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

-- Times por empresa
CREATE TABLE IF NOT EXISTS teams (
    id          SERIAL PRIMARY KEY,
    company_id  INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);

-- Membros do time
CREATE TABLE IF NOT EXISTS team_members (
    team_id   INT     NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id   UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (team_id, user_id)
);

-- Competências selecionadas para cada time
CREATE TABLE IF NOT EXISTS team_competencies (
    team_id   INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    skill_id  INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, skill_id)
);

-- Auditoria de operações (CREATE / UPDATE / DELETE)
CREATE TABLE IF NOT EXISTS audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    user_id      UUID NULL REFERENCES users(id),
    user_email   VARCHAR(255),
    ip_address   VARCHAR(64),

    entity_type  VARCHAR(100) NOT NULL,
    entity_id    TEXT         NOT NULL,
    operation    VARCHAR(16)  NOT NULL,

    company_id   INT NULL REFERENCES companies(id),
    team_id      INT NULL REFERENCES teams(id),

    payload      JSONB
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assessment_user           ON skill_assessments (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_category            ON skills (category);
CREATE INDEX IF NOT EXISTS idx_expectation_role_grade    ON skill_expectations (role_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_users_email               ON users (email);
CREATE INDEX IF NOT EXISTS idx_teams_company             ON teams (company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team         ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user         ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_skills_company            ON skills (company_id);
CREATE INDEX IF NOT EXISTS idx_team_competencies_team    ON team_competencies (team_id);
CREATE INDEX IF NOT EXISTS idx_team_competencies_skill   ON team_competencies (skill_id);

-- Índices adicionais de performance (unificados dos migrations 005 e 006)
CREATE INDEX IF NOT EXISTS idx_users_company_id          ON users (company_id);
CREATE INDEX IF NOT EXISTS idx_expectation_skill         ON skill_expectations (skill_id);
CREATE INDEX IF NOT EXISTS idx_assessment_user_skill     ON skill_assessments (user_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_descriptions_skill  ON skill_descriptions (skill_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_leader  ON team_members (user_id, is_leader);

CREATE INDEX IF NOT EXISTS idx_skills_company_category_name
    ON skills (company_id, category, name);
CREATE INDEX IF NOT EXISTS idx_skills_category_name
    ON skills (category, name);
CREATE INDEX IF NOT EXISTS idx_users_company_name
    ON users (company_id, name);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill
    ON skill_assessments (skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_descriptions_role
    ON skill_descriptions (role_id);

-- Auditoria: paginação e filtros por empresa/usuário
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created_at
    ON audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
    ON audit_logs (user_id, created_at DESC);