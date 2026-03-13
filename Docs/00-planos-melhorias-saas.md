# Índice dos planos de melhorias para SaaS

Lista dos documentos de plano para distribuição do sistema como SaaS. Cada plano pode ser executado por um agente em momento oportuno; use o número do documento e o número do item ao solicitar.

| # | Documento | Conteúdo |
|---|-----------|----------|
| 07 | [07-configuracao-seguranca-producao.md](07-configuracao-seguranca-producao.md) | CORS configurável, JWT por ambiente, AllowedHosts |
| 08 | [08-limites-consistencia.md](08-limites-consistencia.md) | Teto de pageSize, revisão de companyId null (isolamento) |
| 09 | [09-operacao-observabilidade.md](09-operacao-observabilidade.md) | Health check, rate limiting, logging estruturado |
| 10 | [10-autenticacao-sessao.md](10-autenticacao-sessao.md) | Tratamento 403 no frontend, refresh token (opcional) |
| 11 | [11-testes.md](11-testes.md) | Testes unitários (Application), integração (API), frontend (opcional) |
| 12 | [12-ci-cd.md](12-ci-cd.md) | Pipeline CI (build, testes, lint), CD (build e push de imagens) |
| 13 | [13-onboarding-self-service.md](13-onboarding-self-service.md) | Signup público (empresa + primeiro usuário), convites por e-mail |
| 14 | [14-modelo-negocio-billing.md](14-modelo-negocio-billing.md) | Planos e limites, aplicação na API, billing/assinatura (opcional) |

**Ordem sugerida de execução (visão geral):** 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14. Dentro de cada documento, a ordem dos itens está descrita no próprio arquivo.

**Como solicitar a um agente:**  
"Execute o Item 1 do plano em Docs/08-limites-consistencia.md"  
"Execute os itens 1 e 2 do plano em Docs/09-operacao-observabilidade.md"
