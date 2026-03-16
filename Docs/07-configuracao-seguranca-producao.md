# Plano: Configuração e Segurança em Produção

Documentação do primeiro item da lista de melhorias para distribuição do sistema como SaaS. Objetivo: deixar CORS, JWT e AllowedHosts configuráveis por ambiente e seguros em produção, para que um agente possa executar cada item em momento oportuno.

---

## Contexto

Hoje a API tem:

- **CORS** com origens fixas em código (`localhost:5173`, `5175`, `3000`).
- **JWT Secret** definido em `appsettings.json` (e repetido no `docker-compose.yml`), o que não é seguro em produção.
- **AllowedHosts** como `"*"`, aceitando qualquer Host header.

Em produção é necessário:

1. CORS configurável (origens permitidas por ambiente).
2. JWT Secret (e preferencialmente Issuer/Audience) somente por variável de ambiente em produção.
3. AllowedHosts restrito aos domínios reais do produto.

---

## Escopo do plano

| # | Item | Objetivo |
|---|------|----------|
| 1 | CORS configurável | Origem(s) permitida(s) vindas de configuração/ambiente, não hardcoded. |
| 2 | JWT por ambiente | Secret (e opcionalmente Issuer/Audience) via env em produção; remover valor padrão sensível do appsettings base. |
| 3 | AllowedHosts por ambiente | Valor restrito em produção; documentar variável de ambiente. |

Cada seção abaixo descreve um **item executável**: ao pedir a um agente “executar o item X do plano 07-configuracao-seguranca-producao”, use o texto dessa seção como especificação.

---

## Item 1: CORS configurável

### Objetivo

As origens CORS devem ser definidas por configuração (appsettings ou variáveis de ambiente), não fixas no código. Em desenvolvimento continuam permitidos localhost; em produção só os domínios configurados.

### Estado atual

**Arquivo:** `backend/src/CompetencyMatrix.API/Program.cs` (trecho relevante):

```csharp
// ─── CORS (permitir frontend em dev) ─────────────────────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:5175", "http://localhost:3000")
     .AllowAnyMethod()
     .AllowAnyHeader()
));
```

### O que fazer

1. **Adicionar configuração de CORS**
   - Em `appsettings.json`: criar chave `Cors:AllowedOrigins` com valor string (ex.: `"http://localhost:5173;http://localhost:5175;http://localhost:3000"`), separando múltiplas origens por `;`.
   - Em `appsettings.Development.json`: pode repetir ou sobrescrever com os mesmos valores de localhost para não quebrar o dev local.

2. **Ler CORS no `Program.cs`**
   - Ler `builder.Configuration["Cors:AllowedOrigins"]`.
   - Se estiver vazio ou nulo, usar fallback para desenvolvimento: `"http://localhost:5173;http://localhost:5175;http://localhost:3000"` (apenas quando `IsDevelopment()` ou quando a chave não existir — critério: se a string estiver vazia, usar o fallback).
   - Fazer `Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)` e passar o array para `WithOrigins(...)`.
   - Manter `AllowAnyMethod()` e `AllowAnyHeader()` (ou documentar se no futuro quiser restringir).

3. **Documentar variável de ambiente**
   - No README (seção de variáveis de ambiente da API), documentar: `Cors__AllowedOrigins` (ex.: `https://app.seudominio.com;https://admin.seudominio.com`). Em Docker/dotnet, `__` substitui `:` (ex.: `Cors__AllowedOrigins`).

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/appsettings.json`
- `backend/src/CompetencyMatrix.API/appsettings.Development.json` (opcional, para deixar explícito em dev)
- `backend/src/CompetencyMatrix.API/Program.cs`
- `README.md` (tabela de variáveis de ambiente da API)

### Critério de conclusão

- Em desenvolvimento, sem definir `Cors__AllowedOrigins`, o frontend em localhost continua conseguindo chamar a API.
- Definindo `Cors__AllowedOrigins=https://app.exemplo.com`, apenas essa origem é aceita; requisições de outros origens recebem CORS negado.

---

## Item 2: JWT por ambiente (Secret e opcionalmente Issuer/Audience)

### Objetivo

Em produção o JWT Secret **nunca** deve vir do `appsettings.json` commitado; deve vir apenas de variável de ambiente. Opcionalmente, Issuer e Audience também por ambiente. O `appsettings.json` base não deve conter valor real de secret (pode ter placeholder ou ficar vazio na chave).

### Estado atual

**Arquivo:** `backend/src/CompetencyMatrix.API/appsettings.json`:

```json
"Jwt": {
  "Secret": "CHANGE_ME_TO_A_VERY_LONG_SECRET_KEY_AT_LEAST_32_CHARS",
  "Issuer": "CompetencyMatrix",
  "Audience": "CompetencyMatrix",
  "ExpiryMinutes": "480"
}
```

**Arquivo:** `backend/src/CompetencyMatrix.API/Program.cs`:

```csharp
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret not configured.");
```

**Arquivo:** `backend/src/CompetencyMatrix.Infrastructure/Security/JwtService.cs`: lê `Jwt:Secret`, `Jwt:Issuer`, `Jwt:Audience`, `Jwt:ExpiryMinutes` de `IConfiguration`. O fluxo de refresh token (Doc 10) usa ainda `Jwt:RefreshExpiryDays`; ver README e Docs/10-autenticacao-sessao.md.

**Arquivo:** `docker-compose.yml`: define `Jwt__Secret`, `Jwt__Issuer`, etc., para o serviço `api`.

### O que fazer

1. **Remover valor padrão de Secret do appsettings base**
   - Em `appsettings.json`: remover a chave `Secret` de `Jwt` ou deixar vazia: `"Secret": ""`. Assim, em produção (sem env) a aplicação falha de forma explícita se ninguém configurar.
   - Manter em `appsettings.Development.json` um valor **apenas para desenvolvimento** (ex.: um placeholder longo), ou documentar que em dev é obrigatório setar `Jwt__Secret` (ou usar appsettings.Development com valor de dev). O importante: **nunca** commitar um secret real.

2. **Garantir que produção use variável de ambiente**
   - O ASP.NET Core já lê `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpiryMinutes` quando definidos como env (substituindo `:` por `__`). Não é obrigatório alterar código se já usar `builder.Configuration["Jwt:Secret"]` etc.; basta não ter valor em appsettings em produção e setar as env no host/container.
   - Opcional: em `Program.cs`, em ambiente Production, exigir explicitamente que `Jwt:Secret` não seja valor de placeholder (ex.: não ser "CHANGE_ME_..."). Se o time preferir, pode apenas remover o valor do JSON e documentar.

3. **Docker Compose**
   - No `docker-compose.yml`, manter o exemplo com placeholder apenas para subir o stack; adicionar comentário no arquivo dizendo que em produção o secret **deve** ser substituído por variável de ambiente (ou por um arquivo env não versionado).

4. **Documentação**
   - No README, na seção de variáveis de ambiente da API, deixar explícito que `Jwt__Secret` é **obrigatório em produção** e não deve ser o valor de exemplo. Mínimo 32 caracteres.

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/appsettings.json` (remover ou esvaziar `Jwt:Secret`)
- `backend/src/CompetencyMatrix.API/appsettings.Development.json` (valor de dev apenas para local, ou instrução)
- `docker-compose.yml` (comentário de que em produção trocar o secret)
- `README.md` (reforçar obrigatoriedade e tamanho mínimo do secret)

### Critério de conclusão

- Com `Jwt:Secret` vazio ou ausente no appsettings e sem variável `Jwt__Secret`, a API não inicia (erro claro).
- Em produção, ao definir `Jwt__Secret` (e opcionalmente Issuer/Audience) por variável de ambiente, login e uso de JWT funcionam normalmente.
- Nenhum secret real fica em repositório.

---

## Item 3: AllowedHosts por ambiente

### Objetivo

Restringir `AllowedHosts` em produção aos domínios que realmente servem a aplicação, em vez de `"*"`. Em desenvolvimento pode permanecer `"*"` ou localhost.

### Estado atual

**Arquivo:** `backend/src/CompetencyMatrix.API/appsettings.json`:

```json
"AllowedHosts": "*"
```

### O que fazer

1. **Configuração por ambiente**
   - Em `appsettings.json`: manter `"*"` como padrão (comportamento atual), ou remover a chave (ASP.NET Core então não valida host).
   - Em `appsettings.Production.json`: criar arquivo (se não existir) com `"AllowedHosts": "seudominio.com;www.seudominio.com;api.seudominio.com"` (exemplo). Múltiplos hosts separados por `;`. Em produção real, o valor deve ser preenchido conforme os domínios usados (frontend e API, se aplicável).
   - Alternativa: não criar `appsettings.Production.json` e documentar que em produção se deve setar a variável de ambiente `AllowedHosts` (ex.: `AllowedHosts=seudominio.com;www.seudominio.com`). O ASP.NET Core lê essa chave da configuração.

2. **Documentação**
   - No README, documentar a variável `AllowedHosts` (ou a chave em appsettings.Production): explicar que em produção deve listar os domínios permitidos separados por `;` e que `*` desabilita a validação (não recomendado em produção).

### Arquivos a alterar

- `backend/src/CompetencyMatrix.API/appsettings.json` (deixar `*` ou documentar que produção sobrescreve)
- `backend/src/CompetencyMatrix.API/appsettings.Production.json` (criar com valores de exemplo e comentário para substituir)
- `README.md` (seção de variáveis de ambiente ou de deploy)

### Critério de conclusão

- Em Development, a API continua acessível normalmente (AllowedHosts `*` ou não restritivo).
- Em Production, com AllowedHosts configurado para um domínio específico, requisições com Host header diferente são rejeitadas (resposta 400 Bad Request com mensagem de host não permitido).

---

## Ordem sugerida de execução

1. **Item 1 (CORS)** — independe dos outros.  
2. **Item 2 (JWT)** — independe; pode ser feito em seguida.  
3. **Item 3 (AllowedHosts)** — independe; pode ser feito por último.

Qualquer item pode ser solicitado a um agente de forma isolada (ex.: “Execute o Item 1 do plano em Docs/07-configuracao-seguranca-producao.md”).

---

## Resumo das variáveis de ambiente (para README)

Após executar os três itens, a tabela de variáveis de ambiente da API pode incluir:

| Variável | Descrição | Obrigatório em produção | Exemplo |
|----------|-----------|--------------------------|---------|
| `ConnectionStrings__Default` | Connection string PostgreSQL | Sim | `Host=...;Database=...` |
| `Jwt__Secret` | Chave JWT (mín. 32 caracteres) | Sim | — (nunca usar valor de exemplo) |
| `Jwt__Issuer` | Emissor JWT | Não (padrão: CompetencyMatrix) | CompetencyMatrix |
| `Jwt__Audience` | Audiência JWT | Não (padrão: CompetencyMatrix) | CompetencyMatrix |
| `Jwt__ExpiryMinutes` | Expiração do token em minutos | Não (padrão: 480) | 480 |
| `Cors__AllowedOrigins` | Origens CORS permitidas (`;` separador) | Sim em produção | `https://app.seudominio.com` |
| `AllowedHosts` | Hosts permitidos (`;` separador) | Recomendado em produção | `app.seudominio.com;api.seudominio.com` |

---

## Referência rápida de arquivos

| Arquivo | Itens que o alteram |
|---------|----------------------|
| `backend/src/CompetencyMatrix.API/Program.cs` | 1 (CORS) |
| `backend/src/CompetencyMatrix.API/appsettings.json` | 1, 2, 3 |
| `backend/src/CompetencyMatrix.API/appsettings.Development.json` | 1, 2 |
| `backend/src/CompetencyMatrix.API/appsettings.Production.json` | 3 |
| `docker-compose.yml` | 2 (comentário) |
| `README.md` | 1, 2, 3 (tabela e texto) |

Nenhuma alteração é necessária em `JwtService.cs` desde que a configuração seja fornecida por Configuration (appsettings + env), como já é hoje.
