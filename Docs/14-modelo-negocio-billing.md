# Plano: Modelo de negócio e billing (planos, limites e assinatura)

Documentação do oitavo item da lista de melhorias para SaaS. Objetivo: introduzir conceito de **planos** com limites de uso (ex.: número de empresas, usuários por empresa, avaliações) e, opcionalmente, integrar **billing/assinatura** (pagamento, renovação, upgrade/downgrade) para monetizar o produto.

---

## Contexto

Hoje não há no sistema:

- Limite de quantas **empresas** um tenant (ou a instância) pode ter.
- Limite de **usuários por empresa**.
- Limite de **avaliações** ou de outros recursos.
- Conceito de **plano** (free, básico, profissional) nem de **assinatura** (período, status, renovação).
- Integração com gateway de pagamento (Stripe, Mercado Pago, etc.).

Para SaaS, é comum ter planos com limites e cobrança recorrente; este plano descreve os passos para chegar lá de forma incremental.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Planos e limites (modelo de dados) | Tabela de planos com limites (max companies, max users per company, etc.); associar empresa a um plano e persistir limites; documentar regras. |
| 2 | Aplicação dos limites na API | Ao criar empresa, usuário ou recurso limitado, verificar se o plano permite; retornar 402 ou 403 com mensagem clara quando o limite for atingido. |
| 3 | Billing e assinatura (opcional) | Status de assinatura por empresa (trial, active, past_due, cancelled); integração com provedor de pagamento para cobrança e renovação; webhooks para atualizar status. |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Planos e limites (modelo de dados)

### Objetivo

Definir a estrutura de dados para **planos** (ex.: Free, Básico, Profissional) e **limites** por plano (máximo de empresas na instância, máximo de usuários por empresa, máximo de avaliações, etc.), e associar cada empresa a um plano. Em uma primeira versão, pode haver um plano padrão “único” com limites altos (comportamento atual) e depois novos planos com limites reais.

### Estado atual

- Tabela [companies](database/migrations/001_create_tables.sql): id, name, document, email, phone, is_active, created_at. Não há coluna `plan_id` nem tabela de planos.
- Não existe tabela `plans` nem `subscriptions`.

### O que fazer

1. **Tabela de planos**
   - Nova tabela `plans` (ou `subscription_plans`): id (serial), name (varchar, ex.: "Free", "Básico", "Profissional"), slug (varchar, ex.: "free", "basico"), max_companies (int, null = ilimitado na instância), max_users_per_company (int, null = ilimitado), max_assessments_per_company (int, null = ilimitado), max_skills_per_company (int, null = ilimitado), is_active (boolean), created_at. Valores numéricos null significam “sem limite” para compatibilidade com o comportamento atual.
   - Migration: novo arquivo em [database/migrations](database/migrations) (ex.: 004_plans_and_limits.sql).

2. **Associar empresa ao plano**
   - Na tabela `companies`, adicionar coluna `plan_id` (int, nullable, FK para plans.id). Se null, tratar como “plano padrão” (ex.: plano com limites altos ou ilimitados). Migration na mesma ou em outra migration.
   - Seed: inserir pelo menos um plano “Padrão” ou “Free” com limites null (ilimitado) para que empresas existentes continuem funcionando.

3. **Entidades e repositório (backend)**
   - Domain: entidade `Plan` com propriedades espelhando a tabela. Application: DTOs (PlanResponse, etc.), interface IPlanRepository, método GetByIdAsync e GetLimitsForCompanyAsync(companyId). Infrastructure: PlanRepository usando Dapper. Company: ao carregar, incluir PlanId (e opcionalmente objeto Plan) para uso nos serviços.

4. **Documentar**
   - Docs: descrição da tabela plans, significado de cada limite, que “null = ilimitado”. Regra de negócio: “Cada empresa pertence a um plano; os limites do plano aplicam-se àquela empresa (e, se max_companies for usado, à instância).”

### Arquivos a criar/alterar

- database/migrations: 004_plans_and_limits.sql (ou nome adequado).
- backend: Domain/Entities/Plan.cs; Application/DTOs (plan); Application/Interfaces/IPlanRepository; Infrastructure/Repositories/PlanRepository; Company entity e CompanyRepository (incluir plan_id); Program.cs (registrar IPlanRepository).
- Docs: modelo de dados e regras de limites.

### Critério de conclusão

- Tabela plans existe com pelo menos um plano “padrão” com limites null.
- Tabela companies tem plan_id; empresas existentes podem ter plan_id null ou apontar para o plano padrão (seed).
- Backend consegue obter o plano de uma empresa e ler os limites (max_users_per_company, etc.) para uso no Item 2.

---

## Item 2: Aplicação dos limites na API

### Objetivo

Antes de criar uma nova empresa, novo usuário em uma empresa, ou outro recurso limitado pelo plano, a API deve verificar se o limite do plano permite. Se não permitir, retornar HTTP 402 (Payment Required) ou 403 (Forbidden) com mensagem clara (ex.: “Limite de usuários do seu plano foi atingido. Faça upgrade.”).

### Estado atual

- [CompanyService.CreateAsync](backend/src/CompetencyMatrix.Application/Services/CompanyService.cs): cria empresa sem verificar limite global de empresas.
- [UserService.CreateAsync](backend/src/CompetencyMatrix.Application/Services/UserService.cs): cria usuário e associa à empresa sem verificar limite de usuários por empresa.
- Skills, assessments, etc.: criação sem checagem de limite de plano.

### O que fazer

1. **Serviço de limites (opcional)**
   - Interface `IPlanLimitService` (ou métodos no CompanyService/UserService): `Task<bool> CanAddCompanyAsync()`, `Task<bool> CanAddUserToCompanyAsync(int companyId)`, `Task<int?> GetMaxUsersForCompanyAsync(int companyId)`. Implementação: obter plano da empresa (via plan_id da company); ler max_users_per_company; contar usuários atuais da empresa; retornar true/false ou o limite. Se plan_id for null, tratar como “sem limite” (retornar true ou limite null).
   - Para limite global de empresas: contar companies na instância; comparar com plan.max_companies do “plano da instância” (se existir) ou com um limite fixo configurável. Em multi-tenant por empresa, o limite de “companies” pode ser por instância (um único tenant = uma empresa) ou por “conta mestre”; documentar a regra.

2. **CompanyService.CreateAsync**
   - No início do método (ou no controller): chamar CanAddCompanyAsync(). Se false, lançar InvalidOperationException com mensagem clara ou retornar resultado que o controller traduz em 402/403. Manter o restante da lógica. Ao criar empresa, atribuir plan_id (ex.: plano padrão ou plano informado no request, se houver).

3. **UserService.CreateAsync**
   - Antes de criar o usuário e associá-lo à empresa: obter companyId do request (ou do usuário atual); chamar CanAddUserToCompanyAsync(companyId). Se false, lançar exceção com mensagem “Limite de usuários do plano atingido.” Controller: capturar e retornar 402 ou 403 com body { "message": "...", "code": "LIMIT_USERS_REACHED" }.

4. **Skills / Assessments (opcional na primeira leva)**
   - Se o plano tiver max_skills_per_company ou max_assessments_per_company, aplicar a mesma lógica nos serviços de criação de Skill e de Assessment. Caso contrário, deixar para fase 2.

5. **Frontend (opcional)**
   - Quando a API retornar 402/403 com code LIMIT_* ou message sobre limite, exibir mensagem amigável e link para “Fazer upgrade” ou “Fale com o suporte”, em vez de erro genérico.

6. **Documentar**
   - README ou Docs: “A API aplica limites por plano. Ao atingir o limite (ex.: usuários por empresa), a criação retorna 402 com mensagem e código identificável.”

### Arquivos a alterar

- backend: IPlanLimitService e implementação (ou lógica dentro dos serviços existentes); CompanyService, UserService; controllers (tratamento de exceção e retorno 402/403).
- frontend (opcional): tratamento de 402 no interceptor ou nas telas de criação.
- Docs.

### Critério de conclusão

- Com plano “Free” com max_users_per_company = 2: ao tentar criar o terceiro usuário na empresa, a API retorna 402 (ou 403) e a criação não é realizada.
- Com plan_id null ou plano com limite null, o comportamento permanece “ilimitado” (criação permitida).
- Mensagem de erro é clara e identificável para o frontend exibir upgrade.

---

## Item 3: Billing e assinatura (opcional)

### Objetivo

Introduzir **status de assinatura** por empresa (trial, active, past_due, cancelled) e, se desejado, integrar com um provedor de pagamento (Stripe, Mercado Pago, etc.) para cobrança recorrente, renovação e atualização de status via webhooks.

### Estado atual

- Não existe tabela de assinaturas nem integração com pagamento.

### O que fazer (visão geral para o agente)

1. **Modelo de dados**
   - Tabela `subscriptions` (ou ampliar `companies`): company_id, plan_id, status (enum ou varchar: trial, active, past_due, cancelled), current_period_start, current_period_end, external_subscription_id (id no provedor de pagamento), external_customer_id (opcional). Permite histórico se quiser: subscription_events (id, subscription_id, event_type, occurred_at, payload jsonb).
   - Migration para criar tabela e colunas necessárias.

2. **Regras de negócio**
   - Empresa com status trial ou active: pode usar o sistema normalmente dentro dos limites do plano. Status past_due: pode restringir (ex.: somente leitura) ou bloquear acesso até regularização. Status cancelled: acesso negado após current_period_end.
   - Middleware ou filter na API: após autenticação, obter company do usuário e status da assinatura; se cancelled ou past_due (conforme regra), retornar 402 e mensagem “Assinatura vencida ou cancelada.”

3. **Integração com provedor de pagamento**
   - Escolher um provedor (ex.: Stripe). Criar produto e preços no dashboard do provedor; configurar webhooks (customer.subscription.updated, invoice.paid, invoice.payment_failed). Endpoint na API: POST /webhooks/stripe (ou similar) que recebe o evento, valida assinatura do webhook, atualiza subscriptions (status, period_end) e opcionalmente subscription_events. Não expor lógica interna; usar secrets para chave do webhook.
   - Fluxo de “checkout”: endpoint ou página que redireciona o usuário para o provedor para criar assinatura (Checkout Session ou link de pagamento); após pagamento, o provedor chama o webhook e a API associa a empresa à assinatura e ao plano.

4. **Configuração e documentação**
   - Variáveis de ambiente: chave da API do provedor, webhook secret, IDs de preços/planos no provedor. README: como configurar billing; que planos existem e como mapear para limites no sistema.

### Arquivos a criar/alterar (resumo)

- database: migration subscriptions e eventos.
- backend: entidade Subscription; repositório; serviço de assinatura (status, renovação); controller de webhook; middleware/filter de verificação de assinatura; configuração do provedor.
- README e Docs: billing, webhooks, variáveis.

### Critério de conclusão

- Status de assinatura é persistido e consultado antes de permitir uso (ou apenas exibido no painel).
- Webhook do provedor atualiza status e período no banco; testes com eventos simulados funcionam.
- Empresa em trial ou active usa o sistema; empresa cancelled (após period_end) recebe 402 ao acessar recursos protegidos (se a regra for implementada).

---

## Ordem sugerida de execução

1. **Item 1 (Planos e limites – modelo)** – base para qualquer cobrança ou limite.
2. **Item 2 (Aplicação dos limites)** – torna os planos efetivos na API.
3. **Item 3 (Billing)** – opcional; implementar quando houver decisão de provedor e fluxo de cobrança.

Ao pedir a um agente: “Execute o Item N do plano em Docs/14-modelo-negocio-billing.md”.

---

## Referência rápida

| Item | Principais artefatos |
|------|----------------------|
| 1 | Tabela plans, companies.plan_id, entidade Plan, IPlanRepository, seed plano padrão |
| 2 | IPlanLimitService, checagem em CompanyService e UserService, 402/403 com mensagem |
| 3 | Tabela subscriptions, webhook do provedor, middleware de status, configuração de pagamento |

---

## Observação

O desenho exato dos planos (nomes, limites numéricos, preços) e a escolha do provedor de pagamento são decisões de negócio. Este documento descreve a **estrutura técnica** e os passos para um agente implementar; os valores concretos (ex.: “Plano Básico = 10 usuários”) devem ser definidos pelo produto e configurados no seed ou em configuração.
