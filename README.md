# Matriz de Competências

Sistema web para gestão e avaliação de competências técnicas e comportamentais.

---

## Estrutura do projeto

```
backend/     .NET 8 Web API (Clean Architecture + Dapper)
frontend/    React + TypeScript + Material UI + React Query
database/    Scripts SQL PostgreSQL
migrator/    Console app para importar planilha Excel
```

---

## Inicio rápido com Docker

```bash
docker-compose up -d
```

Acesse:
- **Frontend:** http://localhost:3000
- **API:**      http://localhost:5000

Login padrão Administrador:
- **E-mail:** admin@empresa.com
- **Senha:**  Admin@123

Login padrão Gestor:
- **E-mail:** gestor@empresa.com
- **Senha:**  

diego.liz@empresa.com

---

## Desenvolvimento local

### Backend

```bash
cd backend
dotnet run --project src/CompetencyMatrix.API
```

Configure a connection string em `src/CompetencyMatrix.API/appsettings.json`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## Migração da planilha Excel

Copie a planilha para a pasta `Base/` e execute:

```bash
cd migrator
dotnet run -- "../Base/Matriz Plataforma - Starship MC_v4.xlsx"
```

O arquivo `seed.sql` será gerado ao lado do Excel.  
Execute o seed no banco:

```bash
psql -U postgres -d competency_matrix -f seed.sql
```

### Formato esperado das abas do Excel

| Aba         | Coluna 1  | Coluna 2   | Coluna 3  | Coluna 4        | Coluna 5    |
|-------------|-----------|------------|-----------|-----------------|-------------|
| Descritivo  | Nome      | Categoria  | Cargo     | Nível           | Descrição   |
| Matriz      | Nome      | Cargo      | Graduação | Nível Esperado  | Obrigatório |
| Avaliação   | Nome      | E-mail     | Cargo     | Graduação       | Skill       | Nível |

---

## Variáveis de ambiente (API)

| Variável                     | Descrição               | Padrão                        |
|-----------------------------|-------------------------|-------------------------------|
| `ConnectionStrings__Default` | Connection string PG    | localhost:5432                |
| `Jwt__Secret`               | Chave JWT (mín 32 chars)| —                             |
| `Jwt__Issuer`               | Emissor JWT             | CompetencyMatrix              |
| `Jwt__Audience`             | Audiência JWT           | CompetencyMatrix              |
| `Jwt__ExpiryMinutes`        | Expiração do token      | 480                           |

---

## Perfis de acesso

| Funcionalidade      | MANAGER | EMPLOYEE |
|--------------------|---------|----------|
| Ver colaboradores  | ✔       | ✗        |
| Criar colaboradores| ✔       | ✗        |
| Ver competências   | ✔       | ✔        |
| Avaliar            | ✔       | ✗        |
| Ver avaliações     | ✔       | ✔ (própria) |
| Comparar           | ✔       | ✗        |
