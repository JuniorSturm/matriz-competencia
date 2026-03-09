import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Checkbox, FormControlLabel,
  FormControl, InputLabel, Select, MenuItem, Paper, CircularProgress, Alert,
  Snackbar, FormHelperText,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import LockResetIcon from '@mui/icons-material/LockReset'
import { useUser, useCreateUser, useUpdateUser, useResetPassword } from '../hooks/useUsers'
import { useCargos, useNiveis } from '../hooks/useRoleGrade'
import { useAuth } from '../hooks/useAuth'
import type { CreateUserRequest, UpdateUserRequest } from '../types'

const EMPTY_CREATE: CreateUserRequest = {
  name: '', email: '', password: '', roleId: null, gradeId: null, isManager: false,
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

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

  const [form, setForm] = useState<CreateUserRequest>(EMPTY_CREATE)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({ name: '', roleId: null, gradeId: null, isManager: false })
  const [newPassword, setNewPassword] = useState('')
  const [synced, setSynced] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Adjust state during render (recommended React pattern)
  if (isEdit && existingUser && !synced) {
    setEditForm({
      name: existingUser.name,
      roleId: existingUser.roleId,
      gradeId: existingUser.gradeId,
      isManager: existingUser.isManager,
    })
    setSynced(true)
  }

  const handleSave = async () => {
    setSubmitted(true)

    if (isEdit && id) {
      // Edit mode: name required; if not editing a manager, cargo + nivel required
      if (!editForm.name.trim()) return
      if (!editingManager && (!editForm.roleId || !editForm.gradeId)) return
      await updateMutation.mutateAsync({ id, data: editForm })
    } else {
      // Create mode validations
      if (!form.name.trim()) return
      if (!form.email.trim() || !isValidEmail(form.email)) return
      if (!form.password.trim()) return
      if (!form.isManager && (!form.roleId || !form.gradeId)) return
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

  const handleCancel = () => navigate('/users')

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isManager = loggedUser?.isManager ?? false
  const editingManager = isEdit && existingUser?.isManager === true

  if (isEdit && loadingUser) return <CircularProgress />
  if (isEdit && !existingUser && !loadingUser) return <Alert severity='error'>Colaborador não encontrado.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)' }}>
      <Box display='flex' alignItems='center' gap={1} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} color='inherit'>
          Voltar
        </Button>
        <Typography variant='h5' fontWeight={700}>
          {isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, mb: '80px' }}>
        <Box display='flex' flexDirection='column' gap={2.5}>
          {isEdit ? (
            <>
              <TextField
                label='Nome'
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                fullWidth
                required
                error={submitted && !editForm.name.trim()}
                helperText={submitted && !editForm.name.trim() ? 'Campo obrigatório' : ''}
              />
              {!editingManager && (
                <>
                  <FormControl fullWidth required error={submitted && !editForm.roleId}>
                    <InputLabel>Cargo</InputLabel>
                    <Select
                      label='Cargo'
                      value={editForm.roleId ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <MenuItem value=''><em>Nenhum</em></MenuItem>
                      {cargos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                    </Select>
                    {submitted && !editForm.roleId && <FormHelperText>Campo obrigatório</FormHelperText>}
                  </FormControl>
                  <FormControl fullWidth required error={submitted && !editForm.gradeId}>
                    <InputLabel>Nível</InputLabel>
                    <Select
                      label='Nível'
                      value={editForm.gradeId ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, gradeId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <MenuItem value=''><em>Nenhum</em></MenuItem>
                      {niveis.map((n) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                    </Select>
                    {submitted && !editForm.gradeId && <FormHelperText>Campo obrigatório</FormHelperText>}
                  </FormControl>
                </>
              )}
              {isManager && (
                <Box display='flex' gap={1} alignItems='flex-start' mt={1}>
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
              )}
            </>
          ) : (
            <>
              <TextField
                label='Nome'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                required
                error={submitted && !form.name.trim()}
                helperText={submitted && !form.name.trim() ? 'Campo obrigatório' : ''}
              />
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
              <FormControlLabel
                control={<Checkbox checked={form.isManager} onChange={(e) => setForm({ ...form, isManager: e.target.checked, roleId: e.target.checked ? null : form.roleId, gradeId: e.target.checked ? null : form.gradeId })} />}
                label='Gestor'
              />
              <FormControl fullWidth disabled={form.isManager} required={!form.isManager} error={submitted && !form.isManager && !form.roleId}>
                <InputLabel>Cargo</InputLabel>
                <Select
                  label='Cargo'
                  value={form.roleId ?? ''}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value ? Number(e.target.value) : null })}
                >
                  <MenuItem value=''><em>Nenhum</em></MenuItem>
                  {cargos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>)}
                </Select>
                {submitted && !form.isManager && !form.roleId && <FormHelperText>Campo obrigatório</FormHelperText>}
              </FormControl>
              <FormControl fullWidth disabled={form.isManager} required={!form.isManager} error={submitted && !form.isManager && !form.gradeId}>
                <InputLabel>Nível</InputLabel>
                <Select
                  label='Nível'
                  value={form.gradeId ?? ''}
                  onChange={(e) => setForm({ ...form, gradeId: e.target.value ? Number(e.target.value) : null })}
                >
                  <MenuItem value=''><em>Nenhum</em></MenuItem>
                  {niveis.map((n) => <MenuItem key={n.id} value={n.id}>{n.nome}</MenuItem>)}
                </Select>
                {submitted && !form.isManager && !form.gradeId && <FormHelperText>Campo obrigatório</FormHelperText>}
              </FormControl>
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
        <Button onClick={handleCancel}>Cancelar</Button>
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
