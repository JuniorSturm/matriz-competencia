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

## Início rápido com Docker

```bash
docker-compose up -d
```

### Acesso às aplicações

- **Frontend:** `http://localhost:3000`
- **API:** `http://localhost:5100`

### Health check da API

- **Liveness:** `GET http://localhost:5100/health/live`
- **Readiness (inclui Postgres):** `GET http://localhost:5100/health/ready`
  - Retorna **200** quando a API está pronta e consegue acessar o banco.
  - Retorna **503** (ou status unhealthy) quando o Postgres está indisponível ou a conexão falha.

### Logins padrões gerados pelo seed

- **Administrador (Admin global)**
  - **E-mail:** `admin@empresa.com`
  - **Senha:** `Admin@123`

- **Gestor**
  - **E-mail:** `gestor@empresa.com`
  - **Senha:** `Admin@123`

- **Coordenador**
  - **E-mail:** `alvadi.pedrao@nddtech.com`
  - **Senha:** `Admin@123`

- **Colaborador (exemplo)**
  - **E-mail:** `diego.liz@empresa.com`
  - **Senha:** `Mudar@123`

---

## Desenvolvimento local

### Backend

```bash
cd backend
dotnet run --project src/CompetencyMatrix.API
```

Configure a connection string em `src/CompetencyMatrix.API/appsettings.json`.

**Importante:** após qualquer alteração no código da API, reinicie o processo (Ctrl+C e execute novamente) para carregar as mudanças.

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

| Variável                     | Descrição                                        | Padrão / Notas                        |
|-----------------------------|--------------------------------------------------|----------------------------------------|
| `ConnectionStrings__Default` | Connection string PostgreSQL                    | localhost:5432                         |
| `Cors__AllowedOrigins`      | Origens CORS permitidas (separadas por `;`)     | Em prod: ex. `https://app.seudominio.com` |
| `Jwt__Secret`               | Chave JWT (mín. 32 caracteres)                  | **Obrigatório em produção**; nunca usar valor de exemplo |
| `Jwt__Issuer`               | Emissor JWT                                     | CompetencyMatrix                       |
| `Jwt__Audience`             | Audiência JWT                                   | CompetencyMatrix                       |
| `Jwt__ExpiryMinutes`        | Expiração do token em minutos                   | 480                                    |
| `AllowedHosts`              | Hosts permitidos (separados por `;`)            | Em prod: listar domínios; `*` não recomendado |

**Produção:** `Jwt__Secret` é obrigatório e deve ter no mínimo 32 caracteres. Nunca use o valor de exemplo do docker-compose em produção; defina a variável no host ou em um arquivo `.env` não versionado. Configure `AllowedHosts` (ou `appsettings.Production.json`) com os domínios permitidos separados por `;`; usar `*` desabilita a validação e não é recomendado em produção.

---

## Rate limiting da API

- A API aplica **rate limiting por IP** usando janela fixa:
  - Até **200 requisições por minuto** por endereço IP.
  - Respostas acima do limite retornam **HTTP 429** com mensagem em JSON.
- Exceções:
  - Endpoints de health (`/health/live`, `/health/ready`) não são limitados.
  - Endpoint de login (`/auth/login`) não é limitado para não prejudicar a experiência do usuário.

---

## Logging estruturado

- A API utiliza **Serilog** como logger principal.
- Em **desenvolvimento**, os logs são enviados para o console em formato legível.
- Em **produção** (ou quando configurado com `Serilog`), os logs são emitidos em **JSON compacto**, incluindo:
  - `@t` (timestamp), `@l` (nível), `@m` (mensagem) e exceções quando houver.
  - Propriedades de contexto como `UserId` e `CompanyId` quando o usuário está autenticado.

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

---

## Regras de paginação e isolamento por empresa

- **Paginação da API**
  - Endpoints paginados (`/users/paged`, `/skills/paged`, `/roles/paged`, `/audit/logs`) usam:
    - `pageSize` padrão: 50;
    - `pageSize` máximo: 100 (valores maiores são limitados a 100).
- **Escopo por empresa**
  - Apenas usuários com perfil **ADMIN** podem usar escopo global (dados de todas as empresas).
  - Usuários não-admin sempre são filtrados pela própria empresa, quando houver `CompanyId`.
  - Usuário não-admin **sem** empresa associada recebe listas vazias em listagens multi-tenant (skills, usuários, auditoria), e não enxerga dados de outras empresas.
