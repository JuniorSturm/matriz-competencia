# Migração da Planilha Atual

A planilha existente deve ser usada como base para popular o banco.

---

# Estratégia

Criar um console application em .NET para:

1 Ler planilha Excel
2 Transformar dados
3 Gerar inserts SQL

---

# Biblioteca recomendada

```
ClosedXML
```

---

# Etapas

### 1 Ler aba Descritivo

Popular:

```
skills
skill_descriptions
```

---

### 2 Ler matriz de competências

Popular:

```
skill_expectations
```

---

### 3 Ler avaliação atual

Popular:

```
users
skill_assessments
```

---

# Resultado

Gerar arquivo:

```
seed.sql
```

---

# Benefícios

* banco já populado
* histórico preservado
* sistema pronto para uso

---
