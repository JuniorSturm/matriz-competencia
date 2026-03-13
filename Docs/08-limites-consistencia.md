# Plano: Limites e Consistência (paginação e isolamento por empresa)

Documentação do segundo item da lista de melhorias para SaaS. Objetivo: limitar o tamanho da paginação para evitar abuso da API e revisar todos os pontos que usam `companyId: null` para garantir que apenas Admin tenha visão global (evitar vazamento de dados entre empresas).

---

## Contexto

Hoje:

- **pageSize** é aceito sem teto máximo nos endpoints paginados (Users, Skills, Roles, Audit). Um cliente pode enviar `pageSize=100000` e sobrecarregar a API e o banco.
- **companyId: null** aparece em vários lugares: Dashboard (admin-stats), SkillController (GetAll quando Admin sem companyId), SkillService (audit em operações de expectativa/descrição). O Dashboard já está protegido por `[Authorize(Roles = "ADMIN")]`; é preciso garantir que nenhum endpoint não-admin use `companyId: null` de forma que retorne dados de outras empresas.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Teto de pageSize | Definir um máximo (ex.: 100) e aplicar em todos os endpoints paginados. |
| 2 | Revisão companyId null | Listar e validar todos os usos; garantir que apenas Admin use visão global onde aplicável. |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Teto máximo de pageSize

### Objetivo

Nenhum endpoint paginado deve aceitar `pageSize` maior que um limite configurável (ex.: 100). Valores acima do teto devem ser limitados ao teto (ou retornar BadRequest); o padrão pode permanecer 50.

### Estado atual

Endpoints paginados e onde validar/limitar:

| Arquivo | Método / ação | Parâmetro pageSize |
|---------|----------------|---------------------|
| [backend/src/CompetencyMatrix.API/Controllers/UserController.cs](backend/src/CompetencyMatrix.API/Controllers/UserController.cs) | GetPaged | `[FromQuery] int pageSize = 50` |
| [backend/src/CompetencyMatrix.API/Controllers/SkillController.cs](backend/src/CompetencyMatrix.API/Controllers/SkillController.cs) | GetPaged | `[FromQuery] int pageSize = 50` |
| [backend/src/CompetencyMatrix.API/Controllers/RoleController.cs](backend/src/CompetencyMatrix.API/Controllers/RoleController.cs) | GetPaged | `[FromQuery] int pageSize = 50` |
| [backend/src/CompetencyMatrix.API/Controllers/AuditController.cs](backend/src/CompetencyMatrix.API/Controllers/AuditController.cs) | GetLogs | `[FromQuery] int pageSize = 50` |

Nos serviços, alguns já fazem `if (pageSize <= 0) pageSize = 50` (UserService, RoleService), mas não há cap superior.

### O que fazer

1. **Definir constante ou configuração do teto**
   - Opção A: constante no código, ex. `private const int MaxPageSize = 100;` em cada controller (ou em um lugar compartilhado e reutilizar).
   - Opção B: chave em `appsettings.json` (ex.: `"Pagination": { "MaxPageSize": 100 }`) e ler em cada controller; fallback 100 se não configurado.
   - Recomendação: começar com constante compartilhada (ex. em uma classe estática ou no Program) para não espalhar magic number; depois que estiver estável, opcionalmente mover para configuração.

2. **Aplicar o teto em cada endpoint paginado**
   - Após validar `page <= 0 || pageSize <= 0` (retornar BadRequest), fazer: `pageSize = Math.Min(pageSize, MaxPageSize)` (ou equivalente com a config).
   - Garantir que o valor limitado seja o que é passado para o service/repository (não só validar, mas efetivamente usar o valor limitado).

3. **Documentar**
   - No README ou em Docs: informar que a API aplica um limite máximo de itens por página (ex.: 100) em listagens paginadas.

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/Controllers/UserController.cs`
- `backend/src/CompetencyMatrix.API/Controllers/SkillController.cs`
- `backend/src/CompetencyMatrix.API/Controllers/RoleController.cs`
- `backend/src/CompetencyMatrix.API/Controllers/AuditController.cs`
- Opcional: classe/arquivo compartilhado com `MaxPageSize` se não quiser repetir em cada controller.
- `README.md` ou `Docs/` (documentar limite de paginação)

### Critério de conclusão

- Requisição com `pageSize=200` resulta em no máximo 100 itens retornados (e totalCount correto para a query).
- Requisição com `pageSize=50` continua igual ao comportamento atual.
- Nenhum endpoint paginado aceita pageSize ilimitado.

---

## Item 2: Revisão de usos de companyId null

### Objetivo

Garantir que **apenas** usuários Admin possam obter dados sem filtro de empresa (companyId null). Identificar e corrigir qualquer fluxo em que um gestor ou colaborador possa receber dados de outra empresa.

### Estado atual (referências)

- **DashboardController** – `[Authorize(Roles = "ADMIN")]` em `GetAdminStats`; usa `_skills.GetPagedAsync(page: 1, pageSize: 1, companyId: null)`. **OK**: só Admin acessa.
- **SkillController.GetAll** – Se role é ADMIN, pode chamar `GetAllAsync()` (sem empresa) ou `GetAllByCompanyAsync(companyId)`; se não é Admin, usa `currentUser.CompanyId` ou `GetAllAsync()`. **Atenção**: quando não é Admin e `currentUser?.CompanyId` é null, hoje chama `GetAllAsync()` e retorna todas as skills. **Corrigir**: nesse caso não deve retornar todas; retornar lista vazia ou 403 se usuário não-admin sem empresa.
- **SkillController.GetPaged** – Admin pode passar qualquer `companyId` ou null; não-Admin tem `finalCompanyId` forçado para `currentUser.CompanyId`. **OK**.
- **SkillService** (audit) – `SafeAuditAsync(..., companyId: null)` em UpsertExpectation, DeleteExpectation, UpsertDescription. São operações em entidades que podem não ter companyId direto (expectation/description são por skill); o audit log aceita companyId opcional. **Avaliar**: se possível, passar o companyId da skill nas chamadas de audit para rastreabilidade; senão, manter null apenas para audit e documentar que é intencional.
- **RoleController / RoleService** – GetAllAsync/GetPagedAsync recebem `companyId`; RoleService.ResolveScopeCompanyIdAsync faz Admin poder ver todos, não-Admin ficar restrito à empresa. **OK**.
- **UserService.GetAllAsync** – Para não-admin com CompanyId, filtra por empresa; para admin ou sem CompanyId, retorna todos. **Atenção**: usuário não-admin com `CompanyId == null` hoje recebe todos os usuários. **Corrigir**: não-admin sem CompanyId deve retornar lista vazia (ou 403).
- **AuditController** – Filtra por `companyFilter` quando não é Admin. **OK**.
- **ApiAuditService** – Parâmetro opcional `companyId = null`; quem chama é que passa o valor. **OK**.

Resumo do que alterar:

1. **SkillController.GetAll**: quando o usuário não é Admin e `currentUser?.CompanyId` é null, não chamar `GetAllAsync()`; retornar `Ok(new List<SkillResponse>())` ou resposta vazia equivalente.
2. **UserService.GetAllAsync** (e o fluxo que o chama): quando o usuário não é Admin e tem `CompanyId == null`, retornar lista vazia em vez de todos os usuários.

### O que fazer

1. **SkillController.GetAll**
   - Após obter `currentUser`, se `role != "ADMIN"` e `currentUser?.CompanyId == null`, retornar `Ok(Array.Empty<SkillResponse>())` (ou tipo correto) em vez de `GetAllAsync()`.
   - Manter o restante da lógica (Admin com companyId, Admin sem companyId, não-Admin com companyId) como está.

2. **UserService.GetAllAsync**
   - No início do método, se `currentUser` não é null, não é Admin (e não é Manager/Coordinator se a regra for só esses verem lista), já existe lógica que filtra por empresa. Garantir que quando `currentUser.CompanyId` é null e o usuário não é Admin, o resultado seja lista vazia (e não todos os usuários). Verificar a implementação atual em [backend/src/CompetencyMatrix.Application/Services/UserService.cs](backend/src/CompetencyMatrix.Application/Services/UserService.cs) (GetAllAsync e GetPagedAsync) e ajustar.

3. **SkillService – audit com companyId (opcional)**
   - Para UpsertExpectation, DeleteExpectation, UpsertDescription: se houver como obter o `companyId` da skill (ex.: carregar a skill e usar `skill.CompanyId`), passar esse valor em `SafeAuditAsync(..., companyId: skill.CompanyId)`. Se a skill não tiver companyId (valor nullable), manter null e documentar. Esse item pode ser marcado como “melhoria de rastreabilidade” e executado em segundo plano.

4. **Documentar**
   - Em Docs ou no código: “Endpoints que listam dados multi-tenant: apenas Admin pode usar escopo global (companyId null). Usuário não-admin sem empresa associada recebe lista vazia.”

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/Controllers/SkillController.cs` (GetAll)
- `backend/src/CompetencyMatrix.Application/Services/UserService.cs` (GetAllAsync e, se necessário, GetPagedAsync)
- Opcional: `backend/src/CompetencyMatrix.Application/Services/SkillService.cs` (audit com companyId)
- `Docs/` ou comentário no código (regra de isolamento)

### Critério de conclusão

- Usuário gestor/colaborador **sem** CompanyId não recebe lista de todas as skills nem de todos os usuários; recebe lista vazia (ou 403, conforme decisão).
- Admin continua podendo ver dados de todas as empresas onde o desenho atual permite.
- Nenhum endpoint não-admin retorna dados de outra empresa por uso indevido de companyId null.

### Implementação atual (resumo)

- Endpoints paginados (`/users/paged`, `/skills/paged`, `/roles/paged`, `/audit/logs`) aplicam:
  - `pageSize` padrão: 50 (`PaginationDefaults.DefaultPageSize`);
  - `pageSize` máximo: 100 (`PaginationDefaults.MaxPageSize`), via `Math.Min(pageSize, MaxPageSize)`.
- `SkillController.GetAll`:
  - Admin:
    - Com `companyId` no query string → lista apenas daquela empresa;
    - Sem `companyId` → lista global de skills.
  - Não-admin:
    - Com usuário atual vinculado a uma empresa → lista apenas as skills da empresa;
    - Sem `CompanyId` no usuário atual → retorna lista vazia.
- `UserService.GetAllAsync`:
  - Admin → lista global de usuários;
  - Manager/Coordinator → já restritos conforme regra existente por empresa/time;
  - Não-admin sem `CompanyId` → retorna lista vazia em vez de todos os usuários.

---

## Ordem sugerida de execução

1. **Item 1 (teto pageSize)** – rápido e reduz carga.
2. **Item 2 (companyId null)** – corrige isolamento; pode ser feito em seguida.

Ao pedir a um agente: “Execute o Item 1 do plano em Docs/08-limites-consistencia.md” ou “Execute o Item 2 do plano em Docs/08-limites-consistencia.md”.

---

## Referência rápida de arquivos

| Arquivo | Itens |
|---------|--------|
| UserController.cs | 1 |
| SkillController.cs | 1, 2 |
| RoleController.cs | 1 |
| AuditController.cs | 1 |
| UserService.cs | 2 |
| SkillService.cs | 2 (opcional) |
| README ou Docs | 1, 2 |
