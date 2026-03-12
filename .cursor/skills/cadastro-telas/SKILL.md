---
name: cadastro-telas
description: Define o padrão de layout e regras técnicas para criar ou ajustar telas de cadastro (formulários) no frontend da aplicação Matriz de Competência.
---

# Padrão de telas de cadastro

Use esta skill ao criar uma **nova tela de cadastro** (formulário de entidade) ou ao **revisar/ajustar** uma existente, para manter consistência com Empresa, Cargo, Colaborador, Competência e Time.

## Referências de implementação

- **Empresa:** `frontend/src/pages/CompanyFormPage.tsx`
- **Cargo (Role):** `frontend/src/pages/RoleFormPage.tsx`
- **Colaborador:** `frontend/src/pages/UserFormPage.tsx`
- **Competência:** `frontend/src/pages/SkillFormPage.tsx`
- **Time:** `frontend/src/pages/TeamFormPage.tsx`

---

## 1. Estrutura da página (layout)

A página deve ser um **formulário de criação/edição** com a seguinte estrutura, na ordem:

1. **Container raiz**
   - `<Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', minWidth: 0 }}>`
   - Garante altura mínima e evita overflow horizontal.

2. **PageHeader (fixo ao scroll)**
   - Importar e usar o componente `PageHeader` de `../components/PageHeader`.
   - Conteúdo do header: botão **Voltar** (`startIcon={<ArrowBackIcon />}`, `onClick` para cancelar/voltar à listagem) e **título** (`Typography variant='h5' fontWeight={700}`).
   - Título dinâmico: `{isEdit ? 'Editar [Entidade]' : 'Novo [Entidade]'}` (ex.: "Editar Cargo", "Novo Cargo").

3. **Alertas de erro (opcional)**
   - Se houver estado de erro (`errorMsg`), exibir `<Alert severity='error' sx={{ mb: 2 }} onClose={...}>` antes da área de conteúdo.

4. **Área de conteúdo (rolável)**
   - `<Box sx={{ flex: 1, mb: '80px' }}>` — o `mb: '80px'` reserva espaço para a barra fixa do rodapé.

5. **Paper principal do formulário**
   - Um ou mais `<Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>`.
   - O primeiro Paper deve conter o **cabeçalho visual** e os campos principais.

6. **Cabeçalho do Paper (identidade visual)**
   - No topo do primeiro Paper:
     - Um **Avatar** (padrão) ou um **Box** com ícone (ex.: Time usa Box + GroupsIcon).
     - **Avatar (padrão):**  
       `import { Avatar } from '@mui/material'`, `import { BRAND } from '../theme/ThemeProvider'`  
       `<Avatar sx={{ bgcolor: alpha(BRAND.cyan, 0.15), color: BRAND.cyan }}><[Icone] /></Avatar>`
     - **Título do bloco:**  
       `<Typography variant='h6' fontWeight={600}>Dados da [Entidade]</Typography>`  
       (ex.: "Dados do Cargo", "Dados da Empresa", "Dados do Colaborador", "Dados da Competência", "Dados do Time").
   - Layout do cabeçalho:  
     `<Box display='flex' alignItems='center' gap={1.5} mb={2.5}>` envolvendo Avatar (ou Box ícone) + Typography.

7. **Corpo do formulário**
   - Imediatamente após o cabeçalho do Paper:  
     `<Box display='flex' flexDirection='column' gap={2.5}>` (ou `gap={3}` se houver muitas seções).
   - Dentro desse Box: campos (TextField, Select, etc.), seções com `Divider` e `Typography variant='subtitle2'` para títulos de seção quando fizer sentido (ex.: "Dados Pessoais", "Empresa", "Perfil de Acesso").

8. **Barra fixa do rodapé (ações principais)**
   - Um **Paper** fixo no rodapé, com os botões **Cancelar** e **Salvar**:
   - `sx`: `position: 'fixed'`, `bottom: 0`, `left: 260`, `right: 0`, `px: 3`, `py: 1.5`, `display: 'flex'`, `justifyContent: 'flex-end'`, `gap: 2`, `zIndex: (t) => t.zIndex.appBar - 1`, `borderRadius: 0`, `bgcolor: (t) => alpha(t.palette.background.paper, 0.9)`, `backdropFilter: 'blur(12px)'`, `borderTop: (t) => 1px solid ${t.palette.divider}`.
   - Botões: **Cancelar** (navega para a listagem) e **Salvar** (`variant='contained'`, `startIcon={<SaveIcon />}`, `onClick={handleSave}`, `disabled={isSaving}`).

9. **Snackbars / modais**
   - Manter Snackbars (sucesso, erro) e modais fora do Paper principal, no mesmo nível do container raiz, se necessário.

---

## 2. Nomenclatura e rotas

- **Rotas:** `/entities` para listagem e `/entities/new`, `/entities/:id` para formulário (ex.: `/roles`, `/roles/new`, `/roles/:id`).
- **Título no menu:** em português (ex.: "Cargos", "Colaboradores", "Competências").
- **Título no header da página:** "Novo [Entidade]" / "Editar [Entidade]".
- **Título no Paper:** "Dados da [Entidade]" ou "Dados do [Entidade]" conforme a gramática (ex.: Dados do Cargo, Dados da Empresa).

---

## 3. Serviços, hooks e tipos

- **Backend:** controller REST (ex.: `GET /entities`, `GET /entities/:id`, `POST /entities`, `PUT /entities/:id`), serviço e repositório com escopo por perfil (Admin / Gestor / Coordenador) quando aplicável.
- **Frontend:**
  - **Tipos:** tipos TypeScript alinhados ao backend (ex.: `EntityResponse`, `CreateEntityRequest`, `UpdateEntityRequest`) em `frontend/src/types`.
  - **Serviço:** módulo em `frontend/src/services/` (ex.: `entityService`) com funções que chamam a API.
  - **Hooks (opcional):** hooks em `frontend/src/hooks/` para listagem, por-id, create e update (ex.: `useEntity`, `useCreateEntity`, `useUpdateEntity`) usando React Query quando fizer sentido.
- **Formulário:** estado local (useState) para campos; em edição, sincronizar estado a partir dos dados carregados (useEffect + flag `synced` para evitar sobrescritas). Validação no submit (ex.: `submitted` e mensagens de erro por campo).

---

## 4. Ícones e Avatar

- **Padrão:** Avatar com ícone MUI e `BRAND.cyan` (bgcolor com alpha 0.15, color BRAND.cyan).
- **Ícones por entidade (sugestão):** Empresa `BusinessIcon`, Cargo `WorkIcon`, Colaborador `PeopleIcon`, Competência `SchoolIcon`, Time `GroupsIcon`.
- **Variação aceita:** em vez de Avatar, um Box com ícone e cor alternativa (ex.: Time com `BRAND.purple`) para diferenciar visualmente, mantendo o mesmo layout (flex, gap, Typography h6).

---

## 5. Checklist para nova tela de cadastro

- [ ] Container raiz com `minHeight: 'calc(100vh - 112px)'` e `minWidth: 0`.
- [ ] PageHeader com botão Voltar e título "Novo X" / "Editar X".
- [ ] Área de conteúdo com `flex: 1` e `mb: '80px'`.
- [ ] Primeiro bloco em Paper com `p: 3`, `borderRadius: '16px'`, `mb: 3`.
- [ ] Cabeçalho do Paper: Avatar (ou Box ícone) + "Dados da/do [Entidade]".
- [ ] Campos dentro de um Box com `flexDirection: 'column'` e `gap` consistente.
- [ ] Barra fixa no rodapé com `left: 260`, Cancelar e Salvar.
- [ ] Rotas e menu em português; código (serviços, hooks, tipos) em inglês quando for nome técnico (ex.: Role para Cargo).
