# Plano: CI/CD (pipeline de build, testes e deploy)

Documentação do sexto item da lista de melhorias para SaaS. Objetivo: automatizar build, análise estática, testes e (opcionalmente) deploy em ambiente de staging ou produção, para reduzir erros de integração e garantir que cada alteração seja validada antes de ir ao ar.

---

## Contexto

Hoje não existe pipeline de CI/CD no repositório (nenhum diretório `.github/workflows`, `.azure-pipelines`, `.gitlab-ci.yml` ou similar). O build e os testes são executados manualmente. Para SaaS, um pipeline que rode em todo push/PR aumenta a confiança e permite deploy automatizado ou por aprovação.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Pipeline de CI (build e testes) | Em todo push/PR: build do backend, build do frontend, execução dos testes do backend (e opcionalmente do frontend). Falha se algum passo falhar. |
| 2 | Análise estática e qualidade | Incluir lint (backend: dotnet format ou StyleCop; frontend: eslint) e opcionalmente análise de segurança (ex.: dependências). |
| 3 | CD – deploy (opcional) | Após CI verde, build de imagens Docker e push para registro; deploy em staging (ou produção) via job manual ou tag. |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Pipeline de CI (build e testes)

### Objetivo

Definir um workflow (ex.: GitHub Actions) que, em cada push para as branches principais e em todo pull request, execute: restore e build do backend (.NET), restore e build do frontend (npm), e testes do backend (`dotnet test`). O pipeline deve falhar se o build ou os testes falharem.

### Estado atual

- Repositório não possui `.github/workflows` (ou outro provedor de CI).
- Backend: [backend/CompetencyMatrix.slnx](backend/CompetencyMatrix.slnx); comando de build: `dotnet build` no diretório backend; testes: `dotnet test` (após existir projeto de testes conforme [Docs/11-testes.md](Docs/11-testes.md)).
- Frontend: [frontend/package.json](frontend/package.json); build: `npm ci` e `npm run build`; testes: `npm run test:run` (quando configurado no plano 11).

### O que fazer

1. **Criar workflow de CI (GitHub Actions)**
   - Arquivo: `.github/workflows/ci.yml` (ou `build.yml`).
   - Trigger: `push` nas branches `main` e `master` (e opcionalmente `develop`); `pull_request` para as mesmas branches.
   - Jobs:
     - **Backend:** job `backend` com runner `ubuntu-latest`. Steps: checkout, setup .NET 8 (`actions/setup-dotnet@v4` com `dotnet-version: '8.0.x'`), `run: dotnet restore` no diretório backend (ou `dotnet restore backend/CompetencyMatrix.slnx`), `run: dotnet build --no-restore -c Release`, `run: dotnet test --no-build -c Release --verbosity normal`. Working directory: backend (ou paths relativos à raiz).
     - **Frontend:** job `frontend` com runner `ubuntu-latest`. Steps: checkout, setup Node (ex.: `actions/setup-node@v4` com `node-version: '20'` e `cache: 'npm'` com diretório `frontend`), `run: npm ci` e `run: npm run build` no diretório `frontend`. Opcional: `run: npm run test:run` se existir (plano 11 Item 3); se não existir, omitir ou deixar step que não falhe.
   - Os dois jobs podem rodar em paralelo (matrix não é obrigatório). Dependências: nenhuma entre backend e frontend para apenas build; para testes de integração que usem Docker (Testcontainers), o runner precisa ter Docker disponível (GitHub-hosted runners têm).

2. **Testes de integração**
   - Se o projeto de integração (plano 11 Item 2) usar Testcontainers, o job `backend` já rodará em ambiente com Docker. Garantir que `dotnet test` inclua o projeto de integração e que os testes não falhem por timeout ou falta de Docker (no GitHub Actions, Docker está disponível).

3. **Cache**
   - Backend: `actions/cache` com chave baseada em `**/packages.lock.json` ou arquivos .csproj para restaurar pacotes NuGet.
   - Frontend: `cache: 'npm'` no setup-node com path `frontend` para node_modules.

4. **Documentar**
   - README: seção “CI” indicando que o projeto usa GitHub Actions (ou o provedor escolhido); em todo PR/push na main o build e os testes são executados; link para as ações (badge opcional).

### Arquivos a criar/alterar

- Novo: `.github/workflows/ci.yml` (ou nome escolhido).
- README.md (seção CI).

### Critério de conclusão

- Push (ou PR) na branch configurada dispara o workflow.
- Job backend: build Release e `dotnet test` executam e passam (quando os testes existirem).
- Job frontend: `npm ci` e `npm run build` executam e passam.
- Se o build ou os testes falharem, o workflow fica vermelho e o PR pode ser bloqueado (configuração de branch protection é feita no repositório, não no YAML).

---

## Item 2: Análise estática e qualidade

### Objetivo

Incluir no pipeline (ou em job separado) etapas de lint e formatação para manter padrão de código e detectar problemas antes do merge.

### Estado atual

- Backend: não há configuração explícita de dotnet format ou analisadores no csproj (podem existir analisadores padrão).
- Frontend: [frontend/eslint.config.js](frontend/eslint.config.js) existe; script `npm run lint` no package.json.

### O que fazer

1. **Frontend**
   - No workflow de CI, no job frontend, adicionar step: `run: npm run lint` no diretório frontend. Se falhar, o job falha. Garantir que o eslint esteja configurado para o diretório correto (já existe `npm run lint`).

2. **Backend**
   - Opção A: adicionar step `run: dotnet format --verify-no-changes` no diretório backend (requer `dotnet format` como ferramenta ou pacote). Se houver diferenças, o step falha (obriga formatação antes do commit).
   - Opção B: apenas build; não adicionar format na primeira versão e documentar como melhoria futura.
   - Recomendação: incluir pelo menos o step de lint do frontend; backend format opcional.

3. **Segurança de dependências (opcional)**
   - GitHub: Dependabot ou “Dependency review” em PRs; ou step com `dotnet list package --vulnerable` e `npm audit --audit-level=high` (falhar apenas se nível high/critical). Documentar em README se for usado.

### Arquivos a alterar

- `.github/workflows/ci.yml` (adicionar steps de lint e opcionalmente format/audit).
- README (mencionar que o CI inclui lint).

### Critério de conclusão

- O pipeline inclui execução de lint do frontend e falha se o lint falhar.
- Opcional: backend com dotnet format ou audit de pacotes; documentado.

---

## Item 3: CD – deploy (opcional)

### Objetivo

Após a CI estar verde, construir imagens Docker da API e do frontend, enviar para um registro (Docker Hub, GitHub Container Registry, ou Azure ACR) e, opcionalmente, disparar deploy em ambiente de staging (ou produção) quando houver tag ou quando a branch main for atualizada.

### Estado atual

- [docker-compose.yml](docker-compose.yml) na raiz: build da API (backend) e do frontend; não há pipeline que faça push de imagens.
- [backend/Dockerfile](backend/Dockerfile) e [frontend/Dockerfile](frontend/Dockerfile) existem.

### O que fazer

1. **Workflow de CD (separado ou no mesmo arquivo com job condicional)**
   - Trigger: push em tags `v*` (ex.: `v1.0.0`) ou push na branch `main` (deploy para staging). Evitar deploy em todo push se não houver ambiente de staging; preferir deploy apenas em tag ou em branch `release/*`.
   - Job **build-and-push:** depende do job de CI (ou repete build). Steps: checkout, login no registro (ex.: `docker/login-action` para GHCR com `GITHUB_TOKEN`), build das imagens com tag (ex.: `sha-${GITHUB_SHA}` e `latest`), push para o registro. Build: `docker build -t registry/repo-api:tag ./backend` e `docker build -t registry/repo-frontend:tag ./frontend`. Variáveis: nome do registro e repositório configuráveis por secrets (ex.: `REGISTRY`, `IMAGE_API`, `IMAGE_FRONTEND`).

2. **Deploy em ambiente**
   - Opção A: job que chame SSH, kubectl ou API do provedor de nuvem para atualizar o ambiente (staging) com as novas imagens. Requer secrets (chaves, kubeconfig, etc.).
   - Opção B: apenas build e push; o deploy é feito manualmente ou por ferramenta externa (Argo CD, Azure DevOps release, etc.). Documentar no README como fazer deploy a partir das imagens.
   - Recomendação para primeira versão: **apenas build e push** (Item 3 mínimo); deploy em servidor fica como passo manual ou plano futuro.

3. **Documentar**
   - README: onde as imagens são publicadas (GHCR/Docker Hub), quais tags são usadas, e como rodar em produção (ex.: `docker-compose -f docker-compose.prod.yml pull && docker-compose up -d`). Mencionar que em produção é obrigatório configurar variáveis de ambiente (ver plano 07).

### Arquivos a criar/alterar

- Novo: `.github/workflows/cd.yml` (ou extensão do ci.yml com job `deploy` condicional).
- README: seção Deploy / Publicação de imagens.

### Critério de conclusão

- Ao criar uma tag (ex.: `v1.0.0`) ou ao fazer push na branch configurada, as imagens da API e do frontend são construídas e enviadas ao registro configurado.
- Secrets (registro, tokens) não estão no código; workflow usa secrets do repositório.
- Documentação descreve como usar as imagens para deploy.

---

## Ordem sugerida de execução

1. **Item 1 (CI – build e testes)** – primeiro; garante que o resto do pipeline tenha base estável.
2. **Item 2 (Lint e qualidade)** – em seguida, no mesmo workflow ou em job adicional.
3. **Item 3 (CD)** – por último, quando houver registro e ambiente definidos.

Ao pedir a um agente: “Execute o Item N do plano em Docs/12-ci-cd.md”.

---

## Referência rápida

| Item | Arquivos principais |
|------|---------------------|
| 1 | .github/workflows/ci.yml |
| 2 | .github/workflows/ci.yml (steps adicionais), frontend/package.json (lint) |
| 3 | .github/workflows/cd.yml, README |

---

## Observação sobre provedor de CI

Este plano descreve a lógica em termos de **GitHub Actions**. Se o repositório usar Azure DevOps, GitLab CI ou outro provedor, o agente deve adaptar: mesmos passos (restore, build, test, lint, build Docker, push), com a sintaxe e os serviços do provedor escolhido. Manter a documentação em Docs atualizada com o provedor real.
