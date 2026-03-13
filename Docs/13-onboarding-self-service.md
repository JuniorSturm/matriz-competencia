# Plano: Onboarding e self-service (signup e convites)

Documentação do sétimo item da lista de melhorias para SaaS. Objetivo: permitir que novas empresas se cadastrem sem intervenção de um Admin (signup) e que gestores convidem colaboradores por e-mail (convite com link para definir senha ou ativar conta).

---

## Contexto

Hoje:

- **Criação de empresa** é restrita a **Admin**: [CompanyController](backend/src/CompetencyMatrix.API/Controllers/CompanyController.cs) tem `[Authorize(Roles = "ADMIN")]` e o frontend expõe empresas apenas para Admin. Não existe fluxo público de “criar minha empresa”.
- **Criação de usuários** é feita por Manager/Admin em [UserController](backend/src/CompetencyMatrix.API/Controllers/UserController.cs); o gestor informa nome, e-mail, senha (ou senha padrão). Não há “convite por e-mail”: um link enviado ao colaborador para ele definir a própria senha e ativar a conta na empresa.

Para SaaS, o onboarding típico é: (1) signup da empresa (dados da empresa + primeiro usuário administrador da empresa) e (2) convite de colaboradores por e-mail com link de ativação.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Signup público (empresa + primeiro usuário) | Endpoint público (sem auth) que crie uma empresa e o primeiro usuário (gestor/admin da empresa) em uma única operação; fluxo de “criar conta” no frontend. |
| 2 | Convite por e-mail (link de ativação) | Gestor/Admin envia convite para um e-mail; sistema gera token de uso único e envia link; colaborador acessa o link, define senha e passa a pertencer à empresa (e opcionalmente a um time). |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Signup público (empresa + primeiro usuário)

### Objetivo

Permitir que um usuário não autenticado crie uma “conta” no sistema: isso corresponde a criar uma **empresa** e o **primeiro usuário** (que será gestor ou admin dessa empresa), em uma única transação. O endpoint deve ser público (sem `[Authorize]`) e protegido contra abuso (rate limit, validação e, no futuro, captcha se necessário).

### Estado atual

- **CompanyController.Create** ([CompanyController.cs](backend/src/CompetencyMatrix.API/Controllers/CompanyController.cs)): recebe `CreateCompanyRequest` com Name, Document, Email, Phone, UserIds. Os usuários em UserIds já devem existir e não ter empresa. Ou seja, hoje é preciso criar usuários antes (via UserController, por um Admin) e depois associá-los à empresa.
- **UserController.Create** ([UserController.cs](backend/src/CompetencyMatrix.API/Controllers/UserController.cs)): cria usuário com nome, e-mail, senha, role, grade, CompanyId, etc.; exige role MANAGER/ADMIN/COORDINATOR.

### O que fazer

1. **Backend – DTO e serviço**
   - Criar DTO, por exemplo: `SignupRequest` com dados da empresa (Name, Document, Email, Phone) e dados do primeiro usuário (Name, Email, Password). Validação: e-mail único (nenhum usuário existente com esse e-mail); nome da empresa obrigatório; senha forte (mesmas regras do CreateUser, se houver).
   - Criar método no `CompanyService` (ou em um `SignupService` dedicado) que: (1) verifique se já existe usuário com o e-mail; (2) crie a empresa; (3) crie o usuário vinculado à empresa com IsManager = true (e opcionalmente IsAdmin = false para não ser admin global); (4) associe o usuário à empresa (AddUserToCompanyAsync). Tudo em transação: se qualquer passo falhar, rollback.
   - Interface: `ISignupService` com `Task<SignupResult> SignupAsync(SignupRequest request)`. Result pode ser o id da empresa e do usuário, ou um token de login (para já logar o usuário após signup). Implementação em `SignupService` usando ICompanyRepository, IUserRepository, e lógica de hash de senha (BCrypt) igual ao UserService.

2. **Backend – Controller**
   - Novo controller ou ação em controller existente, por exemplo: `POST /auth/signup` (ou `POST /public/signup`). Rota **sem** `[Authorize]`. Chama o SignupService. Retorna 201 com dados mínimos (empresa id, usuário id) ou 200 com token de login (LoginResponse) para o frontend já redirecionar para o dashboard. Em caso de e-mail duplicado: 409 Conflict ou 400 com mensagem clara. Validação de entrada (model state) e tratamento de exceções.

3. **Frontend**
   - Nova página/rota pública: “Criar conta” ou “Cadastre sua empresa” (ex.: `/signup`). Formulário: dados da empresa (nome, documento, e-mail, telefone) e dados do primeiro usuário (nome, e-mail, senha, confirmação de senha). Ao submeter, chamar `POST /auth/signup`. Em sucesso: se a API retornar token, fazer login automático e redirecionar para `/`; senão redirecionar para `/login` com mensagem “Conta criada. Faça login.”.
   - Link para “Já tem conta? Entrar” na tela de login.

4. **Segurança e limites**
   - Manter rate limiting (plano 09) aplicado; o endpoint de signup pode ter cota mais baixa (ex.: 5 req/hora por IP) para evitar criação em massa de contas. Documentar.
   - Não expor no signup a opção de criar usuário como “Admin global”; o primeiro usuário é sempre gestor da própria empresa.

5. **Documentar**
   - README ou Docs: “Signup: POST /auth/signup (público). Cria empresa e primeiro usuário (gestor). Requer rate limit.”

### Arquivos a criar/alterar

- Backend: novo DTO (SignupRequest, SignupResult); interface ISignupService; SignupService; AuthController (nova ação) ou PublicController; Program.cs (registro do serviço).
- Frontend: rota `/signup` (pública); página SignupPage com formulário; serviço (authService ou signupService) chamando a API; link na LoginPage para “Criar conta”.
- README ou Docs.

### Critério de conclusão

- Usuário não logado acessa `/signup`, preenche dados da empresa e do primeiro usuário, submete e a empresa e o usuário são criados; em seguida faz login (ou é redirecionado para login).
- Tentativa de signup com e-mail já existente retorna erro claro (409 ou 400) e não cria empresa.
- Apenas o primeiro usuário da empresa é criado no signup; não é possível criar Admin global por esse endpoint.

---

## Item 2: Convite por e-mail (link de ativação)

### Objetivo

Permitir que um gestor (ou Admin) “convide” um colaborador informando o e-mail. O sistema gera um token de uso único (ou de validade limitada), persiste o convite e envia um e-mail com link. O colaborador acessa o link, define a senha e passa a ser usuário da empresa (e opcionalmente de um time). O token não pode ser reutilizado.

### Estado atual

- Não existe tabela de convites nem endpoint de envio de convite ou de “ativação por link”.
- Usuários são criados pelo UserController com senha definida pelo gestor; não há fluxo “usuário recebe e-mail e define própria senha”.

### O que fazer (visão geral para o agente)

1. **Modelo de dados**
   - Nova tabela, por exemplo: `invites` (ou `user_invites`) com: id (UUID ou serial), email, company_id, invited_by_user_id, token_hash (ou token aleatório longo), expires_at, used_at (null até uso), created_at. Índice por token (para lookup rápido) e por email+company_id (evitar convites duplicados ativos).
   - Migration em [database/migrations](database/migrations) (novo arquivo numerado).

2. **Backend – envio de convite**
   - DTO: `InviteRequest` (Email, CompanyId, opcional RoleId, GradeId, TeamIds). Quem chama: usuário autenticado com role MANAGER/ADMIN; se Manager, CompanyId deve ser o da sua empresa.
   - Serviço: verificar se já existe usuário com esse e-mail na empresa; se existir, retornar erro. Verificar se já existe convite pendente (não usado, não expirado) para esse e-mail na empresa; se existir, opcionalmente reenviar (gerar novo token e atualizar expires_at) ou retornar erro. Gerar token aleatório (ex.: 32 bytes), armazenar hash do token na tabela, definir expires_at (ex.: 7 dias). Chamar serviço de e-mail (interface IEmailSender) com link: `{FrontendBaseUrl}/invite/accept?token={token_raw}`. O token_raw é o que vai no link; no banco fica só o hash.
   - Endpoint: `POST /companies/{companyId}/invites` ou `POST /invites` com body InviteRequest. Retorna 201 com mensagem “Convite enviado” (não retornar o token no body).
   - E-mail: definir interface `IEmailSender` (SendInviteEmailAsync(to, inviteLink, companyName, expiresAt)). Implementação pode ser SMTP (SendGrid, SMTP local) ou fila; em dev pode apenas logar o link no console. Configuração (SMTP, etc.) em appsettings e variáveis de ambiente.

3. **Backend – aceitação do convite**
   - Endpoint público: `GET /invites/accept?token=...` (para obter dados do convite e validar) e `POST /invites/accept` com body `{ "Token": "...", "Password": "...", "Name": "..." }`. Validar token (hash, não expirado, used_at null). Criar usuário com e-mail do convite, nome e senha informados, CompanyId da empresa do convite, RoleId/GradeId se tiver; associar à empresa (AddUserToCompanyAsync); opcionalmente adicionar a times (TeamIds). Marcar convite como usado (used_at = now). Retornar 200 e opcionalmente LoginResponse para já logar o usuário; senão 200 com mensagem e redirecionar para login.
   - Token no link: uso único; após aceitar, novo GET com o mesmo token retorna 404 ou “convite já utilizado”.

4. **Frontend**
   - **Envio:** na tela de usuários (ou em “Convidar”), formulário: e-mail, opcionalmente cargo e time. Chamar POST /invites. Mensagem de sucesso: “Convite enviado para {email}”.
   - **Aceitação:** rota pública `/invite/accept?token=...`. Página que chama GET /invites/accept?token=... para validar e obter nome da empresa (e opcionalmente nome do convidante). Formulário: nome (se não veio no convite), senha, confirmação. POST /invites/accept. Sucesso: login automático e redirecionar para `/` ou exibir “Conta ativada. Faça login.” com link para login.

5. **Segurança**
   - Token longo e aleatório; apenas hash no banco. HTTPS obrigatório em produção para o link. Rate limit no endpoint de aceitação (por IP e por token).
   - Não permitir aceitar convite com e-mail diferente do convite (o usuário é criado com o e-mail do convite).

6. **Documentar**
   - README: variáveis de e-mail (SMTP, SendGrid key, etc.); fluxo de convite (gestor envia, colaborador recebe link, define senha, ativa). Docs: modelo de dados da tabela invites.

### Arquivos a criar/alterar

- Backend: migration (invites); entidade Invite (se usar Domain); repositório e interface; InviteService (ou dentro de UserService/CompanyService); InviteController ou ações em CompanyController; IEmailSender e implementação; registro em Program.cs; appsettings (SMTP/email).
- Frontend: página de convite (enviar); página pública de aceitação; serviço API para invites.
- README e Docs.

### Critério de conclusão

- Gestor envia convite para um e-mail; o sistema persiste o convite e “envia” o e-mail (em dev pode ser log do link).
- Colaborador acessa o link com token, preenche nome e senha, submete; usuário é criado na empresa e o convite é marcado como usado.
- Reutilizar o mesmo token retorna erro (convite já utilizado ou inválido).
- Convite expirado (após expires_at) não pode ser aceito.

---

## Ordem sugerida de execução

1. **Item 1 (Signup)** – habilita aquisição de novos clientes sem Admin.
2. **Item 2 (Convites)** – melhora a experiência de adicionar colaboradores e reduz senhas definidas pelo gestor.

Ao pedir a um agente: “Execute o Item 1 do plano em Docs/13-onboarding-self-service.md” ou “Execute o Item 2 do plano em Docs/13-onboarding-self-service.md”.

---

## Referência rápida

| Item | Backend | Frontend |
|------|---------|----------|
| 1 | SignupRequest, SignupService, POST /auth/signup | SignupPage, rota /signup, link no login |
| 2 | Tabela invites, InviteService, IEmailSender, POST /invites, POST /invites/accept | Página enviar convite, página pública /invite/accept |
