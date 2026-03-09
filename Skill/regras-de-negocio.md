# Regras de Negócio — Matriz de Competências

> Documento gerado com base na implementação atual do sistema.
> Última atualização: 08/03/2026

---

## 1. Autenticação e Autorização

### 1.1 Login
- Login requer **email + senha**.
- Senha é verificada com **BCrypt**.
- Se usuário não encontrado ou senha incorreta → HTTP 401 com mensagem `"Credenciais inválidas."`.
- Token JWT gerado com claims: `sub` (userId), `email`, `role` (`"MANAGER"` ou `"EMPLOYEE"`), `jti` (identificador único).
- A role do JWT é determinada pelo campo `is_manager` do usuário: `true` → `MANAGER`, `false` → `EMPLOYEE`.
- JWT expira em **480 minutos** (8 horas) caso `Jwt:ExpiryMinutes` não esteja configurado.
- JWT é assinado com **HMAC-SHA256**.
- `Jwt:Secret` é obrigatório — a aplicação lança `InvalidOperationException` na inicialização se ausente.

### 1.2 Sessão no Frontend
- Dados de login (token + info do usuário) são persistidos no `localStorage` (`"token"` e `"user"`).
- Logout remove ambas as chaves do `localStorage`.
- Ao recarregar a página, o estado de autenticação é re-hidratado a partir do `localStorage`.
- Interceptor Axios adiciona automaticamente o header `Authorization: Bearer <token>` em todas as requisições.
- Se qualquer resposta da API retornar **HTTP 401**, o interceptor remove o token e redireciona para `/login`.

### 1.3 Permissões de API

| Endpoint | Método | Permissão |
|---|---|---|
| `POST /auth/login` | POST | **Anônimo** (sem autenticação) |
| `GET /users` | GET | `MANAGER` |
| `GET /users/{id}` | GET | Qualquer autenticado |
| `POST /users` | POST | `MANAGER` |
| `PUT /users/{id}` | PUT | `MANAGER` |
| `PUT /users/{id}/password` | PUT | `MANAGER` |
| `DELETE /users/{id}` | DELETE | `MANAGER` |
| `GET /skills` | GET | Qualquer autenticado |
| `GET /skills/{id}` | GET | Qualquer autenticado |
| `POST /skills` | POST | `MANAGER` |
| `PUT /skills/{id}` | PUT | `MANAGER` |
| `DELETE /skills/{id}` | DELETE | `MANAGER` |
| `POST /skills/expectations` | POST | `MANAGER` |
| `GET /skills/{skillId}/expectations` | GET | Qualquer autenticado |
| `DELETE /skills/{skillId}/expectations` | DELETE | `MANAGER` |
| `GET /skills/{skillId}/descriptions` | GET | Qualquer autenticado |
| `POST /skills/descriptions` | POST | `MANAGER` |
| `GET /assessments/{userId}` | GET | Qualquer autenticado |
| `POST /assessments` | POST | `MANAGER` |
| `GET /comparisons` | GET | `MANAGER` |
| `GET /cargos` | GET | Qualquer autenticado |
| `GET /niveis` | GET | Qualquer autenticado |
| `GET /skill-categories` | GET | Qualquer autenticado |

---

## 2. Navegação e Rotas

### 2.1 Guardas de Rota
- **PrivateRoute** — se não houver usuário autenticado, redireciona para `/login`. Caso autenticado, renderiza o layout com sidebar.
- **ManagerRoute** — se usuário não autenticado, redireciona para `/login`; se autenticado mas `isManager === false`, redireciona para `/` (dashboard). Somente gestores acessam.
- Rotas desconhecidas (`path='*'`) redirecionam para `/`.

### 2.2 Tabela de Rotas

| Caminho | Guarda | Quem acessa |
|---|---|---|
| `/login` | Nenhuma | Público |
| `/` (Dashboard) | PrivateRoute | Todos autenticados |
| `/users` | ManagerRoute | Somente gestores |
| `/users/new` | ManagerRoute | Somente gestores |
| `/users/:id/edit` | ManagerRoute | Somente gestores |
| `/skills` | ManagerRoute | Somente gestores |
| `/skills/new` | ManagerRoute | Somente gestores |
| `/skills/:id/edit` | ManagerRoute | Somente gestores |
| `/assessments` | PrivateRoute | Todos autenticados |
| `/comparison` | ManagerRoute | Somente gestores |

### 2.3 Menu Lateral (Sidebar)
- Itens marcados como `managerOnly: true` são **ocultados** de não-gestores.
- **Não-gestores** veem apenas: Dashboard e Avaliações.
- **Gestores** veem: Dashboard, Colaboradores, Competências, Avaliações e Comparação.
- Largura fixa do drawer: **220px**.
- AppBar exibe o nome do usuário e botão de logout.

---

## 3. Níveis de Competência

### 3.1 Definição dos Níveis
Quatro níveis de competência existem em ordem ordinal:

| Nível | Valor Ordinal |
|---|---|
| `DESCONHECE` | 0 (Não conhece) |
| `BRONZE` | 1 |
| `PRATA` | 2 |
| `OURO` | 3 |

### 3.2 Regras dos Níveis
- **Descrições** existem apenas para 3 níveis: `BRONZE`, `PRATA` e `OURO` (não há descrição para `DESCONHECE`).
- **Expectativas** podem ser qualquer um dos 4 níveis, incluindo `DESCONHECE`.
- **Avaliação atual** do colaborador pode ser qualquer um dos 4 níveis, incluindo `DESCONHECE`.

### 3.3 Cálculo do GAP
- `GAP = nível_esperado - nível_atual` (usando os valores ordinais).
- **GAP positivo** = colaborador está **abaixo** do nível esperado.
- **GAP zero** = colaborador **atende** ao nível esperado.
- **GAP negativo** = colaborador **supera** o nível esperado.

### 3.4 Cores do GAP na Interface
- `GAP ≤ 0` → **verde** (sucesso) — exibe "OK" quando o gap é exatamente 0.
- `GAP = 1` → **amarelo** (alerta).
- `GAP ≥ 2` → **vermelho** (erro/crítico).

---

## 4. Gestão de Usuários (Colaboradores)

### 4.1 Criação de Usuário
- Senha é **hashada com BCrypt** antes do armazenamento.
- ID do usuário é um **UUID gerado no servidor** (`Guid.NewGuid()`).
- `CreatedAt` é definido como `DateTime.UtcNow` na criação.
- `RoleId` e `GradeId` são **anuláveis** — um gestor pode não ter cargo/nível.
- No formulário de criação, quando a checkbox `Gestor` é marcada, os dropdowns de `Cargo` e `Nível` são **desabilitados** e seus valores são limpos para `null`.
- **Campos obrigatórios na criação**: Nome, E-mail, Senha. Quando **não** gestor: Cargo e Nível também são obrigatórios.
- **Validação de e-mail**: o campo E-mail deve conter um endereço válido (formato `usuario@dominio.ext`).
- Campos obrigatórios são sinalizados com asterisco (`*`) via prop `required` do MUI.
- Ao tentar salvar com campos obrigatórios vazios, os campos inválidos são destacados em vermelho com mensagem de erro.

### 4.2 Atualização de Usuário
- A atualização **NÃO** altera `email` nem `senha` — apenas `name`, `roleId`, `gradeId`, `isManager`.
- Se o usuário não for encontrado na atualização → lança `KeyNotFoundException`.
- O formulário de edição **não** exibe a checkbox `Gestor` (disponível apenas na criação). O formulário de edição exibe: nome, cargo, nível.
- Ao editar um **Gestor**, os campos Cargo e Graduação são **ocultados**, já que gestores não possuem esses valores.
- **Campos obrigatórios na edição**: Nome. Para não-gestores: Cargo e Nível também são obrigatórios.
- Ao tentar salvar com campos obrigatórios vazios, os campos inválidos são destacados em vermelho com mensagem de erro.

### 4.3 Redefinição de Senha
- Gestores podem redefinir a senha de qualquer colaborador pelo formulário de edição.
- Endpoint: `PUT /users/{id}/password` — restrito a `MANAGER`.
- A nova senha é hashada com **BCrypt** antes de salvar.
- Se o usuário não for encontrado → lança `KeyNotFoundException`.
- Após redefinir, uma notificação de sucesso é exibida (Snackbar).
- O campo de nova senha aparece somente para gestores logados.

### 4.4 Exclusão de Usuário
- Excluir um usuário **cascateia** a exclusão de todas as suas `skill_assessments` (ON DELETE CASCADE no banco).
- O frontend exibe um diálogo `confirm('Confirma exclusão?')` antes de excluir.

### 4.5 Listagem de Usuários
- Usuários podem ser filtrados por nome (busca por substring, case-insensitive, no lado do cliente).
- A listagem exibe: Nome, Email, Cargo, Graduação, Gestor (Sim/Não) e botões de ação (Editar/Excluir).
- Listagem é ordenada por nome (`ORDER BY u.name`).

---

## 5. Gestão de Competências (Skills)

### 5.1 Regras Gerais
- Competências são **globalmente únicas por nome** (não por cargo). Uma mesma competência pode estar vinculada a múltiplos cargos via `skill_expectations`.
- Cada competência possui uma `category` (texto livre, mas selecionada de categorias pré-definidas na UI).
- O campo `is_meta_2026` existe no banco mas **não é exposto** nos DTOs da API nem na interface.

### 5.2 CRUD de Competências
- Criar uma competência requer apenas `name` e `category`.
- Atualizar uma competência altera apenas `name` e `category`.
- Excluir uma competência **cascateia** a exclusão de todas as suas descrições, expectativas e avaliações.
- A listagem de competências pode ser filtrada opcionalmente por `roleId` via query param: `GET /skills?roleId=X` retorna apenas competências vinculadas àquele cargo via expectations.
- Sem filtro de `roleId`, as competências são retornadas ordenadas por `category, name`.

### 5.3 Expectativas por Cargo/Graduação
- Expectativas são inseridas/atualizadas via upsert: `ON CONFLICT (skill_id, role_id, grade_id) DO UPDATE`.
- Expectativas definem o **nível de competência esperado** para uma combinação de competência/cargo/graduação.
- No formulário de competência, cargos são selecionados via **multi-select** com checkboxes. Cada cargo selecionado gera um painel accordion.
- Cada accordion exibe dropdowns de nível para todas as graduações (TRAINEE, JUNIOR, PLENO, SENIOR), ordenadas por ordinal.
- Quando um cargo é **desmarcado**, todas as expectativas daquele cargo para esta competência são **excluídas**.
- Quando o nível de uma graduação é alterado para vazio (`''`), a expectativa para aquele cargo/graduação é **excluída**.
- Apenas valores alterados são enviados ao servidor (lógica de salvamento baseada em delta).

### 5.4 Descrições por Nível (por Cargo)
- Descrições são inseridas/atualizadas via upsert: `ON CONFLICT (skill_id, role_id, level) DO UPDATE`.
- Descrições são **por cargo** — cada cargo pode ter suas próprias descrições BRONZE/PRATA/OURO para a mesma competência.
- Os campos de descrição aparecem **dentro do accordion de cada cargo** no formulário de competência.
- Apenas descrições alteradas são enviadas ao servidor.

### 5.5 Validação do Formulário de Competência
- **Campos obrigatórios**: Nome e Categoria. Sinalizados com asterisco (`*`).
- **Ao menos 1 cargo** deve ser selecionado. Se nenhum for selecionado, o campo Cargos é destacado em vermelho com mensagem "Selecione ao menos 1 cargo".
- Para **cada cargo selecionado**, todos os campos são obrigatórios:
  - Todas as **4 graduações** (TRAINEE, JUNIOR, PLENO, SENIOR) devem ter um nível esperado definido.
  - Todas as **3 descrições** (BRONZE, PRATA, OURO) devem ser preenchidas.
- Ao tentar salvar com campos obrigatórios vazios, os campos inválidos são destacados em vermelho com mensagem "Campo obrigatório" ou "Obrigatório".
- O botão Salvar é desabilitado apenas durante o salvamento (não mais por campos vazios — a validação ocorre ao clicar).

### 5.6 Listagem de Competências
- Competências podem ser filtradas por nome (busca por substring, case-insensitive, no lado do cliente).
- Confirmação de exclusão: `confirm('Confirma exclusão?')`.

---

## 6. Avaliações

### 6.1 Modelo de Dados
- Cada avaliação é um par único `(user_id, skill_id)` — um nível por usuário por competência.
- Avaliações são inseridas/atualizadas via upsert: `ON CONFLICT (user_id, skill_id) DO UPDATE SET current_level, last_updated`.
- `last_updated` é definido como `DateTime.UtcNow` em cada upsert.

### 6.2 Carregamento de Avaliações
- Para obter avaliações de um usuário, o sistema requer que o usuário tenha `RoleId` **E** `GradeId` definidos. Se qualquer um for nulo, retorna **lista vazia** (sem competências para avaliar).
- O conjunto de competências exibido para um usuário é determinado pelo seu **cargo** — apenas competências que possuem expectativas para o cargo do usuário são exibidas.
- **Competências de outros cargos NÃO aparecem**, mesmo que a competência esteja na categoria "Geral". A filtragem é feita exclusivamente pela existência de expectativas (`skill_expectations`) para o cargo do usuário.
- Níveis esperados vêm de `skill_expectations` para o par exato `(roleId, gradeId)` do usuário. Se não houver expectativa para uma competência, o padrão é `"DESCONHECE"`.
- Se não houver avaliação para uma competência, o nível atual padrão é `"DESCONHECE"`.
- Usuário não encontrado → lança `KeyNotFoundException`.

### 6.3 Coluna "Cargo" na Tabela de Avaliações
- A coluna "Cargo" exibe o nome do cargo **do próprio usuário** para cada competência (não o nome de qualquer cargo vinculado à skill).
- Competências da categoria "Geral" que o usuário possui por ter expectativa vinculada ao seu cargo mostram o nome do cargo do usuário.
- Competências que não possuem expectativa explícita para o cargo do usuário não aparecem na lista.

### 6.4 Interface de Avaliações
- **Gestores** veem um dropdown para selecionar um colaborador. **Usuários gestores não aparecem na lista de seleção** — apenas colaboradores (não-gestores) são listados.
- **Não-gestores** são pré-selecionados para seu próprio usuário (não podem alterar).
- **Gestores** podem alterar o nível atual via dropdown em cada linha. **Não-gestores** veem um chip somente leitura.
- A tabela exibe: Competência, Categoria, Cargo, Esperado, Atual, GAP.
- A Categoria é resolvida no lado do cliente a partir da listagem de skills, não da resposta da API de avaliações.

---

## 7. Comparação entre Colaboradores

### 7.1 Lógica de Comparação
- A comparação suporta **2 ou 3 colaboradores**. O Colaborador C é opcional.
- A comparação exibe apenas **competências comuns** a todos os colaboradores selecionados — ou seja, competências que possuem expectativas (`skill_expectations`) para os cargos de todos.
- Níveis esperados usam as expectativas do cargo + graduação do Usuário A.
- Os níveis dos Usuários B e C são exibidos mas **avaliados contra as expectativas do Usuário A**.
- `GAP A = esperado - nível_usuário_A`, `GAP B = esperado - nível_usuário_B`, `GAP C = esperado - nível_usuário_C`.
- Se o Usuário A não tiver cargo definido, o conjunto de competências será vazio.
- Quando User C não é selecionado, os campos `userCLevel` e `gapC` retornam `null`.

### 7.2 Interface de Comparação
- **Usuários gestores não aparecem nos dropdowns de seleção** — apenas colaboradores (não-gestores) são listados.
- Colaboradores A e B devem ser selecionados antes que o botão "Comparar" seja habilitado.
- Colaborador C é **opcional** — um dropdown "Colaborador C (opcional)" permite selecionar um terceiro colaborador.
- A comparação é disparada manualmente ao clicar no botão.
- Ao alterar qualquer colaborador, a comparação anterior é limpa (requer novo clique em "Comparar").
- A Categoria é resolvida no lado do cliente a partir da listagem de skills.
- Colunas da tabela: Competência, Categoria, Esperado, [Nome A], GAP A, [Nome B], GAP B, e opcionalmente [Nome C], GAP C.
- Apenas gestores podem acessar a página de comparação.

---

## 8. Dados de Referência

### 8.1 Cargos Pré-definidos
| Cargo |
|---|
| `Desenvolvedor Backend` |
| `Desenvolvedor Frontend` |
| `Qualidade` |
| `DevOps` |

### 8.2 Graduações Pré-definidas (com ordinal)
| Graduação | Ordinal |
|---|---|
| `TRAINEE` | 0 |
| `JUNIOR` | 1 |
| `PLENO` | 2 |
| `SENIOR` | 3 |

### 8.3 Categorias Pré-definidas
| Categoria |
|---|
| `Desenvolvimento` |
| `Devops` |
| `Geral` |
| `Negócio` |
| `Testes` |

### 8.4 Ordenação de Graduações
- Graduações são ordenadas pelo campo `ordinal` na UI (formulário de competência).

---

## 9. Importação de Dados (DumpExcel)

### 9.1 Regras de Importação da Planilha
- Skills são globalmente únicas — o mesmo nome de skill em diferentes cargos é mesclado em um único registro com múltiplas expectations.
- Mapeamento de categorias: `"Dev"` → `"Desenvolvimento"`, `"Comportamentais"` → **excluída completamente**.
- Mapeamento de abreviações de nível: `D` → `DESCONHECE`, `B` → `BRONZE`, `P` → `PRATA`, `O` → `OURO`, `N` → ignorar (não aplicável).
- Linhas contendo "Quantidade" ou "Obrigatórias" no nome da competência são **ignoradas**.
- O campo `is_required` é definido como `true` quando o valor da coluna "preceito" é `"1"`.
- Descrições da aba "Descritivo por Conceito" são aplicadas a **todos os cargos** que possuem expectativas para aquela competência.

### 9.2 Importação de Usuários
- Senha padrão para todos os usuários importados: `"Mudar@123"` (hash BCrypt).
- Senha padrão do administrador: `"Admin@123"` (hash BCrypt).
- Usuário administrador tem `is_manager=TRUE`, `role_id=NULL`, `grade_id=NULL`.
- Email é gerado automaticamente: `primeiro_nome.ultimo_nome@empresa.com`, com acentos removidos e sufixos como "JUNIOR", "NETO", "FILHO", "SOBRINHO" ignorados para o sobrenome.
- Cargo/graduação são derivados do texto de "enquadramento" no cabeçalho da planilha usando correspondência de substrings.
- Usuários são inseridos com `WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ...)` para evitar duplicatas.
- Antes do seeding, todas as tabelas são **TRUNCADAS com RESTART IDENTITY CASCADE**.

---

## 10. Restrições do Banco de Dados

### 10.1 Restrições UNIQUE
| Tabela | Colunas UNIQUE |
|---|---|
| `skill_categories` | `name` |
| `roles` | `name` |
| `grades` | `name` |
| `users` | `email` |
| `skills` | `name` |
| `skill_descriptions` | `(skill_id, role_id, level)` |
| `skill_expectations` | `(skill_id, role_id, grade_id)` |
| `skill_assessments` | `(user_id, skill_id)` |

### 10.2 Restrições CHECK
| Tabela | Coluna | Valores Permitidos |
|---|---|---|
| `skill_descriptions` | `level` | `'BRONZE'`, `'PRATA'`, `'OURO'` |
| `skill_expectations` | `expected_level` | `'DESCONHECE'`, `'BRONZE'`, `'PRATA'`, `'OURO'` |
| `skill_assessments` | `current_level` | `'DESCONHECE'`, `'BRONZE'`, `'PRATA'`, `'OURO'` |

### 10.3 Chaves Estrangeiras com CASCADE
| Tabela | Coluna FK | Referência | On Delete |
|---|---|---|---|
| `skill_descriptions` | `skill_id` | `skills(id)` | CASCADE |
| `skill_expectations` | `skill_id` | `skills(id)` | CASCADE |
| `skill_assessments` | `user_id` | `users(id)` | CASCADE |
| `skill_assessments` | `skill_id` | `skills(id)` | CASCADE |

### 10.4 Campos Anuláveis Notáveis
- `users.role_id` — gestores podem não ter cargo.
- `users.grade_id` — gestores podem não ter graduação.
- `skill_descriptions.description` — pode ser nulo (campo TEXT sem NOT NULL).

### 10.5 Valores Default
| Tabela | Coluna | Default |
|---|---|---|
| `users.id` | `gen_random_uuid()` |
| `users.is_manager` | `FALSE` |
| `users.created_at` | `NOW()` |
| `skills.is_meta_2026` | `FALSE` |
| `skill_expectations.is_required` | `FALSE` |
| `skill_assessments.last_updated` | `NOW()` |
| `grades.ordinal` | `0` |

### 10.6 Índices
| Nome | Tabela | Coluna(s) |
|---|---|---|
| `idx_assessment_user` | `skill_assessments` | `user_id` |
| `idx_skill_category` | `skills` | `category` |
| `idx_expectation_role_grade` | `skill_expectations` | `(role_id, grade_id)` |
| `idx_users_email` | `users` | `email` |

---

## 11. Padrões de Upsert (Idempotência)

Todas as operações de escrita são idempotentes — chamadas repetidas com a mesma chave produzem o mesmo resultado:

| Tabela | Conflito em | Campos atualizados |
|---|---|---|
| `skill_descriptions` | `(skill_id, role_id, level)` | `description` |
| `skill_expectations` | `(skill_id, role_id, grade_id)` | `expected_level`, `is_required` |
| `skill_assessments` | `(user_id, skill_id)` | `current_level`, `last_updated` |

---

## 12. Cardinalidade dos Relacionamentos

| Relacionamento | Cardinalidade |
|---|---|
| Cargo → Usuários | 1:N |
| Graduação → Usuários | 1:N |
| Competência → Descrições | 1:N (uma descrição por cargo/nível) |
| Competência → Expectativas | 1:N (uma expectativa por cargo/graduação) |
| Competência → Avaliações | 1:N (uma avaliação por usuário) |
| Usuário → Avaliações | 1:N (uma avaliação por competência) |
| (Competência, Cargo, Nível) → Descrição | 1:1 (unique) |
| (Competência, Cargo, Graduação) → Expectativa | 1:1 (unique) |
| (Usuário, Competência) → Avaliação | 1:1 (unique) |

---

## 13. Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Login com credenciais inválidas | HTTP 401 — `"Credenciais inválidas."` |
| Skill não encontrada (GET por ID) | HTTP 404 |
| Usuário não encontrado (GET por ID) | HTTP 404 |
| Atualizar skill inexistente | `KeyNotFoundException` |
| Atualizar usuário inexistente | `KeyNotFoundException` |
| Buscar avaliações de usuário inexistente | `KeyNotFoundException` |
| Erro de login no frontend | Exibe alerta `"Credenciais inválidas."` |
| Entidade não encontrada no formulário de edição | Exibe `Alert severity='error'` |

---

## 14. Dashboard

- Exibe saudação: `"Bem-vindo, {user.name}"` com animação de aceno (wave).
- Acessível por todos os usuários autenticados (colaboradores e gestores).
- **Visão diferenciada**: gestores veem painel de gestão do time; colaboradores veem dashboard pessoal de boas-vindas e orientação.

### 14.1 Visão do Gestor — Cards KPI Básicos
- 4 cards: **Colaboradores**, **Competências**, **Gestores**, **Aderência Geral (%)**.
- Contagem de gestores = `users.filter(u => u.isManager).length`.
- Apenas visível quando `user.isManager === true`.

### 14.2 Resumo do Time (somente gestores)
- Visível apenas quando `user.isManager === true`.
- O sistema busca as avaliações de **todos os colaboradores** (não-gestores com cargo e nível definidos) via `useQueries` do React Query, com `staleTime: 5 min`.
- Enquanto as avaliações estão carregando, exibe `Skeleton` (placeholder visual).

### 14.3 KPIs do Time
| Indicador | Descrição | Cálculo |
|---|---|---|
| Aderência Geral | % de competências sem GAP no time | `(total sem GAP / total avaliações) × 100` |
| GAP Médio | Média de gaps positivos do time | `soma dos GAPs positivos / total avaliações` |
| Com GAP Crítico | Colaboradores com ao menos 1 GAP ≥ 2 | Contagem de colaboradores com `gap2plus > 0` |
| Avaliações | Total de pares (colaborador × competência) | Soma de todas avaliações |

### 14.4 Distribuição de GAP — Time
- Exibe contagem e percentual para 3 faixas: **Sem GAP (OK)** (GAP ≤ 0), **GAP = 1**, **GAP ≥ 2**.
- Cada faixa com ícone colorido (verde/amarelo/vermelho) e chip.

### 14.5 Aderência por Cargo
- Agrupa colaboradores por cargo e calcula a aderência (%) de cada grupo.
- Exibe barras de progresso (`LinearProgress`) ordenadas por aderência ascendente.
- Mostra quantidade de colaboradores por cargo.
- Cores dinâmicas: verde (≥ 80%), amarelo (50-79%), vermelho (< 50%).

### 14.6 Ranking de Colaboradores
- Tabela com todos os colaboradores ordenados por aderência **ascendente** (piores primeiro).
- Colunas: **#**, **Colaborador**, **Cargo**, **Aderência** (barra + %), **Status** (chip).
- Status: `Bom` (verde, ≥ 80%), `Alerta` (amarelo, 50-79%), `Crítico` (vermelho, < 50%).
- Altura máxima de 400px com scroll (sticky header).

### 14.7 Competências Mais Críticas
- Lista as **5 competências** com maior número de colaboradores com GAP ≥ 2.
- Colunas: **Competência**, **Categoria**, **Colab.** (contagem), **GAP Médio**.
- Ordenadas por contagem decrescente, depois por GAP total.

### 14.8 Tooltips (ícones de informação)
- Cada indicador e seção possui um ícone `InfoOutlinedIcon` que exibe tooltip ao passar o mouse.
- Tooltips explicam o significado do indicador e como ele é calculado.

### 14.9 Visão do Colaborador — Dashboard Pessoal

O colaborador (não-gestor) vê um dashboard personalizado focado em **boas-vindas e orientação de uso**, com um overview básico dos seus GAPs pessoais.

#### 14.9.1 Subtítulo de Boas-vindas
- Texto: _"Acompanhe seu desenvolvimento profissional e evolua suas competências."_

#### 14.9.2 KPI Cards Pessoais
Exibidos somente quando o colaborador já possui avaliações:
| Card | Descrição |
|---|---|
| **Avaliadas** | Total de competências avaliadas |
| **Aderência** | `(competências sem GAP / total) × 100` — com cor dinâmica |
| **Sem GAP** | Quantidade de competências com nível atual ≥ esperado |
| **Com GAP** | Quantidade de competências com GAP > 0 |

#### 14.9.3 Principais GAPs
- Lista os **5 maiores GAPs** do colaborador, ordenados por valor decrescente.
- Cada item exibe: chip com valor do GAP, nome da competência, nível esperado vs. atual, badge de severidade (Crítico para GAP ≥ 2, Atenção para GAP = 1).
- Orienta o colaborador a acessar a aba **Resumo** em Avaliações para detalhes completos.

#### 14.9.4 Fallback — Sem Avaliações
- Se o colaborador não possui avaliações, exibe mensagem: _"Seu gestor ainda não realizou sua avaliação de competências."_
- Ícone de lâmpada (`EmojiObjectsOutlinedIcon`) como ilustração.

#### 14.9.5 Cards de Orientação (Explore o Skillhub)
Dois cards clicáveis que navegam para as principais funcionalidades:
| Card | Destino | Descrição |
|---|---|---|
| **Avaliações** | `/assessments` | Competências avaliadas, níveis e resumo completo |
| **Comparação** | `/comparison` | Comparar perfil com outros colaboradores |
- Cada card possui ícone com gradiente, texto explicativo e botão "Acessar..." com seta.

---

## 15. Infraestrutura

- **CORS**: Permite origens `http://localhost:5173` e `http://localhost:3000`, com qualquer método e header.
- **Connection string** `"Default"` é obrigatória — aplicação falha na inicialização se ausente.
- **ORM**: Acesso ao banco usa **Dapper** (micro-ORM) com SQL puro.
- **Injeção de dependência**: Repositórios e serviços registrados como **Scoped** (por requisição), exceto `JwtService` (Singleton) e `DapperContext` (Singleton).
- **Banco**: PostgreSQL 16 via Docker (container: `competency-postgres`, porta: 5433, banco: `competency_matrix`).
- **Backend**: .NET 8 na porta 5058.
- **Frontend**: React + TypeScript + Vite na porta 5173, Material-UI (MUI), React Query (@tanstack/react-query).
- **Encoding**: Seed SQL deve ser aplicado usando `docker cp` + `docker exec psql -f` (não via pipe do PowerShell, que corrompe UTF-8).
