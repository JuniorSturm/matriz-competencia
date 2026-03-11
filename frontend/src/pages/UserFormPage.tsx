import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Checkbox, FormControlLabel,
  FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Alert,
  Snackbar, FormHelperText, Divider,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import LockResetIcon from '@mui/icons-material/LockReset'
import { useUser, useCreateUser, useUpdateUser, useResetPassword } from '../hooks/useUsers'
import { useCargos, useNiveis } from '../hooks/useRoleGrade'
import { useAuth } from '../hooks/useAuth'
import { useCompanies } from '../hooks/useCompanies'
import PageHeader from '../components/PageHeader'
import type { CreateUserRequest, UpdateUserRequest } from '../types'

const EMPTY_CREATE: CreateUserRequest = {
  name: '', email: '', password: '', roleId: null, gradeId: null,
  isManager: false, isCoordinator: false, companyId: null,
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const sectionTitle = {
  color: 'text.secondary', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem', mb: 1.5,
} as const

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const { data: existingUser, isLoading: loadingUser } = useUser(id ?? '')
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const resetPwdMutation = useResetPassword()
  const { data: cargos = [] } = useCargos()
  const { data: niveis = [] } = useNiveis()
  const { user: loggedUser } = useAuth()

  const isLoggedAdmin = loggedUser?.isAdmin ?? false
  const isLoggedGestor = (loggedUser?.isManager ?? false) && !isLoggedAdmin
  const isLoggedCoordinator = (loggedUser?.isCoordinator ?? false) && !isLoggedAdmin && !(loggedUser?.isManager ?? false)

  const { data: companies = [] } = useCompanies(isLoggedAdmin)

  const [form, setForm] = useState<CreateUserRequest>(EMPTY_CREATE)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    name: '', roleId: null, gradeId: null, isManager: false, isCoordinator: false, companyId: null,
  })
  const [newPassword, setNewPassword] = useState('')
  const [synced, setSynced] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (isEdit && existingUser && !synced) {
    setEditForm({
      name: existingUser.name,
      roleId: existingUser.roleId,
      gradeId: existingUser.gradeId,
      isManager: existingUser.isManager,
      isCoordinator: existingUser.isCoordinator ?? false,
      companyId: existingUser.companyId,
    })
    setSynced(true)
  }

  const showProfileSection = isLoggedAdmin || isLoggedGestor
  const showCompanySelect = isLoggedAdmin

  const hasProfileCreate = form.isManager || (form.isCoordinator ?? false)
  const hasProfileEdit = editForm.isManager || (editForm.isCoordinator ?? false)
  const hasProfile = isEdit ? hasProfileEdit : hasProfileCreate

  const editingAdmin = isEdit && existingUser?.isAdmin === true
  const canResetPassword = isLoggedAdmin || isLoggedGestor

  const activeCompanies = companies.filter(c => c.isActive)

  const currentName = isEdit ? editForm.name : form.name
  const currentCompanyId = isEdit ? editForm.companyId : form.companyId
  const currentRoleId = isEdit ? editForm.roleId : form.roleId
  const currentGradeId = isEdit ? editForm.gradeId : form.gradeId

  if (isLoggedCoordinator && isEdit && existingUser && (existingUser.isManager || existingUser.isCoordinator || existingUser.isAdmin)) {
    return (
      <Box>
        <PageHeader>
          <Box display='flex' alignItems='center' gap={1}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} color='inherit'>Voltar</Button>
            <Typography variant='h5' fontWeight={700}>Editar Colaborador</Typography>
          </Box>
        </PageHeader>
        <Alert severity='error'>Você não tem permissão para editar este colaborador.</Alert>
      </Box>
    )
  }

  const handleSave = async () => {
    setSubmitted(true)
    if (!currentName.trim()) return

    if (isEdit && id) {
      if (!hasProfileEdit && (!editForm.roleId || !editForm.gradeId)) return
      if (showCompanySelect && !editingAdmin && !editForm.companyId) return
      await updateMutation.mutateAsync({ id, data: editForm })
    } else {
      if (!form.email.trim() || !isValidEmail(form.email)) return
      if (!form.password.trim()) return
      if (!hasProfileCreate && (!form.roleId || !form.gradeId)) return
      if (showCompanySelect && !form.companyId) return
      await createMutation.mutateAsync(form)
    }
    navigate('/users')
  }

  const handleResetPassword = async () => {
    if (!id || !newPassword.trim()) return
    await resetPwdMutation.mutateAsync({ id, data: { password: newPassword } })
    setNewPassword('')
    setPwdSuccess(true)
  }

  const handleProfileChange = (field: 'isManager' | 'isCoordinator', checked: boolean) => {
    if (isEdit) {
      const updated = { ...editForm, [field]: checked }
      if (updated.isManager || updated.isCoordinator) {
        updated.roleId = null
        updated.gradeId = null
      }
      setEditForm(updated)
    } else {
      const updated = { ...form, [field]: checked }
      if (updated.isManager || updated.isCoordinator) {
        updated.roleId = null
        updated.gradeId = null
      }
      setForm(updated)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingUser) return <CircularProgress />
  if (isEdit && !existingUser && !loadingUser) return <Alert severity='error'>Colaborador não encontrado.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', pr: 3 }}>
      <PageHeader>
        <Box display='flex' alignItems='center' gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} color='inherit'>
            Voltar
          </Button>
          <Typography variant='h5' fontWeight={700}>
            {isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
          </Typography>
        </Box>
      </PageHeader>

      <Box sx={{ flex: 1, mb: '80px' }}>
        <Box display='flex' flexDirection='column' gap={3}>

          {/* ── Dados Pessoais ── */}
          <Box>
            <Typography variant='subtitle2' sx={sectionTitle}>Dados Pessoais</Typography>
            <Box display='flex' flexDirection='column' gap={2}>
              <TextField
                label='Nome'
                value={currentName}
                onChange={(e) => isEdit
                  ? setEditForm({ ...editForm, name: e.target.value })
                  : setForm({ ...form, name: e.target.value })
                }
                fullWidth
                required
                error={submitted && !currentName.trim()}
                helperText={submitted && !currentName.trim() ? 'Campo obrigatório' : ''}
              />
              {!isEdit && (
                <>
                  <TextField
                    label='E-mail'
                    type='email'
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    fullWidth
                    required
                    error={submitted && (!form.email.trim() || !isValidEmail(form.email))}
                    helperText={
                      submitted && !form.email.trim()
                        ? 'Campo obrigatório'
                        : submitted && !isValidEmail(form.email)
                          ? 'E-mail inválido'
                          : ''
                    }
                  />
                  <TextField
                    label='Senha'
                    type='password'
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    fullWidth
                    required
                    error={submitted && !form.password.trim()}
                    helperText={submitted && !form.password.trim() ? 'Campo obrigatório' : ''}
                  />
                </>
              )}
            </Box>
          </Box>

          {/* ── Empresa ── */}
          {showCompanySelect && !editingAdmin && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' sx={sectionTitle}>Empresa</Typography>
                <FormControl fullWidth required error={submitted && !currentCompanyId}>
                  <InputLabel>Empresa</InputLabel>
                  <Select
                    label='Empresa'
                    value={currentCompanyId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null
                      isEdit
                        ? setEditForm({ ...editForm, companyId: val })
                        : setForm({ ...form, companyId: val })
                    }}
                  >
                    <MenuItem value=''><em>Selecione...</em></MenuItem>
                    {activeCompanies.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                  {submitted && !currentCompanyId && <FormHelperText>Campo obrigatório</FormHelperText>}
                </FormControl>
              </Box>
            </>
          )}

          {/* ── Perfil de Acesso ── */}
          {showProfileSection && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' sx={sectionTitle}>Perfil de Acesso</Typography>
                <Typography variant='caption' color='text.secondary' sx={{ mb: 1, display: 'block' }}>
                  Quando nenhum perfil for selecionado, o colaborador terá acesso como usuário comum.
                </Typography>
                <Box display='flex' flexDirection='column'>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isEdit ? editForm.isManager : form.isManager}
                        onChange={(e) => handleProfileChange('isManager', e.target.checked)}
                      />
                    }
                    label='Gestor'
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isEdit ? (editForm.isCoordinator ?? false) : (form.isCoordinator ?? false)}
                        onChange={(e) => handleProfileChange('isCoordinator', e.target.checked)}
                      />
                    }
                    label='Coordenador'
                  />
                </Box>
              </Box>
            </>
          )}

          {/* ── Cargo e Nível ── */}
          {!hasProfile && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' sx={sectionTitle}>Cargo e Nível</Typography>
                <Box display='flex' flexDirection='column' gap={2}>
                  <FormControl fullWidth required error={submitted && !currentRoleId}>
                    <InputLabel>Cargo</InputLabel>
                    <Select
                      label='Cargo'
                      value={currentRoleId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null
                        isEdit
                          ? setEditForm({ ...editForm, roleId: val })
                          : setForm({ ...form, roleId: val })
                      }}
                    >
                      <MenuItem value=''><em>Nenhum</em></MenuItem>
                      {cargos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                    </Select>
                    {submitted && !currentRoleId && <FormHelperText>Campo obrigatório</FormHelperText>}
                  </FormControl>
                  <FormControl fullWidth required error={submitted && !currentGradeId}>
                    <InputLabel>Nível</InputLabel>
                    <Select
                      label='Nível'
                      value={currentGradeId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null
                        isEdit
                          ? setEditForm({ ...editForm, gradeId: val })
                          : setForm({ ...form, gradeId: val })
                      }}
                    >
                      <MenuItem value=''><em>Nenhum</em></MenuItem>
                      {niveis.map((n) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                    </Select>
                    {submitted && !currentGradeId && <FormHelperText>Campo obrigatório</FormHelperText>}
                  </FormControl>
                </Box>
              </Box>
            </>
          )}

          {/* ── Redefinir Senha (edit only) ── */}
          {isEdit && canResetPassword && (
            <>
              <Divider />
              <Box>
                <Typography variant='subtitle2' sx={sectionTitle}>Redefinir Senha</Typography>
                <Box display='flex' gap={1} alignItems='flex-start'>
                  <TextField
                    label='Nova Senha'
                    type='password'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    size='small'
                  />
                  <Button
                    variant='outlined'
                    startIcon={<LockResetIcon />}
                    onClick={handleResetPassword}
                    disabled={!newPassword.trim() || resetPwdMutation.isPending}
                    sx={{ whiteSpace: 'nowrap', minWidth: 160 }}
                  >
                    Redefinir
                  </Button>
                </Box>
              </Box>
            </>
          )}

        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 260,
          right: 0,
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          zIndex: (t) => t.zIndex.appBar - 1,
          borderRadius: 0,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
          backdropFilter: 'blur(12px)',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Button onClick={() => navigate('/users')}>Cancelar</Button>
        <Button
          variant='contained'
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
        >
          Salvar
        </Button>
      </Paper>

      <Snackbar
        open={pwdSuccess}
        autoHideDuration={3000}
        onClose={() => setPwdSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setPwdSuccess(false)} severity='success' variant='filled'>
          Senha redefinida com sucesso!
        </Alert>
      </Snackbar>
    </Box>
  )
}
