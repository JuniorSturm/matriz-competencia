# Backend .NET

Tecnologia:

.NET 8 Web API

Bibliotecas:

* Dapper
* FluentValidation
* JWT Bearer

---

# Estrutura de projeto

```
CompetencyMatrix.API
CompetencyMatrix.Application
CompetencyMatrix.Domain
CompetencyMatrix.Infrastructure
```

---

# Controllers

```
AuthController
UserController
SkillController
AssessmentController
ComparisonController
```

---

# Exemplo endpoint

### Obter competências do colaborador

```
GET /assessments/{userId}
```

Resposta

```json
[
  {
    "skill": "DDD",
    "expected": "OURO",
    "current": "PRATA",
    "gap": -1
  }
]
```

---

# Endpoint de comparação

```
GET /comparisons?userA=1&userB=2
```

Resposta:

```
Skill
Esperado
UserA
UserB
```

---

# Repositórios

```
UserRepository
SkillRepository
AssessmentRepository
```

---

# Exemplo uso Dapper

```csharp
var result = connection.Query<SkillAssessment>(
    "SELECT * FROM skill_assessments WHERE user_id = @userId",
    new { userId }
);
```

---

# Serviços

Responsáveis por regras de negócio.

```
SkillService
AssessmentService
UserService
```

---

# Cálculo de GAP

```
gap = nivelEsperado - nivelAtual
```

---

# Segurança

Autorização por role.

```
[Authorize(Roles="MANAGER")]
```

---
