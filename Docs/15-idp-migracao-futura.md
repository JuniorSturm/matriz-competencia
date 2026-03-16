# Plano: Migração futura para IdP (provedor de identidade externo)

Documentação do planejamento para, no futuro, delegar autenticação a um provedor de identidade externo (Keycloak, Auth0, Azure AD B2C, Cognito ou similar). Objetivo: deixar o caminho preparado no código e documentar os passos para que um agente possa executar a migração quando for oportuno. Hoje o sistema usa autenticação própria (Doc 10); este plano não altera esse comportamento até que a decisão de migrar seja tomada.

---

## Contexto

Hoje:

- A **API** controla login (`POST /auth/login`), refresh (`POST /auth/refresh`), logout (`POST /auth/logout`), emissão de JWT e persistência de refresh tokens na tabela `refresh_tokens`.
- O **frontend** envia credenciais para a API, armazena access token e refresh token no localStorage e usa o interceptor para renovar o token em caso de 401.

Para um SaaS que gerencia competências de usuários de **corporações**, é desejável a médio/longo prazo usar um **IdP** (Identity Provider) externo, pois:

- Clientes enterprise costumam exigir **SSO** (Single Sign-On) com o IdP da empresa (SAML, OpenID Connect).
- O IdP centraliza **MFA**, políticas de senha, recuperação de conta e auditoria de acesso.
- A aplicação deixa de armazenar senhas e de gerir refresh tokens; reduz superfície de ataque e esforço de compliance.

**Decisão atual:** manter autenticação própria no início (mais prático); este documento planeja a **migração futura** para IdP, em itens executáveis quando for o momento.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Abstração de autenticação no backend | Introduzir interface (ex.: `IAuthProvider`) que abstrai "quem autentica"; implementação atual usa AuthService/JWT próprio; futura implementação delegará ao IdP. |
| 2 | Abstração de autenticação no frontend | Centralizar "quem fornece o token" (API própria vs IdP); login/refresh/logout via camada que pode ser trocada (config ou feature flag). |
| 3 | Escolha e configuração do IdP | Documentar critérios de escolha (Keycloak vs Auth0 vs Azure AD B2C vs Cognito); configuração mínima (realm/client, redirect URIs, scopes, mapeamento de roles). |
| 4 | Migração backend para validar token do IdP | Trocar validação de JWT próprio por validação de JWT do IdP (JWKS, issuer/audience); remover ou desativar endpoints de login/refresh próprios quando IdP estiver ativo. |
| 5 | Migração frontend para fluxo IdP | Login via redirect ao IdP; receber token na callback; refresh e logout via IdP; manter interceptor de 401/403 e uso do token nas chamadas à API. |
| 6 | Mapeamento de usuários e empresas | Definir como usuários do IdP (subject, email) se relacionam com usuários e empresas no banco (provisionamento, primeiro login, vínculo companyId); documentar e implementar estratégia. |

Cada seção abaixo é um **item executável** para um agente. A ordem sugerida é 1 → 2 → 3 (preparação e decisão); depois 4 → 5 → 6 (migração efetiva).

---

## Item 1: Abstração de autenticação no backend

### Objetivo

Permitir que "quem autentica" seja trocável sem reescrever toda a API. Hoje o `AuthController` e o `AuthService` são o provedor de identidade. Introduzir uma abstração (ex.: `IAuthProvider` ou `IIdentityService`) com operações: "validar credenciais e retornar tokens + usuário", "refresh token", "revogar refresh". A implementação atual ("in-house") usa o AuthService/JwtService/RefreshToken existentes; uma futura implementação ("IdP") poderá delegar ao IdP (e apenas validar o JWT recebido na API).

### Estado atual

- [AuthController](backend/src/CompetencyMatrix.API/Controllers/AuthController.cs): chama `IAuthService.LoginAsync`, `RefreshAsync`, `RevokeRefreshAsync` diretamente.
- [AuthService](backend/src/CompetencyMatrix.Application/Services/AuthService.cs): implementa login, geração de JWT, criação/rotação de refresh token.
- Validação de JWT: em [Program.cs](backend/src/CompetencyMatrix.API/Program.cs) via `AddAuthentication(JwtBearerDefaults...)` com chave e issuer/audience próprios.

### O que fazer

1. **Definir interface do provedor de autenticação**
   - Criar interface (ex.: em Application/Interfaces) como `IAuthProvider` com métodos: `LoginAsync(LoginRequest) -> LoginResult?`, `RefreshAsync(RefreshRequest) -> RefreshResult?`, `RevokeRefreshAsync(string)`. Os tipos de resultado podem ser os DTOs atuais (LoginResponse, RefreshResponse) ou tipos neutros que tanto a implementação in-house quanto a IdP preencham.
   - Manter `IAuthService` se quiser preservar compatibilidade; o AuthController passaria a depender de `IAuthProvider` (ou `IAuthService` implementar essa interface). Objetivo: um único ponto de entrada "autenticação" que pode ser implementado por "in-house" ou "IdP".

2. **Implementação "in-house"**
   - A implementação atual do AuthService (login, refresh, revoke) passa a ser uma das implementações da abstração (ex.: `InHouseAuthProvider` que usa IUserRepository, IJwtService, IRefreshTokenRepository). Registrar no `Program.cs` como `IAuthProvider` quando não estiver usando IdP.

3. **Configuração para escolher o provedor**
   - Chave de configuração (ex.: `Auth:Provider` = `"InHouse"` ou `"Keycloak"`). Se `InHouse`, registrar a implementação atual; se `Keycloak` (ou outro), no futuro registrar a implementação que delega ao IdP. Por enquanto, só registrar InHouse e documentar a chave.

4. **Documentar**
   - Em Docs: "A API está preparada para trocar o provedor de autenticação via configuração; hoje só a implementação in-house está ativa."

### Arquivos a alterar/criar

- Application/Interfaces: nova interface (ex.: IAuthProvider) e tipos de resultado se necessário.
- Application/Services: AuthService pode implementar essa interface ou haver um adapter; AuthController passa a usar IAuthProvider.
- Program.cs: registro da implementação conforme Auth:Provider.
- appsettings.json: exemplo `Auth:Provider: "InHouse"`.
- Docs: seção sobre abstração e migração futura.

### Critério de conclusão

- Existe uma abstração clara "provedor de autenticação"; o comportamento atual (login/refresh/logout próprio) continua funcionando através dessa abstração.
- A troca para outro provedor no futuro exige apenas nova implementação da interface e alteração de configuração (e, no Item 4, validação de JWT do IdP).

---

## Item 2: Abstração de autenticação no frontend

### Objetivo

Centralizar no frontend "de onde vêm o access token e o refresh token" e "como fazer login, refresh e logout". Hoje o frontend chama a API (`/auth/login`, `/auth/refresh`) e guarda token/refreshToken no localStorage. No futuro, com IdP, o login será redirect ao IdP e o token virá na callback (e o refresh pode ser feito contra o IdP). Uma camada de abstração (ex.: `authGateway` ou `authClient`) permite trocar a implementação (API própria vs IdP) por configuração ou feature flag, sem espalhar condicionais em toda a aplicação.

### Estado atual

- [authService.ts](frontend/src/services/authService.ts): chama `api.post('/auth/login', ...)` e `api.post('/auth/refresh', ...)`.
- [useAuth.tsx](frontend/src/hooks/useAuth.tsx): chama authService.login, guarda token/refreshToken/user no localStorage, logout chama api.post('/auth/logout') e limpa storage.
- [api.ts](frontend/src/services/api.ts): interceptor usa localStorage para token e chama authService.refresh() em 401.

### O que fazer

1. **Definir contrato do cliente de autenticação**
   - Criar um módulo (ex.: `authClient.ts` ou estender `authService`) que exporta: `login(credentials) -> Promise<LoginResult>`, `refresh() -> Promise<RefreshResult | null>`, `logout() -> Promise<void>`. O `LoginResult` contém pelo menos token, user (ou claims), e opcionalmente refreshToken/refreshExpiresIn. Assim, tanto a implementação "API própria" quanto "IdP" podem satisfazer o mesmo contrato.

2. **Implementação "API própria"**
   - A lógica atual (chamar api.post para login/refresh, guardar no localStorage) vira a implementação padrão desse contrato (ex.: `authService` implementa esse contrato chamando a API atual). useAuth e o interceptor continuam usando esse contrato, não a API diretamente.

3. **Configuração / feature flag**
   - Variável de ambiente ou config (ex.: `VITE_AUTH_PROVIDER=api` ou `keycloak`). Por enquanto só `api` existe; quando houver IdP, outra implementação do contrato será escolhida com base nessa config (login = redirect ao IdP, refresh = chamada ao IdP, etc.).

4. **Documentar**
   - Em Docs: "O frontend usa uma camada de autenticação que pode ser trocada; hoje usa a API própria; no futuro pode usar IdP sem alterar useAuth e interceptor além do ponto de configuração."

### Arquivos a alterar/criar

- frontend/src: módulo de "auth client" com interface e implementação "API"; useAuth e api.ts consomem essa interface; config/env para provedor.
- Docs: descrição da abstração e do fluxo futuro com IdP.

### Critério de conclusão

- Login, refresh e logout no frontend passam por um único contrato; o comportamento atual é preservado com a implementação "API própria".
- A troca para IdP no futuro implica nova implementação do contrato (redirect, callback, refresh/logout via IdP) e alteração de config, sem reescrever todas as telas.

---

## Item 3: Escolha e configuração do IdP

### Objetivo

Documentar critérios para escolher um IdP (Keycloak, Auth0, Azure AD B2C, AWS Cognito, Okta, etc.) e os passos mínimos de configuração (realm/client, redirect URIs, scopes, mapeamento de roles/claims) para que a aplicação possa usar esse IdP no login e a API possa validar os JWTs emitidos por ele.

### Estado atual

- Não há documento que compare IdPs nem guia de configuração para um IdP específico no contexto deste projeto.

### O que fazer

1. **Critérios de escolha (documentar em Docs)**
   - Custo (open-source self-hosted vs SaaS), suporte a OIDC/SAML, multi-tenancy (realm por cliente ou um realm com múltiplos clientes), integração com diretórios corporativos (LDAP, Azure AD), MFA, facilidade de deploy e operação. Para o contexto "corporações e competências", priorizar: OIDC, possibilidade de SSO enterprise, claims/roles customizáveis.

2. **Configuração mínima do IdP (exemplo com um IdP de referência)**
   - Escolher um IdP de referência (ex.: Keycloak) e documentar: criação de realm (ou uso do master); criação de client (public ou confidential) para o frontend; redirect URIs (ex.: `https://app.seudominio.com/callback`, `http://localhost:5173/callback`); scopes (openid, profile, email e um scope customizado para roles se necessário); mapeamento de roles/groups para claims do JWT (ex.: `realm_access.roles` ou custom claim `roles`). Documentar também o endpoint de descoberta OIDC (`.well-known/openid-configuration`), endpoint de token e de JWKS.

3. **Variáveis de ambiente / configuração da aplicação**
   - Listar variáveis necessárias quando o IdP estiver ativo: Authority/Issuer do IdP, ClientId (e ClientSecret se confidential), JWKS URI ou Metadata Address; no frontend: Authority, ClientId, RedirectUri, escopos. Documentar em README ou em Docs/15.

### Arquivos a criar/alterar

- Docs: novo arquivo ou seção em 15-idp-migracao-futura.md (ou 15-idp-escolha-config.md) com critérios, comparação resumida e guia de configuração para o IdP de referência.
- README ou Docs: tabela de variáveis de ambiente para modo IdP.

### Critério de conclusão

- Existe documentação clara que permite à equipe escolher um IdP e configurá-lo (realm, client, URIs, scopes, claims) para uso futuro com esta aplicação.
- As variáveis de configuração necessárias para backend e frontend em modo IdP estão listadas.

---

## Item 4: Migração backend para validar token do IdP

### Objetivo

Quando o IdP estiver em uso, a API deve **deixar de emitir JWT próprio** para login/refresh e deve **apenas validar** o JWT que o IdP emitiu. Isso implica: configurar a validação de JWT com issuer/audience e chaves (JWKS) do IdP; opcionalmente desativar ou remover os endpoints `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` (ou mantê-los retornando 501 quando Auth:Provider = IdP); e garantir que as claims do JWT do IdP (sub, email, roles) sejam usadas para autorização (Authorize(Roles = "…") e eventual vínculo com usuário/empresa no banco).

### Estado atual

- A API valida JWT com chave e issuer/audience próprios (Program.cs, JwtService para emissão). Os endpoints de auth emitem e revogam tokens.

### O que fazer

1. **Validação de JWT do IdP**
   - Configurar `AddAuthentication(JwtBearer...)` para usar o Metadata Address ou JWKS URI do IdP (Authority = issuer), ValidIssuer e ValidAudience do IdP. Em ambiente onde Auth:Provider = IdP, a chave de assinatura vem do IdP (JWKS), não do Jwt:Secret atual.

2. **Mapeamento de claims**
   - O IdP pode enviar roles em `realm_access.roles`, `resource_access.<client>.roles` ou em claim customizado. Configurar o middleware de autorização (Role claim type) para ler o claim correto, de forma que `[Authorize(Roles = "MANAGER")]` continue funcionando com o JWT do IdP. Pode ser necessário um middleware ou policy que mapeie claims do IdP para as roles esperadas pela API (ADMIN, MANAGER, COORDINATOR, EMPLOYEE).

3. **Desativar ou redirecionar endpoints de auth próprios**
   - Se Auth:Provider = IdP, os endpoints POST /auth/login, /auth/refresh, /auth/logout podem retornar 404/501 ou uma mensagem "Use o IdP para login". Ou mantê-los apenas para compatibilidade em modo híbrido (não recomendado a longo prazo). Documentar o comportamento.

4. **Não usar tabela refresh_tokens quando IdP estiver ativo**
   - Com IdP, o refresh é feito no IdP; a API não precisa da tabela refresh_tokens para sessão. Opcionalmente, um job de limpeza ou não registrar novos tokens quando Auth:Provider = IdP.

### Arquivos a alterar

- Program.cs: configuração condicional de JWT (IdP vs InHouse) conforme Auth:Provider; leitura de Authority, JWKS/Metadata do IdP.
- Controllers: AuthController pode verificar Auth:Provider e retornar 501 para login/refresh/logout quando IdP.
- Documentação: variáveis Auth__Provider, Idp__Authority, Idp__Audience, etc.

### Critério de conclusão

- Com Auth:Provider = IdP e IdP configurado, a API aceita apenas JWTs emitidos pelo IdP e rejeita JWTs antigos da API própria.
- As roles usadas nos controllers (ADMIN, MANAGER, etc.) funcionam com os claims do JWT do IdP.
- Os endpoints de login/refresh/logout próprios estão desativados ou documentados como inativos quando em modo IdP.

---

## Item 5: Migração frontend para fluxo IdP

### Objetivo

Quando o IdP estiver ativo, o frontend deve: iniciar o login redirecionando o usuário ao IdP; na callback (redirect URI), receber o código ou tokens do IdP e guardar o access token (e refresh token se o IdP devolver); usar esse token nas chamadas à API; em 401, usar o refresh do IdP (não chamar POST /auth/refresh da API); e fazer logout redirecionando ao endpoint de logout do IdP (ou chamando o SDK do IdP). A camada de abstração do Item 2 deve passar a usar a implementação "IdP" (ex.: lib OIDC como react-oidc-context, ou Auth0 SDK, ou Keycloak JS).

### Estado atual

- O frontend chama a API para login e refresh; não há redirect nem callback de IdP.

### O que fazer

1. **Implementação "IdP" do contrato de autenticação**
   - Usar uma lib OIDC (ex.: oidc-client-ts, react-oidc-context, ou o adapter do Keycloak/Auth0) para: iniciar login (redirect ao IdP), tratar callback (trocar código por tokens se necessário), armazenar access token (e refresh) no estado ou em memória/localStorage conforme a lib; expor refresh e logout via lib (logout = redirect ao IdP ou endSession). O "auth client" do Item 2 passa a ter uma implementação que usa essa lib quando VITE_AUTH_PROVIDER=keycloak (ou similar).

2. **Rota de callback**
   - Nova rota (ex.: `/callback` ou `/auth/callback`) onde o IdP redireciona após login; nessa rota a lib processa o código/tokens, guarda no storage/estado e redireciona o usuário para a home ou para a URL que ele tentava acessar.

3. **Interceptor e useAuth**
   - O interceptor continua tratando 401: em modo IdP, em vez de chamar authService.refresh() (API), chama o refresh da lib do IdP e repete a requisição. Logout limpa estado e chama endSession do IdP (redirect). useAuth passa a usar a implementação IdP do auth client quando configurado.

4. **Mapeamento user/roles**
   - O JWT do IdP trará sub, email, talvez name e roles. O frontend pode precisar construir o objeto "user" (id, name, isManager, isAdmin, isCoordinator, companyId) a partir dos claims ou de uma chamada à API "me" que devolve o usuário do banco vinculado ao sub do IdP (ver Item 6).

### Arquivos a alterar/criar

- frontend: nova implementação do auth client para IdP; rota /callback; configuração da lib OIDC (Authority, ClientId, RedirectUri, scopes); useAuth e api.ts usando a implementação escolhida por config.
- Docs: fluxo de login/refresh/logout com IdP e variáveis VITE_AUTH_PROVIDER, VITE_IDP_AUTHORITY, VITE_IDP_CLIENT_ID, etc.

### Critério de conclusão

- Com IdP configurado, o usuário faz login via redirect ao IdP e volta à aplicação com token; as chamadas à API usam esse token; 401 dispara refresh no IdP e retry; logout encerra sessão no IdP e limpa estado local.
- O comportamento com Auth:Provider=api (API própria) continua igual ao atual.

---

## Item 6: Mapeamento de usuários e empresas

### Objetivo

O IdP identifica o usuário (subject, email); a aplicação precisa de **usuários** e **empresas** no próprio banco (companies, users, roles, companyId, etc.). Definir e implementar a estratégia: como um usuário que loga pela primeira vez via IdP vira um registro em `users` e é vinculado a uma `company`; como roles do IdP (ou grupos) se relacionam com isManager, isAdmin, isCoordinator e com companyId; e se há provisionamento automático (criação de user na primeira vez) ou se um admin precisa convidar/associar.

### Estado atual

- Usuários são criados pela API (UserController, AuthService usa IUserRepository); login verifica email/senha no banco. Não há conceito de "subject do IdP" nem de provisionamento a partir do IdP.

### O que fazer

1. **Estratégia de vínculo IdP ↔ usuário do banco**
   - Opção A: tabela `users` ganha coluna `idp_subject` (string, único); no primeiro login com IdP, se não existir user com aquele sub, criar registro (provisionamento) ou redirecionar para "solicitar acesso" / "convite". Opção B: apenas usuários já existentes no banco podem logar; o admin associa o email (ou sub) do IdP ao user no cadastro; login IdP valida e a API busca user por email ou por idp_subject. Documentar a opção escolhida.

2. **Estratégia de roles e companyId**
   - As roles da API (ADMIN, MANAGER, COORDINATOR, EMPLOYEE) podem vir de claims do IdP (mapeamento direto) ou serem sempre lidas do banco (user.isManager, user.isAdmin, etc.). Se do banco, após validar o JWT (sub/email), a API busca o user e usa as flags do banco para autorização. companyId sempre do banco (user.company_id). Documentar: "Com IdP, a API usa sub/email do token para identificar o user no banco; roles e companyId vêm do banco."

3. **Endpoint "me" (opcional mas recomendado)**
   - GET /users/me (ou /auth/me) que, a partir do JWT (sub ou email), retorna o user do banco (id, name, email, isManager, isAdmin, isCoordinator, companyId). O frontend chama esse endpoint após login com IdP para preencher o estado "user" e exibir nome/permissões. Se o user não existir no banco (provisionamento atrasado), retornar 404 e o frontend pode mostrar "Aguardando aprovação" ou redirecionar para signup/convite.

4. **Migration e seed**
   - Se optar por idp_subject em users: migration adicionando coluna idp_subject (nullable, único). Documentar que em modo IdP o provisionamento pode preencher essa coluna no primeiro login.

### Arquivos a alterar/criar

- Backend: possível coluna users.idp_subject; serviço ou middleware que, a partir do JWT (sub/email), resolve o user do banco; endpoint GET /auth/me ou GET /users/me; lógica de provisionamento (criar user no primeiro login) se for a opção escolhida.
- Database: migration para idp_subject se aplicável.
- Docs: estratégia de mapeamento IdP ↔ users/companies e fluxo de primeiro acesso.

### Critério de conclusão

- Está definido e documentado como o subject/email do IdP se liga ao user e à company no banco.
- A API consegue, a partir do JWT do IdP, identificar o user (e companyId) e aplicar as regras de autorização atuais (MANAGER, ADMIN, etc.).
- O frontend tem como obter os dados do usuário (nome, roles, companyId) após login com IdP (via endpoint /me ou equivalente).

---

## Ordem sugerida de execução

1. **Itens 1 e 2** (abstração backend e frontend) — podem ser feitos em paralelo ou em sequência; preparam o código para trocar o provedor sem reescrever tudo.
2. **Item 3** (escolha e configuração do IdP) — decisão e documentação; não exige mudança de código além de config.
3. **Itens 4, 5 e 6** (migração backend, frontend e mapeamento usuários/empresas) — quando for o momento de ativar o IdP; a ordem 4 → 5 → 6 permite que a API aceite tokens do IdP antes do frontend mudar, e o mapeamento de usuários (6) pode ser feito em paralelo ou logo após 4.

**Como solicitar a um agente:**  
"Execute o Item 1 do plano em Docs/15-idp-migracao-futura.md"  
"Execute os itens 1 e 2 do plano em Docs/15-idp-migracao-futura.md"

---

## Referência rápida de arquivos

| Arquivo / área | Itens |
|----------------|--------|
| backend AuthController, AuthService, Program.cs (JWT) | 1, 4 |
| backend nova interface IAuthProvider / implementação IdP | 1, 4 |
| frontend authService, useAuth, api.ts (interceptor) | 2, 5 |
| frontend auth client IdP (lib OIDC), rota /callback | 5 |
| backend users (idp_subject), GET /auth/me ou /users/me | 6 |
| Docs (critérios IdP, configuração, variáveis de ambiente) | 3, 4, 5, 6 |
| database migrations (idp_subject) | 6 |
