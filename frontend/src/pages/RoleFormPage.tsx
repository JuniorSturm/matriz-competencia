import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Paper, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, Avatar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import WorkIcon from '@mui/icons-material/Work'
import { useAuth } from '../hooks/useAuth'
import { useRole, useCreateRole, useUpdateRole } from '../hooks/useRoles'
import { useCompanies } from '../hooks/useCompanies'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'

export default function RoleFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const isEdit = !!id
  const roleId = id ? parseInt(id, 10) : null

  const isAdmin = user?.isAdmin ?? false
  const { data: companies = [] } = useCompanies(isAdmin)
  const activeCompanies = companies.filter((c) => c.isActive)

  const { data: existingRole, isLoading: loadingRole } = useRole(roleId)
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [companyId, setCompanyId] = useState<number | ''>('')
  const [synced, setSynced] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isEdit && existingRole && !synced) {
      setNome(existingRole.nome)
      setDescricao(existingRole.descricao ?? '')
      setCompanyId(existingRole.companyId)
      setSynced(true)
    }
  }, [isEdit, existingRole, synced])

  useEffect(() => {
    if (!isEdit && !isAdmin && user?.companyId != null) setCompanyId(user.companyId)
  }, [isEdit, isAdmin, user?.companyId])

  const nameError = submitted && !nome.trim()
  const companyError = submitted && isAdmin && !isEdit && !companyId

  const handleSave = async () => {
    setSubmitted(true)
    setErrorMsg('')
    if (!nome.trim()) return
    if (isAdmin && !isEdit && !companyId) return

    try {
      if (isEdit && roleId) {
        await updateMutation.mutateAsync({ id: roleId, data: { nome: nome.trim(), descricao: descricao.trim() || null } })
      } else {
        const payload = {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          companyId: isAdmin ? (companyId as number) : (user?.companyId ?? (companyId as number)),
        }
        await createMutation.mutateAsync(payload)
      }
      navigate('/roles')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setErrorMsg(e?.response?.data?.message ?? 'Erro ao salvar cargo.')
    }
  }

  const handleCancel = () => navigate('/roles')
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingRole) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (isEdit && !existingRole && !loadingRole) return <Alert severity='error'>Cargo não encontrado.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', minWidth: 0 }}>
      <PageHeader>
        <Box display='flex' alignItems='center' gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} color='inherit'>
            Voltar
          </Button>
          <Typography variant='h5' fontWeight={700}>
            {isEdit ? 'Editar Cargo' : 'Novo Cargo'}
          </Typography>
        </Box>
      </PageHeader>

      {errorMsg && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ flex: 1, mb: '80px' }}>
        <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Box display='flex' alignItems='center' gap={1.5} mb={2.5}>
            <Avatar sx={{ bgcolor: alpha(BRAND.cyan, 0.15), color: BRAND.cyan }}>
              <WorkIcon />
            </Avatar>
            <Typography variant='h6' fontWeight={600}>Dados do Cargo</Typography>
          </Box>
          <Box display='flex' flexDirection='column' gap={2.5}>
            {isAdmin && !isEdit && (
              <FormControl fullWidth required error={!!companyError}>
                <InputLabel>Empresa</InputLabel>
                <Select
                  value={companyId === '' ? '' : String(companyId)}
                  label='Empresa'
                  onChange={(e) => { const v = e.target.value; setCompanyId(v === '' ? '' : Number(v)) }}
                >
                  <MenuItem value=''>
                    <em>Selecione a empresa</em>
                  </MenuItem>
                  {activeCompanies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
                {companyError && <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>Empresa é obrigatória.</Typography>}
              </FormControl>
            )}
            <TextField
              label='Nome do cargo'
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              fullWidth
              required
              error={nameError}
              helperText={nameError ? 'Campo obrigatório' : ''}
            />
            <TextField
              label='Descrição (para que se aplica o cargo)'
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder='Ex.: Atuação em desenvolvimento backend com .NET'
              inputProps={{ maxLength: 500 }}
              helperText={`${descricao.length}/500`}
            />
          </Box>
        </Paper>
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
        <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
          Salvar
        </Button>
      </Paper>
    </Box>
  )
}
