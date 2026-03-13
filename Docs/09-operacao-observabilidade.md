# Plano: Operação e Observabilidade (health check, rate limiting, logging)

Documentação do terceiro item da lista de melhorias para SaaS. Objetivo: permitir que orquestradores e monitoramento verifiquem se a API está viva, limitar abuso por taxa de requisições e melhorar rastreabilidade com logging estruturado.

---

## Contexto

Hoje:

- Não existe endpoint de **health check** na API; o Docker Compose só tem healthcheck no Postgres. Orquestração (Kubernetes, Docker Swarm) ou load balancers não conseguem verificar se a API está pronta.
- Não há **rate limiting**; um cliente ou atacante pode enviar muitas requisições e sobrecarregar o serviço.
- O **logging** usa apenas o padrão do ASP.NET Core (Microsoft.Extensions.Logging); não há logs estruturados (JSON) nem correlação por request/tenant, o que dificulta análise em produção.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Health check na API | Endpoint(s) para readiness/liveness e, se possível, verificação de dependência (Postgres). |
| 2 | Rate limiting | Limitar requisições por IP (e opcionalmente por tenant) para evitar abuso. |
| 3 | Logging estruturado | Serilog com saída JSON e, onde fizer sentido, companyId/userId no contexto. |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Health check na API

### Objetivo

Expor um endpoint (ex.: `/health` ou `/ready`) que retorne 200 quando a aplicação estiver pronta para receber tráfego. Opcionalmente um endpoint que verifique a conexão com o PostgreSQL (readiness).

### Estado atual

- [backend/src/CompetencyMatrix.API/Program.cs](backend/src/CompetencyMatrix.API/Program.cs): não registra `AddHealthChecks` nem `MapHealthChecks`.
- O projeto usa Dapper com `IDbConnection`; a conexão é obtida via `DapperContext` (connection string em configuração).

### O que fazer

1. **Registrar health checks no Program.cs**
   - `builder.Services.AddHealthChecks()`.
   - Adicionar verificação de PostgreSQL: pacote `AspNetCore.HealthChecks.NpgSql` (ou equivalente para Npgsql). Registrar com `AddNpgSql(connectionString, name: "postgres")` (ou nome desejado). A connection string pode ser a mesma de `ConnectionStrings:Default`.
   - Se quiser separar “live” (processo vivo) de “ready” (pronto, com DB): usar `AddCheck` para o DB em um nome como "database" e mapear dois endpoints (ex.: `/health/live` sem DB e `/health/ready` com DB).

2. **Mapear endpoint(s)**
   - `app.MapHealthChecks("/health", new HealthCheckOptions { ... })` (ou `/health/ready` com predicate que inclua o check do Postgres).
   - Configurar `ResponseWriter` opcional para retornar JSON (ex.: `{"status":"Healthy","checks":[...]}`) em vez de texto plano, se o monitoramento consumir JSON.

3. **Segurança**
   - O endpoint de health normalmente não deve exigir autenticação, para que load balancers e Kubernetes possam chamar sem token. Manter rota fora de `[Authorize]` (não colocar em controller protegido ou usar `AllowAnonymous` se estiver em controller com Authorize global).

4. **Docker / documentação**
   - No `docker-compose.yml`, opcionalmente adicionar healthcheck ao serviço `api` usando `curl` ou `wget` para `http://localhost:5000/health` (ou a porta/rota escolhida).
   - Documentar no README a URL do health check e o significado de 200 (healthy) vs 503 (unhealthy).

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/CompetencyMatrix.API.csproj` (adicionar pacote de health check Npgsql)
- `backend/src/CompetencyMatrix.API/Program.cs`
- `docker-compose.yml` (opcional: healthcheck do serviço api)
- `README.md` (seção de operação ou variáveis)

### Critério de conclusão

- `GET /health` (ou `/health/ready`) retorna 200 quando a API e o Postgres estão acessíveis.
- Quando o Postgres está indisponível (ou connection string inválida), o endpoint retorna 503 (ou status indicando unhealthy).
- O endpoint não exige autenticação.

---

## Item 2: Rate limiting

### Objetivo

Limitar o número de requisições por IP (e opcionalmente por usuário/tenant) em um intervalo de tempo (ex.: 100 requisições por minuto por IP) para evitar abuso e garantir justiça de uso em ambiente multi-tenant.

### Estado atual

- Nenhum middleware de rate limiting está configurado na API.

### O que fazer

1. **Escolher abordagem**
   - **Opção A**: Middleware nativo do ASP.NET Core 7+ (`Microsoft.AspNetCore.RateLimiting`), com política por IP (e opcionalmente por header/custom key para tenant). Não exige pacote externo.
   - **Opção B**: Pacote de terceiros (ex.: AspNetCoreRateLimit) se precisar de regras mais complexas ou armazenamento distribuído.
   - Recomendação: começar com **Opção A** (RateLimiting built-in), política fixa por IP (ex.: 200 req/min por IP). O endpoint de health e o de login podem ser excluídos da política ou ter política mais permissiva.

2. **Implementar**
   - Em `Program.cs`: `builder.Services.AddRateLimiter(...)` com política nomeada (ex.: "api"). Configurar `PartitionedRateLimiter` por IP: `context.Connection.RemoteIpAddress?.ToString() ?? "unknown"`.
   - Limites: ex. `PermitLimit = 200`, `Window = TimeSpan.FromMinutes(1)`.
   - `app.UseRateLimiter()` antes de `UseAuthentication`/`UseAuthorization` (ou conforme documentação do middleware).
   - Endpoints a excluir (ou com política mais alta): `/health`, `/auth/login`. Isso pode ser feito com `EndpointMetadata` ou com política por endpoint.

3. **Resposta quando limite excedido**
   - Configurar `RejectionStatusCode = 429` e opcionalmente `OnRejected` para logar e retornar corpo com mensagem (ex.: "Muitas requisições. Tente novamente em X segundos.").

4. **Documentar**
   - README ou Docs: informar que a API aplica rate limiting por IP (ex.: 200 req/min) e que resposta 429 indica limite excedido; endpoints de health e login podem ter regras diferentes.

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/Program.cs`
- Opcional: `appsettings.json` para valores configuráveis (PermitLimit, Window) em vez de constantes no código.
- `README.md` ou Docs

### Critério de conclusão

- Após exceder o limite configurado (ex.: 200 req em 1 min do mesmo IP), a API retorna 429.
- Health e login continuam funcionando (excluídos ou com cota maior).
- Comportamento em desenvolvimento permanece aceitável (ex.: limite alto ou mesmo valor).

---

## Item 3: Logging estruturado

### Objetivo

Substituir ou complementar o logger padrão por um logger que emita saída estruturada (JSON) e permita enriquecer logs com contexto da requisição (correlation id, opcionalmente companyId/userId quando disponível).

### Estado atual

- [backend/src/CompetencyMatrix.API/appsettings.json](backend/src/CompetencyMatrix.API/appsettings.json): `Logging` com `LogLevel` apenas; console padrão.
- Nenhum Serilog ou logger estruturado configurado.

### O que fazer

1. **Adicionar Serilog (ou equivalente)**
   - Pacotes sugeridos: `Serilog.AspNetCore`, `Serilog.Sinks.Console`, `Serilog.Enrichers.Environment` (opcional). Para JSON: `Serilog.Formatting.Compact` ou `Serilog.Formatting.Json` (ou configuração do sink para JSON).
   - Em `Program.cs`: configurar `Host` com `UseSerilog(...)`. Ler configuração de `appsettings.json` (ex.: seção `Serilog`) para níveis e sinks. Em produção, sink Console com formatter JSON.

2. **Enriquecimento**
   - Request id: usar `Serilog.Enrichers.AspNetCore` ou middleware que adicione um correlation id ao `HttpContext` e enriqueça o log (ex.: `LogContext.PushProperty("RequestId", ...)`).
   - Opcional: middleware que, após autenticação, adicione `UserId` e `CompanyId` ao contexto de log (para todas as entradas de log daquela requisição). Cuidado com dados sensíveis; preferir IDs, não e-mail.

3. **Configuração por ambiente**
   - Development: saída legível (console com template de texto).
   - Production: saída JSON (para ingestão em agregadores como ELK, Datadog, etc.).

4. **Documentar**
   - README: mencionar que em produção os logs são estruturados (JSON) e quais propriedades são incluídas (RequestId, opcionalmente UserId, CompanyId). Manter ConnectionStrings e dados sensíveis fora dos logs.

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/CompetencyMatrix.API.csproj` (pacotes Serilog)
- `backend/src/CompetencyMatrix.API/Program.cs` (UseSerilog, configuração)
- `backend/src/CompetencyMatrix.API/appsettings.json` e `appsettings.Development.json` (seção Serilog)
- Opcional: middleware para correlation id e enriquecimento com UserId/CompanyId
- `README.md`

### Critério de conclusão

- Em produção (ou quando configurado), os logs da API saem em JSON com pelo menos timestamp, level, message e (se implementado) RequestId.
- Em desenvolvimento, os logs continuam legíveis no console.
- Nenhuma senha ou token é logado.

---

## Ordem sugerida de execução

1. **Item 1 (Health check)** – independe; prioridade para deploy e orquestração.
2. **Item 2 (Rate limiting)** – independe.
3. **Item 3 (Logging)** – independe.

Podem ser executados em qualquer ordem ou em paralelo. Ao pedir a um agente: “Execute o Item N do plano em Docs/09-operacao-observabilidade.md”.

---

## Referência rápida de arquivos

| Arquivo | Itens |
|---------|--------|
| CompetencyMatrix.API.csproj | 1, 3 |
| Program.cs | 1, 2, 3 |
| appsettings.json / Development | 3 |
| docker-compose.yml | 1 |
| README.md | 1, 2, 3 |
