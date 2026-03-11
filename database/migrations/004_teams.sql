-- ============================================================
-- Times (Teams) - Cadastro de times por empresa
-- Adiciona: is_coordinator em users, tabelas teams e team_members
-- ============================================================

SET client_encoding = 'UTF8';

-- 1. Perfil Coordenador em usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coordinator BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabela de times (por empresa)
CREATE TABLE IF NOT EXISTS teams (
    id          SERIAL PRIMARY KEY,
    company_id   INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);

-- 3. Membros do time (user_id, team_id, is_leader)
CREATE TABLE IF NOT EXISTS team_members (
    team_id   INT     NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id   UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_company   ON teams (company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user  ON team_members (user_id);
