# Arquitetura do Sistema

## Modelo de Arquitetura

O sistema segue arquitetura:

Clean Architecture simplificada

Camadas:

```
Controller
Service
Repository
Database
```

---

# Backend

Estrutura de projeto

```
/src

/api
    Controllers

/application
    Services

/domain
    Entities
    Enums

/infrastructure
    Repositories
    Dapper
```

---

# Comunicação

Frontend → Backend → Database

```
React
   ↓
REST API
   ↓
Dapper
   ↓
PostgreSQL
```

---

# Padrões utilizados

### Repository Pattern

Isola acesso a dados.

---

### Service Layer

Centraliza regras de negócio.

---

### DTO Pattern

Evita exposição direta das entidades.

---

# Autenticação

JWT Authentication.

Fluxo:

```
login
 ↓
JWT Token
 ↓
requisições autenticadas
```

---

# Controle de acesso

Roles:

```
MANAGER
EMPLOYEE
```

---

# Fluxo de avaliação

```
Gestor seleciona colaborador
↓
Sistema carrega competências aplicáveis
↓
Gestor define nível atual
↓
Sistema salva avaliação
↓
Sistema calcula GAP
```

---

# Estrutura de APIs

```
/auth
/users
/skills
/assessments
/comparisons
```

---

# Deploy sugerido

Infraestrutura mínima:

```
Docker
PostgreSQL
API .NET
Frontend React
```

---
