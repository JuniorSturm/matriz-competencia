# Revisão de GetAll e política de paginação

## Regra

**Nenhum GetAll deve ser usado sem filtro ou paginação** quando o volume de dados pode ser grande. Listagens e buscas devem ser paginadas e, quando aplicável, filtradas por contexto (empresa, perfil).

## Alterações já realizadas

### Backend

- **Users**
  - `GET /users/paged`: paginação com filtros `name`, `companyId`, `availableForCompanyId`, `onlyManagers`, `onlyCollaborators`. Quando `availableForCompanyId` é informado, a API retorna apenas usuários **sem empresa** (disponíveis para vincular), para que total e itens por página batam com o grid do flyout.
  - `GET /users/company/{companyId}`: lista usuários da empresa (filtro por empresa); usado em formulários que precisam só daquela empresa.
- **Companies**
  - Listagem em grid usa `GET /companies/paged` (não `GET /companies`).
  - Para filtro por empresa: `GET /companies/options?page=1&pageSize=50&name=...` é **paginado** e aceita busca por nome. Todas as telas com filtro por empresa (Cargos, Colaboradores, Times, Competências) usam o **CompanyPickerDrawer**: um flyout à direita com grid paginado; a grid principal carrega só seus próprios dados (nome da empresa vem na resposta da API quando aplicável).
- **Teams**
  - `GetAllAsync` no backend já restringe por usuário (empresa do manager ou times do coordinator).
  - `GET /teams/company/{companyId}` retorna apenas times da empresa.

### Frontend

- **CompanyFormPage (editar empresa)**
  - Removido `useQuery(['users'], userService.getAll)`.
  - Flyout de gestores/colaboradores usa `usePagedUsers` com `availableForCompanyId` e `onlyManagers`, e só quando o flyout está aberto (`enabled: flyoutOpen`).
  - Lista de gestores/colaboradores montada a partir de `existingCompany?.users` + `addedUserMap` (usuários adicionados no flyout).
- **TeamFormPage**
  - Removido carregamento de todos os usuários (`userService.getAll()`).
  - Usa `userService.getByCompany(resolvedCompanyId)` com `enabled: resolvedCompanyId > 0`, carregando apenas usuários da empresa do time (novo ou em edição).
- **UserPickerDrawer**
  - Usa `usePagedUsers` com `enabled: open` para não buscar com o drawer fechado.

## Inventário de endpoints e usos

### Backend (Controllers)

| Endpoint | Comportamento | Observação |
|----------|----------------|------------|
| `GET /users` | Filtrado por perfil: Admin = todos; Manager = empresa; Coordinator = regra específica | Evitar uso em contexto admin para listagens grandes; preferir `GET /users/paged` ou `GET /users/company/{id}`. |
| `GET /users/company/{companyId}` | Filtrado por empresa | Uso adequado para dropdowns/lista por empresa. |
| `GET /users/paged` | Sempre paginado e com filtros | Preferir para grids e buscas. |
| `GET /companies` | Todos (admin) | Usado em dropdowns; considerar paginação se o número de empresas crescer. |
| `GET /companies/paged` | Paginado | Usar para listagem em grid. |
| `GET /teams` | Filtrado por usuário (empresa/times) | Não retorna todos os times do sistema. |
| `GET /teams/company/{companyId}` | Filtrado por empresa | Adequado para listas por empresa. |
| `GET /skills` | Query params `roleId`, `companyId`; sem company = todos | Com `companyId` é filtrado. |
| `GET /roles` | Query param `companyId` opcional | Filtrado quando informado. |
| RoleGradeController (grades/categories) | Listas de catálogo | Volume tipicamente pequeno. |

### Frontend (queries / serviços)

| Onde | O que | Observação |
|------|--------|------------|
| **DashboardPage** | `useUsers(!isAdmin)` | Só dispara quando não é admin; backend já retorna só usuários da empresa para manager. |
| **DashboardPage** | `teamService.getAll()` | Apenas para coordinator; backend filtra por times do usuário. |
| **TeamFormPage** | `userService.getByCompany(resolvedCompanyId)` | Filtrado por empresa; habilitado só com `resolvedCompanyId > 0`. |
| **Formulários (Cargo, Colaborador, Competência, Time)** | `CompanyPickerDrawer` | Seleção de empresa no cadastro/edição: botão abre flyout paginado (GET /companies/options); não usam mais GET /companies nem combo. |
| **RolesPage, UsersPage, TeamsPage, SkillsPage** | `CompanyPickerDrawer` | Filtro Empresa: botão abre flyout à direita com grid paginado (GET /companies/options); grid da tela carrega só seus dados (roles, users, teams, skills); nome da empresa vem da API (ex.: `companyName` em times/cargos). |
| **CompanyFormPage** | Não usa mais `getAll` de users | Flyout usa `usePagedUsers` com filtros e paginação. |
| **useCompanies** | `companyService.getAll` | Usado em vários formulários para dropdown; aceitável enquanto lista for pequena. |
| **useSkills** | `skillService.getAll(roleId, companyId)` | Com `companyId` é filtrado por empresa. |

## Recomendações futuras

1. **Companies**: Se o número de empresas crescer, criar `GET /companies/paged` (ou equivalente) e usar em listagens; manter `getAll` apenas para dropdowns com limite razoável ou trocar por busca paginada.
2. **TeamFormPage – flyout de membros**: Hoje usa `getByCompany` (lista em memória) e pagina no cliente. Opcionalmente migrar para busca paginada no servidor (`usePagedUsers` com `companyId` e busca por nome), no mesmo padrão do CompanyFormPage.
3. **Dashboard (manager)**: Continua usando `useUsers(!isAdmin)`; o backend já restringe à empresa. Se no futuro houver necessidade de só totais (ex.: total de gestores), considerar endpoint de estatísticas (ex.: `GET /users/stats?companyId=`) para evitar trazer a lista inteira.

## Resumo

- **CompanyFormPage** e **TeamFormPage** não fazem mais GetAll de usuários sem filtro; CompanyFormPage usa usuários paginados e filtrados por empresa no flyout; TeamFormPage usa apenas usuários da empresa via `getByCompany`.
- Backend já aplica filtros por empresa/perfil em `GET /users` e `GET /teams` quando o usuário não é admin.
- Novas listagens e buscas devem usar endpoints paginados e, quando fizer sentido, filtros por empresa ou contexto.
