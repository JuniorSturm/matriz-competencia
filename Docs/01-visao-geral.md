# Sistema de Gestão de Matriz de Competências

## Objetivo

Substituir a planilha atual de gestão de competências por uma aplicação web capaz de:

* Gerenciar colaboradores
* Gerenciar competências técnicas e comportamentais
* Avaliar nível de colaboradores
* Comparar colaboradores
* Visualizar gaps de competências

O sistema será utilizado por duas personas:

* **Gestor**
* **Colaborador**

---

# Problema atual

A matriz de competências atualmente é mantida em uma planilha Excel que:

* possui alto volume de dados
* mistura modelo de competências com avaliação
* dificulta visualização por colaborador
* dificulta comparações
* possui alto risco de inconsistência

---

# Objetivos da solução

1. Centralizar as competências em um sistema
2. Separar **modelo de competências** de **avaliação**
3. Permitir comparação entre colaboradores
4. Facilitar evolução profissional
5. Possibilitar análises estratégicas da equipe

---

# Stack Tecnológica

Frontend

* React
* Typescript
* Material UI
* React Query

Backend

* .NET 8 Web API
* Dapper
* JWT Authentication

Banco de Dados

* PostgreSQL

---

# Perfis de Usuário

## Colaborador

Pode:

* visualizar sua matriz de competências
* visualizar níveis esperados
* visualizar gaps

Não pode:

* editar dados
* visualizar outros colaboradores

---

## Gestor

Pode:

* cadastrar colaboradores
* cadastrar competências
* avaliar colaboradores
* comparar colaboradores
* visualizar indicadores

---

# Conceitos principais

## Competência

Uma habilidade técnica ou comportamental.

Exemplos:

* DDD
* Observabilidade
* Arquitetura
* Comunicação

---

## Graduação

Representa o nível do cargo.

* Junior
* Pleno
* Senior

---

## Nível de Competência

Representa maturidade na habilidade.

* Desconhece
* Bronze
* Prata
* Ouro

---

# Modelo Conceitual

O sistema separa:

### Template de Competências

Define o que é esperado para cada cargo.

### Avaliação

Define o nível atual de cada colaborador.

---

# Funcionalidades principais

### Gestão de Colaboradores

Cadastro e manutenção.

### Gestão de Competências

Cadastro e definição por cargo.

### Avaliação de Competências

Avaliação de cada colaborador.

### Comparação

Comparação entre dois colaboradores.

### Visualização de Gap

Diferença entre esperado e atual.

---