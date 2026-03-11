import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Paper, CircularProgress, Alert,
  Snackbar, Switch, FormControlLabel, Divider, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Avatar, Tooltip, Tabs, Tab, Drawer, Checkbox,
  InputAdornment, Chip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import BusinessIcon from '@mui/icons-material/Business'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import PeopleIcon from '@mui/icons-material/People'
import SearchIcon from '@mui/icons-material/Search'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyService } from '../services/companyService'
import { userService } from '../services/userService'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import type { CreateCompanyRequest, UpdateCompanyRequest, UserResponse } from '../types'

const ROWS_PER_PAGE = 50

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function maskCnpj(raw: string): string {
  const v = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)
  if (v.length <= 2) return v
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`
  if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`
}

function maskPhone(raw: string): string {
  const v = raw.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 2) return v.length ? `(${v}` : ''
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

function stripMask(val: string): string {
  return val.replace(/[^a-zA-Z0-9]/g, '')
}

interface FormData {
  name: string
  document: string
  email: string
  phone: string
  isActive: boolean
}

export default function CompanyFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const companyId = id ? parseInt(id) : 0

  const { data: existingCompany, isLoading: loadingCompany } = useQuery({
    queryKey: ['companies', companyId],
    queryFn: () => companyService.getById(companyId),
    enabled: isEdit,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll(),
  })

  const [formData, setFormData] = useState<FormData>({ name: '', document: '', email: '', phone: '', isActive: true })
  const [synced, setSynced] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [tabIndex, setTabIndex] = useState(0)

  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutType, setFlyoutType] = useState<'manager' | 'collaborator'>('manager')
  const [flyoutSelected, setFlyoutSelected] = useState<Set<string>>(new Set())
  const [flyoutSearch, setFlyoutSearch] = useState('')
  const [flyoutPage, setFlyoutPage] = useState(0)

  const [managerIds, setManagerIds] = useState<string[]>([])
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([])

  useEffect(() => {
    if (isEdit && existingCompany && !synced) {
      setFormData({
        name: existingCompany.name,
        document: existingCompany.document ? maskCnpj(existingCompany.document) : '',
        email: existingCompany.email ?? '',
        phone: existingCompany.phone ? maskPhone(existingCompany.phone) : '',
        isActive: existingCompany.isActive,
      })
      setManagerIds(existingCompany.users.filter(u => u.isManager).map(u => u.id))
      setCollaboratorIds(existingCompany.users.filter(u => !u.isManager).map(u => u.id))
      setSynced(true)
    }
  }, [isEdit, existingCompany, synced])

  const createMutation = useMutation({
    mutationFn: (data: CreateCompanyRequest) => companyService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Erro ao criar empresa.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCompanyRequest) => companyService.update(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Erro ao atualizar empresa.')
    },
  })

  const allUserIds = new Set([...managerIds, ...collaboratorIds])

  const availableManagers = useMemo(() => {
    return allUsers.filter(u => u.isManager && !u.isAdmin && (u.companyId === null || (isEdit && u.companyId === companyId)) && !allUserIds.has(u.id))
  }, [allUsers, allUserIds, isEdit, companyId])

  const availableCollaborators = useMemo(() => {
    return allUsers.filter(u => !u.isManager && !u.isAdmin && (u.companyId === null || (isEdit && u.companyId === companyId)) && !allUserIds.has(u.id))
  }, [allUsers, allUserIds, isEdit, companyId])

  const managers = allUsers.filter(u => managerIds.includes(u.id))
  const collaborators = allUsers.filter(u => collaboratorIds.includes(u.id))

  const flyoutAvailable = flyoutType === 'manager' ? availableManagers : availableCollaborators

  const flyoutFiltered = useMemo(() => {
    if (!flyoutSearch.trim()) return flyoutAvailable
    const lower = flyoutSearch.toLowerCase()
    return flyoutAvailable.filter(u => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower))
  }, [flyoutAvailable, flyoutSearch])

  const flyoutPaginated = useMemo(
    () => flyoutFiltered.slice(flyoutPage * ROWS_PER_PAGE, flyoutPage * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [flyoutFiltered, flyoutPage],
  )

  const openFlyout = (type: 'manager' | 'collaborator') => {
    setFlyoutType(type)
    setFlyoutSelected(new Set())
    setFlyoutSearch('')
    setFlyoutPage(0)
    setFlyoutOpen(true)
  }

  const toggleFlyoutSelect = (userId: string) => {
    setFlyoutSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAll = () => {
    const pageIds = flyoutPaginated.map(u => u.id)
    const allSel = pageIds.every(id => flyoutSelected.has(id))
    setFlyoutSelected(prev => {
      const next = new Set(prev)
      if (allSel) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleFlyoutConfirm = () => {
    const ids = Array.from(flyoutSelected)
    if (ids.length === 0) return
    if (flyoutType === 'manager') {
      setManagerIds(prev => [...prev, ...ids])
    } else {
      setCollaboratorIds(prev => [...prev, ...ids])
    }
    setFlyoutOpen(false)
  }

  const handleRemoveUser = (userId: string, type: 'manager' | 'collaborator') => {
    if (type === 'manager') {
      setManagerIds(prev => prev.filter(id => id !== userId))
    } else {
      setCollaboratorIds(prev => prev.filter(id => id !== userId))
    }
  }

  const nameError = submitted && !formData.name.trim()
  const docRaw = stripMask(formData.document)
  const docError = submitted && docRaw.length < 14
  const emailError = submitted && !EMAIL_RE.test(formData.email)
  const phoneRaw = formData.phone.replace(/\D/g, '')
  const phoneError = submitted && phoneRaw.length < 10

  const handleSave = async () => {
    setSubmitted(true)
    setErrorMsg('')

    if (!formData.name.trim() || docRaw.length < 14 || !EMAIL_RE.test(formData.email) || phoneRaw.length < 10) return

    const allIds = [...managerIds, ...collaboratorIds]

    if (isEdit) {
      await updateMutation.mutateAsync({
        name: formData.name.trim(),
        document: docRaw,
        email: formData.email.trim(),
        phone: phoneRaw,
        isActive: formData.isActive,
        userIds: allIds,
      })
    } else {
      await createMutation.mutateAsync({
        name: formData.name.trim(),
        document: docRaw,
        email: formData.email.trim(),
        phone: phoneRaw,
        userIds: allIds,
      })
    }
    navigate('/companies')
  }

  const handleCancel = () => navigate('/companies')
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingCompany) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (isEdit && !existingCompany && !loadingCompany) return <Alert severity='error'>Empresa não encontrada.</Alert>

  const allPageIds = flyoutPaginated.map(u => u.id)
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => flyoutSelected.has(id))
  const somePageSelected = allPageIds.some(id => flyoutSelected.has(id)) && !allPageSelected

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', minWidth: 0 }}>
      <PageHeader>
        <Box display='flex' alignItems='center' gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} color='inherit'>
            Voltar
          </Button>
          <Typography variant='h5' fontWeight={700}>
            {isEdit ? 'Editar Empresa' : 'Nova Empresa'}
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
              <BusinessIcon />
            </Avatar>
            <Typography variant='h6' fontWeight={600}>Dados da Empresa</Typography>
          </Box>
          <Box display='flex' flexDirection='column' gap={2.5}>
            <TextField
              label='Nome da Empresa'
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
              fullWidth required
              error={nameError}
              helperText={nameError ? 'Campo obrigatório' : ''}
            />
            <Box display='flex' gap={2}>
              <TextField
                label='CNPJ'
                value={formData.document}
                onChange={(e) => setFormData(f => ({ ...f, document: maskCnpj(e.target.value) }))}
                fullWidth required
                placeholder='XX.XXX.XXX/XXXX-XX'
                error={docError}
                helperText={docError ? 'CNPJ deve ter 14 caracteres' : ''}
                inputProps={{ maxLength: 18 }}
              />
              <TextField
                label='Telefone'
                value={formData.phone}
                onChange={(e) => setFormData(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                fullWidth required
                placeholder='(XX) XXXXX-XXXX'
                error={phoneError}
                helperText={phoneError ? 'Telefone inválido' : ''}
                inputProps={{ maxLength: 15 }}
              />
            </Box>
            <TextField
              label='E-mail'
              value={formData.email}
              onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
              fullWidth required
              error={emailError}
              helperText={emailError ? 'Informe um e-mail válido' : ''}
            />
            {isEdit && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                    color='primary'
                  />
                }
                label='Empresa Ativa'
              />
            )}
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              px: 2, pt: 1,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab
              icon={<SupervisorAccountIcon sx={{ fontSize: 20 }} />}
              iconPosition='start'
              label={`Gestores (${managers.length})`}
            />
            <Tab
              icon={<PeopleIcon sx={{ fontSize: 20 }} />}
              iconPosition='start'
              label={`Colaboradores (${collaborators.length})`}
            />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {tabIndex === 0 && (
              <UserTab
                users={managers}
                type='manager'
                onAdd={() => openFlyout('manager')}
                onRemove={(uid) => handleRemoveUser(uid, 'manager')}
                emptyMessage='Nenhum gestor vinculado. Você pode vincular gestores para administrar a empresa.'
                addLabel='Vincular Gestor'
              />
            )}
            {tabIndex === 1 && (
              <UserTab
                users={collaborators}
                type='collaborator'
                onAdd={() => openFlyout('collaborator')}
                onRemove={(uid) => handleRemoveUser(uid, 'collaborator')}
                emptyMessage='Nenhum colaborador vinculado a esta empresa.'
                addLabel='Vincular Colaborador'
              />
            )}
          </Box>
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'fixed', bottom: 0, left: 260, right: 0,
          px: 3, py: 1.5,
          display: 'flex', justifyContent: 'flex-end', gap: 2,
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

      {/* ── Flyout lateral ── */}
      <Drawer
        anchor='right'
        open={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant='h6' fontWeight={700}>
              {flyoutType === 'manager' ? 'Vincular Gestores' : 'Vincular Colaboradores'}
            </Typography>
            <IconButton onClick={() => setFlyoutOpen(false)} size='small'>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ px: 3, pt: 2, pb: 1 }}>
            <TextField
              placeholder='Buscar por nome ou e-mail...'
              size='small'
              fullWidth
              value={flyoutSearch}
              onChange={(e) => { setFlyoutSearch(e.target.value); setFlyoutPage(0) }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            {flyoutSelected.size > 0 && (
              <Typography variant='body2' sx={{ mt: 1, color: BRAND.purple, fontWeight: 600 }}>
                {flyoutSelected.size} selecionado{flyoutSelected.size > 1 ? 's' : ''}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {flyoutFiltered.length === 0 ? (
              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 6 }}>
                Nenhum usuário disponível.
              </Typography>
            ) : (
              <TableContainer>
                <Table size='small' stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          indeterminate={somePageSelected}
                          checked={allPageSelected}
                          onChange={toggleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Nome</TableCell>
                      <TableCell>E-mail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flyoutPaginated.map((u) => {
                      const selected = flyoutSelected.has(u.id)
                      return (
                        <TableRow
                          key={u.id}
                          hover
                          onClick={() => toggleFlyoutSelect(u.id)}
                          sx={{ cursor: 'pointer', bgcolor: selected ? alpha(BRAND.purple, 0.06) : undefined }}
                        >
                          <TableCell padding='checkbox'>
                            <Checkbox checked={selected} />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>{u.email}</Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  component='div'
                  count={flyoutFiltered.length}
                  page={flyoutPage}
                  onPageChange={(_, p) => setFlyoutPage(p)}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[50]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                />
              </TableContainer>
            )}
          </Box>

          <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setFlyoutOpen(false)}>Cancelar</Button>
            <Button
              variant='contained'
              onClick={handleFlyoutConfirm}
              disabled={flyoutSelected.size === 0}
            >
              Vincular {flyoutSelected.size > 0 ? `(${flyoutSelected.size})` : ''}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity='success' variant='filled'>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  )
}

interface UserTabProps {
  users: Pick<UserResponse, 'id' | 'name' | 'email' | 'isAdmin' | 'isManager' | 'isCoordinator'>[]
  type: 'manager' | 'collaborator'
  onAdd: () => void
  onRemove: (userId: string) => void
  emptyMessage: string
  addLabel: string
}

function UserTab({ users, type, onAdd, onRemove, emptyMessage, addLabel }: UserTabProps) {
  const [page, setPage] = useState(0)
  const paginated = useMemo(
    () => users.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [users, page],
  )

  useEffect(() => { setPage(0) }, [users.length])

  return (
    <>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='subtitle1' fontWeight={600}>
          {type === 'manager' ? 'Gestores vinculados' : 'Colaboradores vinculados'}
        </Typography>
        <Button
          startIcon={<PersonAddIcon />}
          variant='outlined'
          onClick={onAdd}
          size='small'
        >
          {addLabel}
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {users.length === 0 ? (
        <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
          {emptyMessage}
        </Typography>
      ) : (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                {type === 'collaborator' && <TableCell>Perfil</TableCell>}
                <TableCell>E-mail</TableCell>
                <TableCell align='right'>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                  </TableCell>
                  {type === 'collaborator' && (
                    <TableCell>
                      <Chip
                        label={u.isAdmin ? 'Administrador' : u.isManager ? 'Gestor' : u.isCoordinator ? 'Coordenador' : 'Colaborador'}
                        size='small'
                        sx={{
                          bgcolor: u.isAdmin
                            ? alpha(BRAND.error, 0.12)
                            : u.isManager
                              ? alpha(BRAND.purple, 0.15)
                              : u.isCoordinator
                                ? alpha(BRAND.warning, 0.12)
                                : alpha(BRAND.cyan, 0.12),
                          color: u.isAdmin
                            ? BRAND.error
                            : u.isManager
                              ? BRAND.purple
                              : u.isCoordinator
                                ? BRAND.warning
                                : BRAND.cyan,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>{u.email}</Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Tooltip title='Remover' arrow>
                      <IconButton
                        size='small'
                        onClick={() => onRemove(u.id)}
                        sx={{ color: BRAND.error }}
                      >
                        <PersonRemoveIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component='div'
            count={users.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[50]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </TableContainer>
      )}
    </>
  )
}
