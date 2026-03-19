# Plano: Onboarding e self-service (signup e convites)

Documentação do sétimo item da lista de melhorias para SaaS. Objetivo: permitir que novas empresas se cadastrem sem intervenção de um Admin (signup) e que gestores convidem colaboradores por e-mail (convite com link para definir senha ou ativar conta), **com auditoria completa dos eventos principais** (signup, criação de empresa/usuário, envio de convite, aceite de convite e falhas relevantes).

---

## Contexto

Hoje:

- **Criação de empresa** é restrita a **Admin**: `CompanyController` tem `[Authorize(Roles = "ADMIN")]` e o frontend expõe empresas apenas para Admin. Não existe fluxo público de “criar minha empresa”.
- **Criação de usuários** é feita por Manager/Admin em `UserController`; o gestor informa nome, e-mail, senha (ou senha padrão). Não há “convite por e-mail”: um link enviado ao colaborador para ele definir a própria senha e ativar a conta na empresa.

Para SaaS, o onboarding típico é: (1) signup da empresa (dados da empresa + primeiro usuário administrador/gestor da empresa) e (2) convite de colaboradores por e-mail com link de ativação.

Além disso, por segurança, compliance e suporte, é necessário ter **auditoria** clara desses fluxos: saber **quem** criou empresas/usuários, **quem** enviou convites, **quando** convites foram aceitos/expiraram e quais tentativas falharam.

---

## Escopo do plano

| # | Item | Objetivo | Auditoria |
|---|------|----------|-----------|
| 1 | Signup público (empresa + primeiro usuário) | Endpoint público (sem auth) que crie uma empresa e o primeiro usuário (gestor da empresa) em uma única operação; fluxo de “criar conta” no frontend. | Registrar criação de empresa/usuário via signup e principais falhas (e-mail duplicado, abuso). |
| 2 | Convite por e-mail (link de ativação) | Gestor/Admin envia convite para um e-mail; sistema gera token de uso único e envia link; colaborador acessa o link, define senha e passa a pertencer à empresa (e opcionalmente a um time). | Registrar envio de convite, aceite, reenvio, uso inválido/expirado. |

Cada seção abaixo é um **item executável** para um agente, já incluindo requisitos de auditoria.

---

## Item 1: Signup público (empresa + primeiro usuário)

### Objetivo

Permitir que um usuário não autenticado crie uma “conta” no sistema: isso corresponde a criar uma **empresa** e o **primeiro usuário** (gestor da empresa) em uma única transação. O endpoint deve ser público (sem `[Authorize]`) e protegido contra abuso (rate limit, validação e, no futuro, captcha se necessário), **registrando eventos de auditoria** para criação e falhas relevantes.

### Estado atual

- **CompanyController.Create** (`backend/src/CompetencyMatrix.API/Controllers/CompanyController.cs`): recebe `CreateCompanyRequest` com `Name`, `Document`, `Email`, `Phone`, `UserIds`. Os usuários em `UserIds` já devem existir e não ter empresa. Ou seja, hoje é preciso criar usuários antes (via `UserController`, por um Admin) e depois associá-los à empresa.
- **UserController.Create** (`backend/src/CompetencyMatrix.API/Controllers/UserController.cs`): cria usuário com nome, e-mail, senha, role, grade, `CompanyId`, etc.; exige role `MANAGER`/`ADMIN`/`COORDINATOR`.

### O que fazer – Backend

1. **DTO e serviço**
   - Definir `SignupRequest` com dados da empresa (por exemplo: `Name`, `Document`, `Email`, `Phone`) e dados do primeiro usuário (por exemplo: `Name`, `Email`, `Password`).
   - Definir `SignupResult` (por exemplo: ids da empresa e do usuário e/ou token de login para autenticar automaticamente após o signup).
   - Criar `ISignupService` com método `Task<SignupResult> SignupAsync(SignupRequest request)` responsável por:
     - Validar se já existe usuário com o e-mail informado (não permitir signup com e-mail já utilizado).
     - Criar a empresa.
     - Criar o usuário gestor vinculado à empresa (por exemplo, `IsManager = true`, sem poder de Admin global).
     - Associar o usuário à empresa (ex.: `AddUserToCompanyAsync`).
     - Garantir transação atômica: se qualquer passo falhar, fazer rollback.
   - **Auditoria (serviço)**:
     - Integrar o serviço com uma infraestrutura de auditoria (por exemplo, interface `IAuditLogger`) para registrar eventos como:
       - `CompanyCreatedBySignup` com dados: `companyId`, `companyName`, `email` de contato, `ip`, `userAgent`.
       - `UserCreatedBySignup` com dados: `userId`, `companyId`, `email`, `ip`, `userAgent`.
     - Registrar também falhas relevantes, como tentativa de signup com e-mail já existente (`SignupEmailConflict`), contendo pelo menos e-mail, `ip` e `userAgent`.
     - Persistir esses eventos em uma tabela de auditoria (por exemplo, `audit_logs`) com: tipo de evento, timestamp, dados (JSON), usuário/ator (no signup público pode ser `null` ou `public`), IP e userAgent.

2. **Controller**
   - Criar rota pública `POST /auth/signup` (ou equivalente, como `POST /public/signup`), **sem** `[Authorize]`.
   - A action deve:
     - Receber `SignupRequest`.
     - Chamar `ISignupService.SignupAsync`.
     - Retornar:
       - `201 Created` com ids da empresa/usuário, ou
       - `200 OK` com um `LoginResponse` contendo token de autenticação para o frontend já redirecionar para o dashboard.
     - Em caso de e-mail duplicado, retornar `409 Conflict` (ou `400 BadRequest`) com mensagem clara.
   - **Auditoria (controller)**:
     - Garantir que exceções de validação relevantes sejam convertidas em eventos de auditoria de falha (por exemplo, `SignupValidationFailed`, `SignupRateLimited`), usando `IAuditLogger`, com contexto mínimo (e-mail, IP, userAgent).

### O que fazer – Frontend

- Criar nova página/rota pública, por exemplo `/signup`, com formulário contendo:
  - Dados da empresa: nome, documento, e-mail, telefone.
  - Dados do primeiro usuário: nome, e-mail, senha e confirmação de senha.
- Ao submeter o formulário, chamar `POST /auth/signup` com o payload `SignupRequest`.
- Em caso de sucesso:
  - Se a API retornar token de autenticação (`LoginResponse`), efetuar login automático e redirecionar para `/` (dashboard).
  - Caso contrário, redirecionar para `/login` com mensagem do tipo “Conta criada. Faça login.”.
- Na tela de login, adicionar link “Criar conta” levando para `/signup`.
- **Auditoria/telemetria de UI (opcional)**:
  - Integrar com o plano de observabilidade para registrar eventos de analytics, como:
    - `signup_form_viewed` (quando a página `/signup` é carregada).
    - `signup_submitted` (quando o usuário envia o formulário).
    - `signup_failed` (quando a API retorna erro), anexando o código de erro.

### Segurança e limites

- Manter o rate limiting definido no plano de observabilidade (Docs 09), configurando cota mais baixa para signup (por exemplo, 5 requisições/hora por IP) para evitar criação em massa de contas.
- Considerar uso futuro de captcha em ambientes de produção.
- Não expor no signup a opção de criar usuário como “Admin global”; o primeiro usuário sempre será gestor da própria empresa.

### Documentação

- Atualizar README/Docs com:
  - Endpoint `POST /auth/signup` (público).
  - Payload esperado (`SignupRequest`) e possíveis respostas (201/200, 400, 409).
  - Notas de segurança (rate limit, captcha futuro).
  - **Notas de auditoria**: descrever que o endpoint gera eventos `CompanyCreatedBySignup`, `UserCreatedBySignup` e eventos de falha como `SignupEmailConflict`.

### Arquivos a criar/alterar

- Backend:
  - DTOs `SignupRequest` e `SignupResult`.
  - Interface `ISignupService` e implementação `SignupService`.
  - Controller (por exemplo, `AuthController`) com action `POST /auth/signup` (ou `PublicController`).
  - Registro do serviço em `Program.cs`.
  - Integração com infraestrutura de auditoria (uso de `IAuditLogger` e/ou tabela `audit_logs`).
- Frontend:
  - Rota pública `/signup`.
  - Página `SignupPage` com formulário de empresa + primeiro usuário.
  - Serviço (`authService` ou `signupService`) para chamar a API.
  - Link “Criar conta” na `LoginPage`.
- Documentação: README e/ou Docs para endpoint e auditoria.

### Critério de conclusão (incluindo auditoria)

- Usuário não logado acessa `/signup`, preenche dados da empresa e do primeiro usuário, submete e a empresa e o usuário são criados; em seguida faz login automático ou é redirecionado para login.
- Tentativa de signup com e-mail já existente retorna erro claro (409 ou 400) e **não** cria empresa.
- Apenas o primeiro usuário da empresa é criado no signup; não é possível criar Admin global por esse endpoint.
- **Eventos de auditoria são persistidos** para:
  - Criação de empresa e usuário via signup.
  - Principais falhas de signup (e-mail duplicado, validação, rate limit), consultáveis via tabela `audit_logs` ou mecanismo de logs padrão.

---

## Item 2: Convite por e-mail (link de ativação)

### Objetivo

Permitir que um gestor (ou Admin) “convide” um colaborador informando o e-mail. O sistema gera um token de uso único (ou de validade limitada), persiste o convite e envia um e-mail com link. O colaborador acessa o link, define a senha e passa a ser usuário da empresa (e opcionalmente de um time). O token não pode ser reutilizado, e **todas as etapas relevantes devem ser auditadas**.

### Estado atual

- Não existe tabela de convites nem endpoints de envio de convite ou de “ativação por link”.
- Usuários são criados pelo `UserController` com senha definida pelo gestor; não há fluxo “usuário recebe e-mail e define a própria senha”.

### O que fazer – Backend

1. **Modelo de dados**
   - Criar nova tabela, por exemplo `invites` (ou `user_invites`), com colunas principais:
     - `id` (UUID ou serial).
     - `email`.
     - `company_id`.
     - `invited_by_user_id`.
     - `token_hash` (hash do token aleatório longo).
     - `expires_at`.
     - `used_at` (nulo até uso).
     - `created_at`.
   - Adicionar índices por token (para lookup rápido) e por `email + company_id` (para evitar convites duplicados ativos).
   - Criar migration em `database/migrations` com esse modelo.
   - **Auditoria integrada ao modelo**:
     - A própria tabela `invites` já oferece rastreabilidade de “quem convidou quem, quando, para qual empresa”.
     - Além disso, cada operação crítica deve gerar eventos de auditoria específicos, como:
       - `UserInvited` (dados: `companyId`, `invitedByUserId`, `email`, `expiresAt`).
       - `InviteResent` (se houver reenvio, com novo `expiresAt`).
       - `InviteAccepted` (`userId` criado, `companyId`, `inviteId`, `invitedEmail`).
       - `InviteExpiredAttempt` (tentativa de uso de convite expirado ou já utilizado).

2. **Envio de convite**
   - Definir DTO `InviteRequest` com:
     - `Email`, `CompanyId`, e campos opcionais como `RoleId`, `GradeId`, `TeamIds`.
   - Restrição de quem chama:
     - Usuário autenticado com role `MANAGER`/`ADMIN` (e, se for `MANAGER`, o `CompanyId` deve ser o da sua própria empresa).
   - Serviço de convites deve:
     - Verificar se já existe usuário com aquele e-mail na empresa; se existir, retornar erro.
     - Verificar se já existe convite pendente (não usado, não expirado) para aquele e-mail na empresa; decidir se:
       - Reenvia (gera novo token, atualiza `expires_at`), ou
       - Bloqueia, retornando erro.
     - Gerar token aleatório longo (por exemplo, 32 bytes), armazenar **apenas o hash** em `token_hash` e definir `expires_at` (por exemplo, 7 dias).
     - Chamar serviço de e-mail (`IEmailSender`) com link:
       - `{FrontendBaseUrl}/invite/accept?token={token_raw}`.
     - **Auditoria (envio)**:
       - Registrar evento `UserInvited` com:
         - `companyId`, `invitedByUserId`, `email`, `expiresAt`, `ip`, `userAgent`.
       - Em caso de reenvio, registrar `InviteResent` com `inviteId` e novo `expiresAt`.
   - Endpoint:
     - `POST /invites` (ou `POST /companies/{companyId}/invites`) recebendo `InviteRequest`.
     - Retornar `201 Created` com mensagem “Convite enviado” (não retornar o token no body).
   - E-mail:
     - Definir interface `IEmailSender` com algo como `SendInviteEmailAsync(to, inviteLink, companyName, expiresAt)`.
     - Implementação pode usar SMTP/SendGrid ou apenas logar o link em ambiente de desenvolvimento.
     - Configurações (SMTP, chave SendGrid, etc.) em `appsettings` e variáveis de ambiente.

3. **Aceitação do convite**
   - Endpoints públicos:
     - `GET /invites/accept?token=...` para validar o token e obter dados básicos (empresa, e-mail, nome do convidante, se desejado).
     - `POST /invites/accept` com body `{ "Token": "...", "Password": "...", "Name": "..." }`.
   - Serviço de aceitação deve:
     - Localizar o convite pelo hash do token.
     - Validar se não está expirado (`expires_at`) e se `used_at` é nulo.
     - Criar usuário com e-mail do convite, nome e senha informados, `CompanyId` da empresa do convite e atributos opcionais (`RoleId`, `GradeId`, `TeamIds`).
     - Associar o usuário à empresa (ex.: `AddUserToCompanyAsync`), e a times se houver.
     - Marcar o convite como usado (`used_at = now`).
     - Opcionalmente retornar `LoginResponse` para logar automaticamente o usuário.
   - **Auditoria (aceitação)**:
     - Registrar evento `InviteAccepted` com:
       - `inviteId`, `email`, `companyId`, `newUserId`, `ip`, `userAgent`.
     - Caso o token seja inválido ou expirado, registrar `InviteInvalidOrExpired` com contexto (token truncado ou hash, `ip`, `userAgent`).

4. **Infraestrutura de auditoria**
   - Reutilizar a mesma infraestrutura de auditoria usada no Item 1 (por exemplo, `IAuditLogger` e tabela `audit_logs`).
   - Garantir que, para cada evento de convite, sejam gravados:
     - Tipo de evento (`UserInvited`, `InviteResent`, `InviteAccepted`, `InviteExpiredAttempt`, `InviteInvalidOrExpired`).
     - `created_at`.
     - Ator (`actor_user_id` para quem convidou; `null` ou `public` para aceite anônimo).
     - Contexto: `companyId`, `email`, `inviteId` (quando aplicável), `ip`, `userAgent`.

### O que fazer – Frontend

1. **Envio de convites**
   - Na tela de usuários/gestão, criar ação “Convidar” com formulário simples contendo:
     - Campo obrigatório de e-mail.
     - Campos opcionais para cargo/role, grade e time(s).
   - Ao enviar, chamar `POST /invites` com `InviteRequest`.
   - Exibir mensagem de sucesso “Convite enviado para {email}” em caso de 201.
   - (Opcional) Criar listagem de convites pendentes/expirados, consumindo um endpoint específico se disponibilizado.

2. **Aceitação do convite**
   - Criar rota pública `/invite/accept?token=...`.
   - No carregamento da página:
     - Chamar `GET /invites/accept?token=...` para validar token e obter dados da empresa (e opcionalmente nome do convidante).
     - Em caso de token inválido/expirado, exibir mensagem apropriada (“Convite inválido ou expirado”) e orientar o usuário a pedir um novo convite.
   - Exibir formulário com:
     - Nome (caso não venha preenchido no convite).
     - Senha.
     - Confirmação de senha.
   - Ao submeter, chamar `POST /invites/accept` com token, nome e senha.
   - Em sucesso:
     - Opcionalmente executar login automático e redirecionar para `/`.
     - Alternativamente, exibir mensagem “Conta ativada. Faça login.” com link para login.
   - **Telemetria de UI (opcional)**:
     - Integrar com observabilidade para registrar:
       - `invite_accept_viewed` (página de aceite carregada).
       - `invite_accept_submitted` (formulário enviado).
       - `invite_accept_failed` (resposta de erro da API).

### Segurança

- Garantir que o token seja longo e aleatório, armazenando somente o hash no banco.
- Exigir HTTPS em produção para acesso ao link de convite.
- Aplicar rate limiting aos endpoints de aceitação por IP e por token.
- Não permitir aceitar convite com e-mail diferente do armazenado no convite (o e-mail do usuário é sempre o do convite).

### Documentação

- README/Docs devem incluir:
  - Modelo da tabela `invites`.
  - Endpoints de convites:
    - `POST /invites` (envio).
    - `GET /invites/accept` (validação).
    - `POST /invites/accept` (aceitação).
  - Variáveis de configuração de e-mail (SMTP, SendGrid, etc.).
  - **Eventos de auditoria gerados**: `UserInvited`, `InviteResent`, `InviteAccepted`, `InviteExpiredAttempt`, `InviteInvalidOrExpired`.

### Arquivos a criar/alterar

- Backend:
  - Migration da tabela `invites`.
  - Entidade `Invite` (se houver camada de domínio).
  - Repositório e interface para `Invite`.
  - `InviteService` (ou métodos específicos em `UserService`/`CompanyService`) para envio e aceitação.
  - `InviteController` ou ações em `CompanyController`/controlador dedicado.
  - Interface `IEmailSender` e implementação concreta.
  - Registro de serviços em `Program.cs` e configurações em `appsettings` (SMTP/e-mail).
  - Integração com `IAuditLogger` para eventos de convite.
- Frontend:
  - Tela de envio de convite (por exemplo, dentro da área de gestão de usuários).
  - Página pública de aceitação `/invite/accept`.
  - Serviço de API para convites (métodos para `POST /invites`, `GET /invites/accept`, `POST /invites/accept`).
- Documentação: README e Docs.

### Critério de conclusão (incluindo auditoria)

- Gestor consegue enviar convite para um e-mail; o sistema persiste o convite e envia (ou loga, em dev) o e-mail com link contendo token.
- Colaborador acessa o link com token, preenche nome e senha, submete; usuário é criado na empresa, o convite é marcado como usado e o fluxo conclui com sucesso (login automático ou instrução clara para login).
- Reutilizar o mesmo token retorna erro indicando que o convite já foi utilizado ou é inválido.
- Convites expirados (após `expires_at`) não podem ser aceitos.
- **Eventos de auditoria são acessíveis** para:
  - Envio de convite (`UserInvited`, `InviteResent`).
  - Aceitação (`InviteAccepted`).
  - Erros por token inválido/expirado (`InviteExpiredAttempt`, `InviteInvalidOrExpired`).

---

## Ordem sugerida de execução

1. **Item 1 (Signup)** – habilita aquisição de novos clientes sem necessidade de Admin global, incluindo a criação ou ajuste da infraestrutura de auditoria (`IAuditLogger`/tabela `audit_logs`).
2. **Item 2 (Convites)** – reutiliza essa infraestrutura de auditoria para rastrear envio/aceite de convites, melhora a experiência de adicionar colaboradores e reduz senhas definidas pelo gestor.

Ao pedir a um agente: “Execute o Item 1 do plano em Docs/13-onboarding-self-service.md” ou “Execute o Item 2 do plano em Docs/13-onboarding-self-service.md”, ele deve seguir as seções acima.

---

## Referência rápida

| Item | Backend | Frontend | Auditoria |
|------|---------|----------|-----------|
| 1 | `SignupRequest`, `SignupResult`, `ISignupService`/`SignupService`, `POST /auth/signup`, integração com `IAuditLogger` | `SignupPage`, rota `/signup`, link “Criar conta” na tela de login | `CompanyCreatedBySignup`, `UserCreatedBySignup`, `SignupEmailConflict`, `SignupValidationFailed`, etc. |
| 2 | Tabela `invites`, `InviteService`, `IEmailSender`, endpoints `POST /invites`, `GET /invites/accept`, `POST /invites/accept`, integração com `IAuditLogger` | Tela de envio de convites, página pública `/invite/accept`, serviço de API de convites | `UserInvited`, `InviteResent`, `InviteAccepted`, `InviteExpiredAttempt`, `InviteInvalidOrExpired`, etc. |
