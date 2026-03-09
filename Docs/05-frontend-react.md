# Frontend React

Stack:

* React
* Typescript
* Material UI
* React Query
* React Router

---

# Estrutura de projeto

```
/src

/pages
/components
/services
/types
/hooks
```

---

# Páginas

```
Dashboard
Users
Skills
Assessments
Comparison
```

---

# Tela de Avaliação

Tabela:

```
Skill
Nivel Esperado
Nivel Atual
Gap
```

Dropdown:

```
Desconhece
Bronze
Prata
Ouro
```

---

# Tela de comparação

Tabela comparativa.

```
Skill | Esperado | Colaborador A | Colaborador B
```

---

# Tela do colaborador

Somente leitura.

```
Minha Matriz
```

---

# Visualizações recomendadas

### Radar Chart

Competências principais.

---

### Gap chart

Evolução profissional.

---

# Comunicação API

Utilizar React Query.

Exemplo:

```
useQuery("assessments", fetchAssessments)
```

---
