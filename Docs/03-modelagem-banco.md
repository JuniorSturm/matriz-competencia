# Modelagem de Banco de Dados

Banco utilizado:

PostgreSQL

---

# Entidades principais

```
users
roles
grades
skills
skill_descriptions
skill_expectations
skill_assessments
```

---

# Tabela roles

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
```

Valores:

```
DEV
TEST
DEVOPS
MANAGER
```

---

# Tabela grades

```sql
CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);
```

Valores:

```
JUNIOR
PLENO
SENIOR
```

---

# Tabela users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(150),
    email VARCHAR(150),
    role_id INT,
    grade_id INT,
    is_manager BOOLEAN,
    created_at TIMESTAMP
);
```

---

# Tabela categories (categorias por empresa)

Categorias são dinâmicas por empresa (máx. 50 por empresa). Substituem a antiga tabela global `skill_categories`.

```sql
CREATE TABLE categories (
    id         SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    UNIQUE (company_id, name)
);
```

---

# Tabela skills

Competências vinculam-se a uma **categoria** da mesma empresa via `category_id`.

```sql
CREATE TABLE skills (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(250) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(id),
    company_id  INT REFERENCES companies(id),
    ...
);
```

A coluna `category` (string) foi removida; a migração `005_categories_per_company.sql` cria `categories` a partir dos valores distintos de `(company_id, category)` existentes em `skills`, atualiza `skills.category_id` e remove a tabela `skill_categories`.

---

# Tabela skill_descriptions

Define o descritivo por nível.

```sql
CREATE TABLE skill_descriptions (
    id SERIAL PRIMARY KEY,
    skill_id INT,
    level VARCHAR(10),
    description TEXT
);
```

Levels:

```
BRONZE
PRATA
OURO
```

---

# Tabela skill_expectations

Define o esperado por cargo.

```sql
CREATE TABLE skill_expectations (
    id SERIAL PRIMARY KEY,
    skill_id INT,
    role_id INT,
    grade_id INT,
    expected_level VARCHAR(10),
    is_required BOOLEAN
);
```

---

# Tabela skill_assessments

Avaliação real.

```sql
CREATE TABLE skill_assessments (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    skill_id INT,
    current_level VARCHAR(10),
    last_updated TIMESTAMP
);
```

---

# Índices recomendados

```
idx_assessment_user
idx_skill_role
idx_expectation_role_grade
```

---
