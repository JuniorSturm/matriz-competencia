import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Paper, CircularProgress, Alert,
  Snackbar, Divider, IconButton, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Checkbox, Drawer, Tooltip, InputAdornment, Autocomplete,
  Tab, Tabs, Chip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import BusinessIcon from '@mui/icons-material/Business'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import GroupsIcon from '@mui/icons-material/Groups'
import SearchIcon from '@mui/icons-material/Search'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamService } from '../services/teamService'
import { skillService } from '../services/skillService'
import { usePagedUsers } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { CompanyPickerDrawer } from '../components/CompanyPickerDrawer'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import type { CreateTeamRequest, UpdateTeamRequest, TeamMemberRequest, CompanyOptionResponse } from '../types'

const ROWS_PER_PAGE = 50

export default function TeamFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const teamId = id ? parseInt(id) : 0

  const isAdmin = user?.isAdmin ?? false
  const managerCompanyId = user?.companyId ?? null

  const { data: existingTeam, isLoading: loadingTeam } = useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => teamService.getById(teamId),
    enabled: isEdit,
  })

  const [companyDrawerOpen, setCompanyDrawerOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyOptionResponse | null>(null)

  const [companyId, setCompanyId] = useState<number>(0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<TeamMemberRequest[]>([])
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<Set<number>>(new Set())
  const [synced, setSynced] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState('')
  const [memberPage, setMemberPage] = useState(0)
  const [compPage, setCompPage] = useState(0)
  const [coordinatorId, setCoordinatorId] = useState('')
  const [mainTab, setMainTab] = useState(0)

  // Member flyout state
  const [flyoutOpen, setFlyoutOpen] = useState(false)
  const [flyoutSelected, setFlyoutSelected] = useState<Set<string>>(new Set())
  const [flyoutSearch, setFlyoutSearch] = useState('')
  const [flyoutPage, setFlyoutPage] = useState(0)

  // Competency flyout state
  const [compFlyoutOpen, setCompFlyoutOpen] = useState(false)
  const [compFlyoutSelected, setCompFlyoutSelected] = useState<Set<number>>(new Set())
  const [compFlyoutSearch, setCompFlyoutSearch] = useState('')
  const [compFlyoutPage, setCompFlyoutPage] = useState(0)

  const resolvedCompanyId = companyId || (isEdit ? existingTeam?.companyId : 0) || 0

  const { data: coordinatorsPaged } = usePagedUsers(1, 100, undefined, false, resolvedCompanyId, undefined, undefined, undefined, false, true, !!resolvedCompanyId)
  const companyCoordinators = coordinatorsPaged?.items ?? []

  const { data: flyoutPaged, isLoading: flyoutMembersLoading } = usePagedUsers(
    flyoutPage + 1,
    ROWS_PER_PAGE,
    flyoutSearch.trim() || undefined,
    true,
    undefined,
    undefined,
    resolvedCompanyId > 0 ? resolvedCompanyId : undefined,
    isEdit && teamId ? teamId : undefined,
    false,
    undefined,
    flyoutOpen && resolvedCompanyId > 0,
  )
  const flyoutItems = flyoutPaged?.items ?? []
  const flyoutTotalCount = flyoutPaged?.totalCount ?? 0

  const { data: compFlyoutPaged, isLoading: compFlyoutLoading } = useQuery({
    queryKey: ['skills-paged', compFlyoutPage + 1, ROWS_PER_PAGE, resolvedCompanyId],
    queryFn: () => skillService.getPaged(compFlyoutPage + 1, ROWS_PER_PAGE, resolvedCompanyId > 0 ? resolvedCompanyId : undefined),
    enabled: compFlyoutOpen && resolvedCompanyId > 0,
  })
  const compFlyoutItems = compFlyoutPaged?.items ?? []
  const compFlyoutTotalCount = compFlyoutPaged?.totalCount ?? 0

  const [addedMemberMap, setAddedMemberMap] = useState<Record<string, { name: string; email: string }>>({})
  const [selectedCompetencyMap, setSelectedCompetencyMap] = useState<Record<number, { name: string; category: string }>>({})

  useEffect(() => {
    if (isEdit && existingTeam && !synced) {
      setCompanyId(existingTeam.companyId)
      setName(existingTeam.name)
      setDescription(existingTeam.description ?? '')
      const leader = existingTeam.members.find(m => m.isLeader)
      if (leader) setCoordinatorId(leader.userId)
      setMembers(existingTeam.members.filter(m => !m.isLeader).map(m => ({ userId: m.userId, isLeader: false })))
      setSelectedCompetencyIds(new Set(existingTeam.competencyIds ?? []))
      setSynced(true)
    }
  }, [isEdit, existingTeam, synced])

  useEffect(() => {
    if (!isEdit && !isAdmin && managerCompanyId) {
      setCompanyId(managerCompanyId)
    }
  }, [isEdit, isAdmin, managerCompanyId])

  const handleCompanySelect = (company: CompanyOptionResponse | null) => {
    setSelectedCompany(company)
    setCompanyId(company?.id ?? 0)
    setMembers([])
    setCoordinatorId('')
    setSelectedCompetencyIds(new Set())
  }

  const createMutation = useMutation({
    mutationFn: (data: CreateTeamRequest) => teamService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams-paged'] })
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      queryClient.invalidateQueries({ queryKey: ['comparison'] })
      navigate('/teams')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Erro ao criar time.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTeamRequest) => teamService.update(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams-paged'] })
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
      queryClient.invalidateQueries({ queryKey: ['assessments'] })
      queryClient.invalidateQueries({ queryKey: ['comparison'] })
      navigate('/teams')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Erro ao atualizar time.')
    },
  })

  // ── Members helpers ──
  const memberUserIds = new Set(members.map((m) => m.userId))
  const flyoutFiltered = useMemo(
    () => flyoutItems.filter(u => !memberUserIds.has(u.id)),
    [flyoutItems, memberUserIds],
  )
  const flyoutPaginated = flyoutFiltered

  const memberRows = useMemo(() => {
    return members.map(m => {
      const fromExisting = existingTeam?.members?.find(ex => ex.userId === m.userId)
      return {
        userId: m.userId,
        name: fromExisting?.userName ?? addedMemberMap[m.userId]?.name ?? m.userId,
        email: fromExisting?.userEmail ?? addedMemberMap[m.userId]?.email ?? '—',
      }
    })
  }, [members, existingTeam?.members, addedMemberMap])

  const paginatedMembers = useMemo(
    () => memberRows.slice(memberPage * ROWS_PER_PAGE, memberPage * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [memberRows, memberPage],
  )

  // ── Competency tab helpers ──
  const selectedCompetencyRows = useMemo(() => {
    return Array.from(selectedCompetencyIds).map(id => ({
      id,
      name: selectedCompetencyMap[id]?.name ?? `Competência #${id}`,
      category: selectedCompetencyMap[id]?.category ?? '—',
    }))
  }, [selectedCompetencyIds, selectedCompetencyMap])

  const paginatedCompRows = useMemo(
    () => selectedCompetencyRows.slice(compPage * ROWS_PER_PAGE, compPage * ROWS_PER_PAGE + ROWS_PER_PAGE),
    [selectedCompetencyRows, compPage],
  )

  // ── Competency flyout helpers ──
  const compFlyoutFiltered = useMemo(() => {
    const list = compFlyoutItems.filter(s => !selectedCompetencyIds.has(s.id))
    if (!compFlyoutSearch.trim()) return list
    const lower = compFlyoutSearch.toLowerCase()
    return list.filter(s => s.name.toLowerCase().includes(lower) || s.category.toLowerCase().includes(lower))
  }, [compFlyoutItems, selectedCompetencyIds, compFlyoutSearch])

  const compFlyoutPaginated = compFlyoutFiltered

  useEffect(() => { setMemberPage(0) }, [members.length])
  useEffect(() => { setCompPage(0) }, [selectedCompetencyIds.size])

  // ── Member flyout actions ──
  const openMemberFlyout = () => {
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

  const handleMemberFlyoutConfirm = () => {
    const ids = Array.from(flyoutSelected)
    if (ids.length === 0) return
    const toAdd = flyoutItems.filter(u => flyoutSelected.has(u.id))
    setAddedMemberMap(prev => ({ ...prev, ...Object.fromEntries(toAdd.map(u => [u.id, { name: u.name, email: u.email }])) }))
    setMembers(prev => [...prev, ...ids.map(uid => ({ userId: uid, isLeader: false }))])
    setFlyoutOpen(false)
  }

  const removeMember = (userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  // ── Competency flyout actions ──
  const openCompFlyout = () => {
    setCompFlyoutSelected(new Set())
    setCompFlyoutSearch('')
    setCompFlyoutPage(0)
    setCompFlyoutOpen(true)
  }

  const toggleCompFlyoutSelect = (skillId: number) => {
    setCompFlyoutSelected(prev => {
      const next = new Set(prev)
      if (next.has(skillId)) next.delete(skillId)
      else next.add(skillId)
      return next
    })
  }

  const toggleCompSelectAll = () => {
    const pageIds = compFlyoutPaginated.map(s => s.id)
    const allSel = pageIds.every(id => compFlyoutSelected.has(id))
    setCompFlyoutSelected(prev => {
      const next = new Set(prev)
      if (allSel) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  const handleCompFlyoutConfirm = () => {
    const ids = Array.from(compFlyoutSelected)
    if (ids.length === 0) return
    const toAdd = compFlyoutItems.filter(s => compFlyoutSelected.has(s.id))
    setSelectedCompetencyMap(prev => ({ ...prev, ...Object.fromEntries(toAdd.map(s => [s.id, { name: s.name, category: s.category }])) }))
    setSelectedCompetencyIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    setCompFlyoutOpen(false)
  }

  const removeCompetency = (skillId: number) => {
    setSelectedCompetencyIds(prev => {
      const next = new Set(prev)
      next.delete(skillId)
      return next
    })
  }

  // ── Save ──
  const handleSave = async () => {
    setSubmitted(true)
    setErrorMsg('')
    if (!name.trim()) return
    if (!coordinatorId) {
      setErrorMsg('Selecione o coordenador do time.')
      return
    }
    if (members.length === 0) {
      setErrorMsg('Adicione pelo menos um membro ao time.')
      return
    }
    const allMembers: TeamMemberRequest[] = [
      { userId: coordinatorId, isLeader: true },
      ...members.map(m => ({ userId: m.userId, isLeader: false })),
    ]
    const competencyIds = Array.from(selectedCompetencyIds)
    if (isEdit) {
      await updateMutation.mutateAsync({ name: name.trim(), description: description.trim() || null, members: allMembers, competencyIds })
    } else {
      if (!companyId) {
        setErrorMsg('Selecione a empresa do time.')
        return
      }
      await createMutation.mutateAsync({
        companyId,
        name: name.trim(),
        description: description.trim() || null,
        members: allMembers,
        competencyIds,
      })
    }
  }

  const handleCancel = () => navigate('/teams')
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingTeam) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (isEdit && !existingTeam && !loadingTeam) return <Alert severity='error'>Time não encontrado.</Alert>

  // Member flyout pagination helpers
  const allMemberPageIds = flyoutPaginated.map(u => u.id)
  const allMemberPageSelected = allMemberPageIds.length > 0 && allMemberPageIds.every(id => flyoutSelected.has(id))
  const someMemberPageSelected = allMemberPageIds.some(id => flyoutSelected.has(id)) && !allMemberPageSelected

  // Competency flyout pagination helpers
  const allCompFlyoutPageIds = compFlyoutPaginated.map(s => s.id)
  const allCompFlyoutPageSelected = allCompFlyoutPageIds.length > 0 && allCompFlyoutPageIds.every(id => compFlyoutSelected.has(id))
  const someCompFlyoutPageSelected = allCompFlyoutPageIds.some(id => compFlyoutSelected.has(id)) && !allCompFlyoutPageSelected

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 112px)', minWidth: 0 }}>
      <PageHeader>
        <Box display='flex' alignItems='center' gap={1}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleCancel} color='inherit'>
            Voltar
          </Button>
          <Typography variant='h5' fontWeight={700}>
            {isEdit ? 'Editar Time' : 'Novo Time'}
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
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: alpha(BRAND.purple, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GroupsIcon sx={{ color: BRAND.purple }} />
            </Box>
            <Typography variant='h6' fontWeight={600}>Dados do Time</Typography>
          </Box>
          <Box display='flex' flexDirection='column' gap={2.5}>
            {!isEdit && isAdmin && (
              <Box>
                <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>Empresa *</Typography>
                <Button
                  variant='outlined'
                  fullWidth
                  startIcon={<BusinessIcon />}
                  onClick={() => setCompanyDrawerOpen(true)}
                  sx={{ justifyContent: 'flex-start' }}
                  color={submitted && !companyId ? 'error' : 'primary'}
                >
                  {selectedCompany ? selectedCompany.name : companyId ? `Empresa #${companyId}` : 'Selecionar empresa'}
                </Button>
              </Box>
            )}
            <TextField
              label='Nome do time'
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              error={submitted && !name.trim()}
              helperText={submitted && !name.trim() ? 'Campo obrigatório' : ''}
            />
            <TextField
              label='Descrição'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${description.length}/500`}
            />
            <Autocomplete
              options={companyCoordinators}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={companyCoordinators.find(c => c.id === coordinatorId) ?? null}
              onChange={(_, v) => setCoordinatorId(v?.id ?? '')}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              disabled={!companyId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Coordenador'
                  required
                  error={submitted && !coordinatorId}
                  helperText={submitted && !coordinatorId ? 'Selecione o coordenador do time' : ''}
                />
              )}
              noOptionsText='Nenhum coordenador disponível'
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2 }}>
            <Tab label={`Membros (${members.length})`} />
            <Tab label={`Competências (${selectedCompetencyIds.size})`} />
          </Tabs>
          <Divider sx={{ mb: 2 }} />

          {/* ── Tab 0: Membros ── */}
          {mainTab === 0 && (
            <>
              <Box display='flex' justifyContent='flex-end' mb={2}>
                <Button
                  startIcon={<PersonAddIcon />}
                  variant='outlined'
                  onClick={openMemberFlyout}
                  size='small'
                  disabled={!companyId}
                >
                  Adicionar membros
                </Button>
              </Box>
              {members.length === 0 ? (
                <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
                  Nenhum membro. Adicione colaboradores ao time.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>E-mail</TableCell>
                        <TableCell align='right'>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedMembers.map((m) => (
                        <TableRow key={m.userId}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{m.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' color='text.secondary'>{m.email}</Typography>
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Remover' arrow>
                              <IconButton size='small' onClick={() => removeMember(m.userId)} sx={{ color: BRAND.error }}>
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
                    count={memberRows.length}
                    page={memberPage}
                    onPageChange={(_, p) => setMemberPage(p)}
                    rowsPerPage={ROWS_PER_PAGE}
                    rowsPerPageOptions={[50]}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                  />
                </TableContainer>
              )}
            </>
          )}

          {/* ── Tab 1: Competências ── */}
          {mainTab === 1 && (
            <>
              <Box display='flex' justifyContent='flex-end' mb={2}>
                <Button
                  startIcon={<AddCircleOutlineIcon />}
                  variant='outlined'
                  onClick={openCompFlyout}
                  size='small'
                  disabled={!companyId}
                >
                  Adicionar competências
                </Button>
              </Box>
              {!companyId ? (
                <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
                  Selecione uma empresa para gerenciar as competências do time.
                </Typography>
              ) : selectedCompetencyIds.size === 0 ? (
                <Typography variant='body2' color='text.secondary' sx={{ py: 3, textAlign: 'center' }}>
                  Nenhuma competência vinculada. Adicione competências ao time.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Competência</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell align='right'>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCompRows.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{s.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={s.category}
                              size='small'
                              sx={{
                                bgcolor: alpha(BRAND.purple, 0.12),
                                color: BRAND.purpleLight,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Remover' arrow>
                              <IconButton size='small' onClick={() => removeCompetency(s.id)} sx={{ color: BRAND.error }}>
                                <RemoveCircleOutlineIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component='div'
                    count={selectedCompetencyRows.length}
                    page={compPage}
                    onPageChange={(_, p) => setCompPage(p)}
                    rowsPerPage={ROWS_PER_PAGE}
                    rowsPerPageOptions={[50]}
                    labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                  />
                </TableContainer>
              )}
            </>
          )}
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: 'fixed', bottom: 0, left: 260, right: 0,
          px: 3, py: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 2,
          zIndex: (t) => t.zIndex.appBar - 1, borderRadius: 0,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.9), backdropFilter: 'blur(12px)',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Button onClick={handleCancel}>Cancelar</Button>
        <Button variant='contained' startIcon={<SaveIcon />} onClick={handleSave} disabled={isSaving}>
          Salvar
        </Button>
      </Paper>

      {/* ── Flyout lateral: Adicionar Membros ── */}
      <Drawer
        anchor='right'
        open={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant='h6' fontWeight={700}>Adicionar Membros</Typography>
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
            {flyoutMembersLoading && !flyoutPaged ? (
              <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>
            ) : flyoutFiltered.length === 0 ? (
              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 6 }}>
                Nenhum colaborador disponível.
              </Typography>
            ) : (
              <TableContainer>
                <Table size='small' stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          indeterminate={someMemberPageSelected}
                          checked={allMemberPageSelected}
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
                  count={flyoutTotalCount}
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
              onClick={handleMemberFlyoutConfirm}
              disabled={flyoutSelected.size === 0}
            >
              Adicionar {flyoutSelected.size > 0 ? `(${flyoutSelected.size})` : ''}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* ── Flyout lateral: Adicionar Competências ── */}
      <Drawer
        anchor='right'
        open={compFlyoutOpen}
        onClose={() => setCompFlyoutOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 580 } } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant='h6' fontWeight={700}>Adicionar Competências</Typography>
            <IconButton onClick={() => setCompFlyoutOpen(false)} size='small'>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ px: 3, pt: 2, pb: 1 }}>
            <TextField
              placeholder='Buscar por nome ou categoria...'
              size='small'
              fullWidth
              value={compFlyoutSearch}
              onChange={(e) => { setCompFlyoutSearch(e.target.value); setCompFlyoutPage(0) }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            {compFlyoutSelected.size > 0 && (
              <Typography variant='body2' sx={{ mt: 1, color: BRAND.purple, fontWeight: 600 }}>
                {compFlyoutSelected.size} selecionada{compFlyoutSelected.size > 1 ? 's' : ''}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {compFlyoutLoading && !compFlyoutPaged ? (
              <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>
            ) : compFlyoutFiltered.length === 0 ? (
              <Typography variant='body2' color='text.secondary' sx={{ textAlign: 'center', py: 6 }}>
                Nenhuma competência disponível.
              </Typography>
            ) : (
              <TableContainer>
                <Table size='small' stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding='checkbox'>
                        <Checkbox
                          indeterminate={someCompFlyoutPageSelected}
                          checked={allCompFlyoutPageSelected}
                          onChange={toggleCompSelectAll}
                        />
                      </TableCell>
                      <TableCell>Competência</TableCell>
                      <TableCell>Categoria</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {compFlyoutPaginated.map((s) => {
                      const selected = compFlyoutSelected.has(s.id)
                      return (
                        <TableRow
                          key={s.id}
                          hover
                          onClick={() => toggleCompFlyoutSelect(s.id)}
                          sx={{ cursor: 'pointer', bgcolor: selected ? alpha(BRAND.purple, 0.06) : undefined }}
                        >
                          <TableCell padding='checkbox'>
                            <Checkbox checked={selected} />
                          </TableCell>
                          <TableCell>
                            <Typography variant='body2' fontWeight={600}>{s.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={s.category}
                              size='small'
                              sx={{
                                bgcolor: alpha(BRAND.purple, 0.12),
                                color: BRAND.purpleLight,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  component='div'
                  count={compFlyoutTotalCount}
                  page={compFlyoutPage}
                  onPageChange={(_, p) => setCompFlyoutPage(p)}
                  rowsPerPage={ROWS_PER_PAGE}
                  rowsPerPageOptions={[50]}
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                />
              </TableContainer>
            )}
          </Box>

          <Box sx={{ px: 3, py: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setCompFlyoutOpen(false)}>Cancelar</Button>
            <Button
              variant='contained'
              onClick={handleCompFlyoutConfirm}
              disabled={compFlyoutSelected.size === 0}
            >
              Adicionar {compFlyoutSelected.size > 0 ? `(${compFlyoutSelected.size})` : ''}
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity='success' variant='filled'>{success}</Alert>
      </Snackbar>
      {!isEdit && isAdmin && (
        <CompanyPickerDrawer
          open={companyDrawerOpen}
          onClose={() => setCompanyDrawerOpen(false)}
          onSelect={handleCompanySelect}
          title='Selecionar empresa'
        />
      )}
    </Box>
  )
}
