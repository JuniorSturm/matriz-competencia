-- ============================================================
-- Matriz de Competências - Criação do Banco de Dados
-- Script único de criação de tabelas, índices e estruturas
-- ============================================================

SET client_encoding = 'UTF8';

-- Tabela de categorias de competências
CREATE TABLE IF NOT EXISTS skill_categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Roles (áreas de atuação)
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- Grades (senioridade)
CREATE TABLE IF NOT EXISTS grades (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(50) NOT NULL UNIQUE,
    ordinal   INT NOT NULL DEFAULT 0
);

-- Usuários
CREATE TABLE IF NOT EXISTS users (
    id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    role_id    INT REFERENCES roles(id),
    grade_id   INT REFERENCES grades(id),
    is_manager BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Competências (sem duplicação; vínculo com cargos via skill_expectations)
CREATE TABLE IF NOT EXISTS skills (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(250) NOT NULL UNIQUE,
    category      VARCHAR(100) NOT NULL,
    is_meta_2026  BOOLEAN NOT NULL DEFAULT FALSE
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

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_assessment_user        ON skill_assessments (user_id);
CREATE INDEX IF NOT EXISTS idx_skill_category         ON skills (category);
CREATE INDEX IF NOT EXISTS idx_expectation_role_grade  ON skill_expectations (role_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_users_email            ON users (email);