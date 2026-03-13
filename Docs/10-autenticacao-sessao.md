# Plano: Autenticação e Sessão (403 e refresh token)

Documentação do quarto item da lista de melhorias para SaaS. Objetivo: tratar explicitamente o status HTTP 403 (Forbidden) no frontend e, em uma segunda etapa, implementar refresh token para reduzir a janela de risco do access token e melhorar a experiência de sessão longa.

---

## Contexto

Hoje:

- O **frontend** trata apenas **401**: limpa token e redireciona para `/login`. Não há tratamento específico para **403** (sem permissão para aquele recurso). O usuário pode ver apenas um erro genérico da requisição.
- A API usa apenas **access token JWT**; não há **refresh token**. Com expiração longa (ex.: 480 min), um token vazado permanece válido por muitas horas. Com expiração curta, o usuário é deslogado com frequência sem renovação transparente.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | Tratamento de 403 no frontend | Exibir mensagem clara de “Sem permissão” e, se desejado, redirecionar ou oferecer ação (ex.: voltar). |
| 2 | Refresh token (opcional / fase 2) | Endpoint de refresh, armazenamento seguro do refresh token no cliente, renovação automática do access token e rotação/revogação do refresh token. |

Cada seção abaixo é um **item executável** para um agente.

---

## Item 1: Tratamento de 403 no frontend

### Objetivo

Quando a API retornar 403 (Forbidden), o frontend deve tratar de forma explícita: exibir mensagem amigável (“Você não tem permissão para esta ação” ou similar) e não confundir com “não autenticado” (401). Opcionalmente: redirecionar para a home ou para uma página de “acesso negado”.

### Estado atual

**Arquivo:** [frontend/src/services/api.ts](frontend/src/services/api.ts)

```ts
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url    = err.config?.url as string | undefined

    if (status === 401) {
      if (url && url.includes('/auth/login')) {
        return Promise.reject(err)
      }
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)
```

Apenas 401 é tratado; 403 cai no `return Promise.reject(err)` e a chamada que fez a requisição (ex.: um hook ou página) pode mostrar apenas o erro bruto ou nada claro.

### O que fazer

1. **No interceptor de resposta (api.ts)**
   - Adicionar bloco `if (status === 403)`: não remover token nem redirecionar para login (o usuário está autenticado, só sem permissão).
   - Opções:
     - **A)** Apenas rejeitar a promise com um erro que carregue uma mensagem padronizada (ex.: `err.message = 'Você não tem permissão para esta ação.'`) para que os consumidores (páginas/hooks) possam exibir em Alert ou snackbar.
     - **B)** Além disso, exibir um toast/snackbar global (se existir um provider de notificação no app) com a mensagem de 403.
     - **C)** Redirecionar para uma rota dedicada (ex.: `/forbidden` ou `/acesso-negado`) com a mensagem, e opção “Voltar ao início”.
   - Recomendação: **A** + **B** se houver snackbar global; senão **A** + **C** (página simples de “Acesso negado” com link para `/`).

2. **Mensagem da API**
   - A API já pode retornar 403 com corpo (ex.: `{ "message": "Sem permissão para este recurso." }`). O frontend pode usar `err.response?.data?.message` quando existir, com fallback para a mensagem padrão.

3. **Página de acesso negado (se optar por C)**
   - Criar rota (ex.: `/forbidden`) e componente que mostre título “Acesso negado” e botão/link para voltar ao dashboard. Registrar a rota no [frontend/src/App.tsx](frontend/src/App.tsx). O interceptor, em caso de 403, faria `navigate('/forbidden')` (é preciso ter acesso ao `navigate`; pode ser via um singleton de navegação ou passando uma callback no interceptor configurada no bootstrap do app).

4. **Documentar**
   - Em Docs ou no código: “403 é tratado como ‘sem permissão’; o usuário permanece logado e vê mensagem clara ou é redirecionado para página de acesso negado.”

### Arquivos a alterar

- `frontend/src/services/api.ts` (tratamento 403, opcionalmente navegação)
- `frontend/src/App.tsx` (rota `/forbidden` ou similar, se criar página)
- Novo componente de página “Acesso negado” (opcional)
- README ou Docs (comportamento de 403)

### Critério de conclusão

- Uma requisição que retorna 403 não limpa o token nem redireciona para login.
- O usuário vê uma mensagem clara de “sem permissão” (em tela, snackbar ou página dedicada).
- Fluxo 401 continua como hoje (logout e redirecionamento para login).

---

## Item 2: Refresh token (fase 2 – opcional)

### Objetivo

Implementar renovação transparente do access token usando refresh token: o backend emite access token de curta duração e refresh token de longa duração; o frontend, ao receber 401 em requisição autenticada, tenta renovar o access token com o refresh token e repete a requisição; em caso de falha (refresh expirado ou revogado), faz logout.

### Estado atual

- **Backend:** apenas `POST /auth/login` retorna um JWT (access token). Não existe endpoint de refresh nem tabela/serviço para armazenar/validar refresh tokens.
- **Frontend:** armazena apenas `token` (e `user`) no localStorage; não há lógica de renovação.

### O que fazer (visão geral para documentação; o agente pode detalhar ao executar)

1. **Backend**
   - **Modelo de dados:** tabela ou armazenamento para refresh tokens (ex.: `user_id`, `token_hash`, `expires_at`, `revoked`). Ou usar apenas JWT de refresh (assinado com outra chave/claim) e blacklist na revogação.
   - **AuthController:** novo endpoint `POST /auth/refresh` que recebe body `{ "refreshToken": "..." }`. Validar refresh token (existência, não expirado, não revogado), opcionalmente rotacionar (invalidar o antigo e emitir um novo). Retornar novo `accessToken` (e opcionalmente novo `refreshToken`).
   - **Login:** além do access token, gerar e retornar `refreshToken` (e opcionalmente `expiresIn` para o refresh). Persistir o refresh token no backend se usar armazenamento.
   - **Logout (opcional):** endpoint `POST /auth/logout` que recebe o refresh token e o revoga (marca como usado/revogado).
   - **Segurança:** refresh token deve ser longo, aleatório, armazenado em hash no servidor; enviado apenas em HTTPS em produção.

2. **Frontend**
   - Armazenar `refreshToken` (ex.: em memória ou em cookie httpOnly se possível; senão localStorage com consciência do risco).
   - No interceptor de resposta: quando receber 401 em requisição que **não** seja login nem refresh, tentar chamar `POST /auth/refresh` com o refresh token. Se retornar 200, atualizar o access token no localStorage (e no header das próximas requisições) e reenviar a requisição original. Se refresh retornar 401/403, fazer logout (limpar token e refreshToken, redirecionar para login).
   - Evitar múltiplas renovações simultâneas (fila ou flag) quando várias requisições falharem com 401 ao mesmo tempo.
   - No login: guardar também o refreshToken e seu tempo de expiração (se a API informar).

3. **Configuração**
   - JWT access: reduzir expiração (ex.: 15–30 min). JWT refresh: expiração maior (ex.: 7 dias) e, se armazenado no DB, rotação a cada uso (opcional).

4. **Documentar**
   - README: descrever fluxo de refresh (quando o cliente usa refresh, quando faz logout). Variáveis de ambiente: se houver chave separada para assinatura do refresh token, documentar.

### Arquivos a alterar (resumo)

- Backend: novo endpoint e serviço de refresh; modelo/tabela de refresh tokens; alteração no login para retornar refresh token.
- Frontend: api.ts (interceptor com lógica de refresh e retry); armazenamento de refreshToken; logout limpa refreshToken.
- README e possivelmente [Docs/07-configuracao-seguranca-producao.md](Docs/07-configuracao-seguranca-producao.md) (não sobrescrever; apenas referenciar que há refresh token).

### Critério de conclusão

- Após expirar o access token, uma nova requisição autenticada dispara refresh automático e a requisição é reenviada com sucesso (sem o usuário precisar fazer login de novo).
- Se o refresh token estiver expirado ou revogado, o cliente faz logout e redireciona para login.
- Nenhum refresh token em texto plano é logado.

---

## Ordem sugerida de execução

1. **Item 1 (403 no frontend)** – independe e melhora a UX imediatamente.
2. **Item 2 (Refresh token)** – pode ser executado depois; exige mudanças no backend e no frontend.

Ao pedir a um agente: “Execute o Item 1 do plano em Docs/10-autenticacao-sessao.md” ou “Execute o Item 2 do plano em Docs/10-autenticacao-sessao.md”.

---

## Referência rápida de arquivos

| Arquivo | Itens |
|---------|--------|
| frontend/src/services/api.ts | 1, 2 |
| frontend/src/App.tsx | 1 (rota), 2 (logout) |
| frontend – página Acesso negado | 1 |
| backend AuthController / AuthService | 2 |
| backend – modelo e persistência refresh token | 2 |
| README / Docs | 1, 2 |
