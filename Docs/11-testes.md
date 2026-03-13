# Plano: Testes automatizados (unitários e integração)

Documentação do quinto item da lista de melhorias para SaaS. Objetivo: introduzir projetos de testes no backend (e opcionalmente no frontend) para proteger regras de isolamento por empresa, autenticação e limites, e permitir evoluir o sistema com segurança.

---

## Contexto

Hoje o repositório **não possui** projetos de teste (nenhum `*Tests*` ou `*.Test.csproj`, nem configuração Jest/Vitest no frontend). As regras críticas para SaaS (filtro por empresa, permissões, paginação limitada) não são cobertas por testes automatizados, o que aumenta o risco de regressão ao implementar os outros planos (07–10, 12–14).

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Projeto de testes unitários (Application) | Criar projeto xUnit (ou NUnit) que teste serviços da camada Application com repositórios mockados, focando em Auth, User (isolamento por empresa) e regras de paginação. |
| 2 | Testes de integração (API) | Criar projeto de testes de integração que suba a API em memória (WebApplicationFactory) e valide endpoints críticos (login, listagens com filtro por empresa, paginação limitada). |
| 3 | Frontend – testes (opcional) | Configurar Vitest (ou Jest) e adicionar testes para hooks/serviços críticos (ex.: api interceptor 401/403, auth). |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Projeto de testes unitários (Application)

### Objetivo

Criar um projeto de testes que referencie `CompetencyMatrix.Application` e teste os serviços com dependências mockadas (repositórios e IAuditService), garantindo regras de negócio e isolamento por empresa.

### Estado atual

- Solução: [backend/CompetencyMatrix.slnx](backend/CompetencyMatrix.slnx) contém apenas API, Application, Domain, Infrastructure. Nenhum projeto de teste.
- Application depende de Domain; os serviços dependem de interfaces em `CompetencyMatrix.Application.Interfaces` (repositórios, IAuditService, etc.).

### O que fazer

1. **Criar projeto de testes**
   - Nome sugerido: `CompetencyMatrix.Application.Tests` (ou `CompetencyMatrix.UnitTests`).
   - SDK: `Microsoft.NET.Sdk` com `OutputType` Library.
   - TargetFramework: `net8.0`.
   - Referência ao projeto `CompetencyMatrix.Application`.
   - Pacotes: `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, `NSubstitute` (ou Moq) para mocks.
   - Adicionar o projeto à solução (editar `CompetencyMatrix.slnx` ou usar `dotnet sln add`).

2. **Testes prioritários**
   - **AuthService.LoginAsync**
     - Dado usuário existente e senha correta: retorna LoginResponse com token e dados esperados.
     - Dado usuário inexistente ou senha incorreta: retorna null.
   - **UserService.GetAllAsync**
     - Dado currentUserId de um **Admin**: retorna todos os usuários (mock do repositório retornando lista com 2 usuários de empresas diferentes; resultado deve ter 2).
     - Dado currentUserId de um **Manager** com CompanyId = 1: retorna apenas usuários da empresa 1 (mock de GetAllByCompanyAsync(1)).
     - Dado currentUserId de um **Manager** com CompanyId = null: retorna lista vazia (comportamento esperado após o Item 2 do plano 08).
     - Dado currentUserId de um **colaborador** (não Admin/Manager/Coordinator): não deve retornar todos; comportamento esperado conforme regra (ex.: lista vazia ou apenas própria empresa – alinhar com regra de negócio).
   - **UserService.GetPagedAsync**
     - Garantir que pageSize > MaxPageSize (ex.: 150) seja limitado ao teto (ex.: 100) antes de chamar o repositório, se a lógica de cap estiver no service; ou documentar que o cap está no controller e testar no Item 2 (integração).
   - **SkillService** (opcional na primeira leva): GetPagedAsync com companyId null vs companyId preenchido; garantir que não-admin não receba dados de outra empresa (se a regra for aplicada no service; senão cobrir no controller/integração).
   - **RoleService.ResolveScopeCompanyIdAsync** (se exposto ou testável indiretamente): Admin com companyId null retorna null (todas); não-admin com CompanyId 1 retorna 1.

3. **Organização**
   - Uma classe de teste por serviço testado (ex.: `AuthServiceTests`, `UserServiceTests`). Usar construtor para criar o serviço com mocks (NSubstitute ou Moq). Dados de teste: GUIDs e IDs fixos para facilitar asserções.

4. **Execução**
   - `dotnet test` no diretório do backend deve descobrir e executar os testes. Documentar no README como rodar os testes.

### Arquivos a criar/alterar

- Novo: `backend/tests/CompetencyMatrix.Application.Tests/CompetencyMatrix.Application.Tests.csproj` (ou em `backend/src/` conforme convenção do projeto).
- Novo: classes `*Tests.cs` no projeto de testes.
- [backend/CompetencyMatrix.slnx](backend/CompetencyMatrix.slnx) (adicionar referência ao projeto de testes).
- README: seção “Testes” com comando `dotnet test`.

### Critério de conclusão

- `dotnet test` no backend executa os testes e todos passam.
- Pelo menos AuthService e UserService têm testes que cobrem cenários Admin vs Manager vs colaborador e isolamento por CompanyId.
- Nenhum teste depende de banco real ou de API externa.

---

## Item 2: Testes de integração (API)

### Objetivo

Criar um projeto de testes de integração que use `WebApplicationFactory<Program>` (ou equivalente) para subir a API em memória com banco em memória (SQLite ou Testcontainers com Postgres) e validar endpoints críticos: login, listagem de usuários/skills com filtro por empresa e aplicação do teto de pageSize.

### Estado atual

- A API usa Dapper e connection string para PostgreSQL. Para integração, é possível usar Testcontainers (Postgres em container efêmero) ou substituir em teste por provedor em memória (ex.: SQLite) se a camada de dados permitir; hoje o código usa SQL específico de Postgres em vários pontos, então **Testcontainers** é a opção mais realista.
- Controllers estão em [backend/src/CompetencyMatrix.API](backend/src/CompetencyMatrix.API); Program.cs não expõe `Program` para o WebApplicationFactory (é necessário `public partial class Program` ou assembly que exponha o entry point).

### O que fazer

1. **Criar projeto de integração**
   - Nome: `CompetencyMatrix.API.Tests` ou `CompetencyMatrix.IntegrationTests`.
   - Referências: projeto `CompetencyMatrix.API`, pacotes `Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.NET.Test.Sdk`, `xunit`, `Testcontainers.PostgreSql` (ou Testcontainers).
   - Adicionar à solução.

2. **Configurar WebApplicationFactory**
   - Classe que herda `WebApplicationFactory<Program>`. Garantir que `Program` seja acessível (no API, adicionar `public partial class Program { }` em um arquivo vazio se necessário).
   - Override `ConfigureWebHost` para substituir a connection string pela do container Postgres (iniciar container no construtor da factory ou em fixture, obter connection string e setar em `Configuration` ou em variável de ambiente).
   - Aplicar migrations ou script SQL de criação de tabelas antes dos testes (ou usar o mesmo script de [database/migrations/001_create_tables.sql](database/migrations/001_create_tables.sql) e seed mínimo).

3. **Testes prioritários**
   - **POST /auth/login**: com usuário seed (criar um no setup), retorna 200 e body com token. Com credenciais inválidas, retorna 401.
   - **GET /users** (ou /users/paged) com token de **Admin**: retorna 200 e lista. Com token de **Manager** de empresa 1: retorna apenas usuários da empresa 1 (seed com 2 empresas e usuários).
   - **GET /skills/paged?pageSize=200**: resposta deve conter no máximo 100 itens (após implementar Item 1 do plano 08), ou BadRequest se a API validar e rejeitar.
   - **GET /users** com token de usuário **sem permissão** (role que não seja MANAGER/ADMIN/COORDINATOR): retorna 403 (se a API restringir) ou 200 com lista vazia; o teste deve documentar o comportamento esperado.
   - **Health** (após Item 1 do plano 09): GET /health retorna 200 quando o banco está acessível.

4. **Fixture e seed**
   - Usar IClassFixture ou IAsyncLifetime para subir o container e a factory uma vez por classe. Inserir usuário(s) de teste (senha com hash BCrypt) e empresas no setup; limpar ou usar banco isolado por teste se necessário (transação rollback ou database por test).

5. **Documentar**
   - README: como rodar testes de integração (requer Docker se usar Testcontainers). Comando: `dotnet test --filter "FullyQualifiedName~Integration"` ou projeto específico.

### Arquivos a criar/alterar

- Novo: projeto `CompetencyMatrix.API.Tests` com csproj e classes de teste.
- [backend/src/CompetencyMatrix.API/Program.cs](backend/src/CompetencyMatrix.API/Program.cs): expor `Program` para WebApplicationFactory (arquivo com `public partial class Program { }`).
- Solução: incluir projeto de integração.
- README: comando e pré-requisitos (Docker).

### Critério de conclusão

- Testes de integração rodam com `dotnet test` (com Docker ativo para Testcontainers).
- Login, listagem filtrada por empresa e limite de pageSize são cobertos por pelo menos um teste cada.
- Testes não deixam recursos órfãos (container parado ao final).

---

## Item 3: Frontend – testes (opcional)

### Objetivo

Configurar um runner de testes no frontend (Vitest ou Jest) e adicionar testes para o interceptor de API (tratamento de 401 e 403) e, se desejado, para o hook useAuth ou authService.

### Estado atual

- [frontend/package.json](frontend/package.json): não há script `test` nem dependências de teste (Jest/Vitest, testing-library).
- [frontend/src/services/api.ts](frontend/src/services/api.ts): interceptor que trata 401 e (após plano 10) 403.

### O que fazer

1. **Configurar Vitest (recomendado com Vite)**
   - Instalar: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `happy-dom` (ou jsdom).
   - Adicionar script no package.json: `"test": "vitest"`, `"test:run": "vitest run"`.
   - Criar `vitest.config.ts` (ou config dentro de `vite.config.ts`) com environment jsdom e globals se necessário. Configurar path alias igual ao do Vite para imports como `@/` ou `../services/api`.

2. **Testes do interceptor (api.ts)**
   - Mock do axios: criar instância ou mockar `axios.create` e o interceptor. Simular resposta com status 401: verificar que localStorage.removeItem('token') é chamado e que window.location.href é setado para '/login' (pode mockar window.location). Simular 401 na URL de login: verificar que não redireciona (apenas rejeita). Após implementar plano 10: simular 403 e verificar que não remove token e que a promise é rejeitada com mensagem adequada.
   - Como o interceptor é registrado no carregamento do módulo, os testes podem importar o módulo e usar um cliente que chame uma URL mock (axios-mock-adapter ou msw) e então verificar efeitos colaterais (localStorage, location).

3. **Testes de useAuth (opcional)**
   - Renderizar um componente que use useAuth dentro de AuthProvider; verificar que login() persiste token e user no state (e localStorage) e que logout() limpa.

4. **Documentar**
   - README do frontend: comando `npm run test` e `npm run test:run`.

### Arquivos a criar/alterar

- `frontend/package.json` (devDependencies e scripts).
- `frontend/vitest.config.ts` ou ajuste em `vite.config.ts`.
- Novo: `frontend/src/services/api.test.ts` (ou `__tests__/api.test.ts`).
- Opcional: teste para `useAuth` e um componente mínimo que o use.
- README frontend.

### Critério de conclusão

- `npm run test:run` no frontend executa os testes e passam.
- Pelo menos o comportamento do interceptor (401 e 403) é coberto por testes.
- Não quebrar o build do Vite.

---

## Ordem sugerida de execução

1. **Item 1 (Testes unitários Application)** – base para confiança nas regras de negócio.
2. **Item 2 (Testes de integração API)** – validação ponta a ponta; pode depender de Planos 08 e 09 para pageSize e health.
3. **Item 3 (Frontend)** – opcional; pode ser feito após o plano 10 (403) para já testar o interceptor completo.

Ao pedir a um agente: “Execute o Item N do plano em Docs/11-testes.md”.

---

## Referência rápida

| Item | Projeto / pasta | Principais arquivos |
|------|------------------|----------------------|
| 1 | backend tests (Application.Tests) | *Tests.cs, .csproj |
| 2 | backend tests (API.Tests) | WebApplicationFactory, *IntegrationTests.cs |
| 3 | frontend | vitest.config, api.test.ts, package.json |
