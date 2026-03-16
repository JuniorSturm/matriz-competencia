import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment, TablePagination, Snackbar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import { usePagedUsers, useDeleteUser } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { CompanyPickerDrawer } from '../components/CompanyPickerDrawer'
import type { CompanyOptionResponse } from '../types'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

const ROWS_PER_PAGE = 50

/** Colunas ocultas em telas pequenas (só a partir de sm) */
const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const

function getProfileLabel(u: { isAdmin: boolean; isManager: boolean; isCoordinator: boolean }) {
  if (u.isAdmin) return 'Administrador'
  if (u.isManager) return 'Gestor'
  if (u.isCoordinator) return 'Coordenador'
  return 'Colaborador'
}

function getProfileColor(u: { isAdmin: boolean; isManager: boolean; isCoordinator: boolean }) {
  if (u.isAdmin) return { bg: alpha(BRAND.error, 0.12), color: BRAND.error }
  if (u.isManager) return { bg: alpha(BRAND.purple, 0.15), color: BRAND.purple }
  if (u.isCoordinator) return { bg: alpha(BRAND.warning, 0.12), color: BRAND.warning }
  return { bg: alpha(BRAND.cyan, 0.12), color: BRAND.cyan }
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [companyFilter, setCompanyFilter] = useState<number | ''>('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyOptionResponse | null>(null)
  const [companyDrawerOpen, setCompanyDrawerOpen] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { user: loggedUser } = useAuth()
  const isLoggedAdmin = loggedUser?.isAdmin ?? false
  const isLoggedGestor = (loggedUser?.isManager ?? false) && !isLoggedAdmin
  const isLoggedCoordinator = (loggedUser?.isCoordinator ?? false) && !isLoggedAdmin && !(loggedUser?.isManager ?? false)
  const canDelete = isLoggedAdmin || isLoggedGestor

  const companyIdParam = isLoggedAdmin && companyFilter !== '' ? companyFilter : undefined
  const handleCompanySelect = (company: CompanyOptionResponse | null) => {
    setSelectedCompany(company)
    setCompanyFilter(company?.id ?? '')
    setPage(0)
  }
  const { data: paged, isLoading, error } = usePagedUsers(
    page + 1,
    ROWS_PER_PAGE,
    nameFilter.trim() || undefined,
    false, // mostrar todos os perfis (admin, gestor, coordenador, colaborador)
    companyIdParam,
  )
  const deleteMutation = useDeleteUser()

  const items = paged?.items ?? []
  const totalCount = paged?.totalCount ?? 0

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma exclusão do colaborador?')) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e?.response?.data?.message ?? 'Não foi possível excluir. Existem registros associados a este colaborador ou uma regra de negócio impede a exclusão.')
    }
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar usuários.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Colaboradores</Typography>
            <Typography variant='body2' color='text.secondary'>
              {totalCount} registro{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant='contained'
            onClick={() => navigate('/users/new')}
            sx={{ flexShrink: 0 }}
          >
            Novo Colaborador
          </Button>
        </Box>
      </PageHeader>

      <Box display='flex' flexWrap='wrap' gap={2} alignItems='center' sx={{ mb: 2, mt: 2 }}>
        {isLoggedAdmin && (
          <Button
            variant='outlined'
            size='small'
            startIcon={<BusinessIcon />}
            onClick={() => setCompanyDrawerOpen(true)}
            sx={{ minWidth: 220, justifyContent: 'flex-start' }}
          >
            {selectedCompany ? selectedCompany.name : 'Todas (filtrar por empresa)'}
          </Button>
        )}
        <TextField
          placeholder='Buscar por nome...'
          size='small'
          value={nameFilter}
          onChange={(e) => { setNameFilter(e.target.value); setPage(0) }}
          sx={{ minWidth: { xs: 0, sm: 280 }, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Paper
        sx={{
          borderRadius: '16px',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'block' }}>
          <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 480 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell sx={colFromSm}>E-mail</TableCell>
                {isLoggedAdmin && <TableCell sx={colFromSm}>Empresa</TableCell>}
                <TableCell sx={colFromSm}>Cargo</TableCell>
                <TableCell sx={colFromSm}>Nível</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell align='right' sx={{ width: 56 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((u) => {
                const profile = getProfileColor(u)
                const isCommonUser = !u.isAdmin && !u.isManager && !u.isCoordinator
                const canEditUser = !isLoggedCoordinator || isCommonUser

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                    </TableCell>
                    <TableCell sx={colFromSm}>
                      <Typography variant='body2' color='text.secondary'>{u.email}</Typography>
                    </TableCell>
                    {isLoggedAdmin && (
                      <TableCell sx={colFromSm}>{u.companyName ?? '—'}</TableCell>
                    )}
                    <TableCell sx={colFromSm}>{u.roleName ?? '—'}</TableCell>
                    <TableCell sx={colFromSm}>{u.gradeName ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getProfileLabel(u)}
                        size='small'
                        sx={{
                          bgcolor: profile.bg,
                          color: profile.color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <TableRowActionsMenu
                        canEdit={canEditUser}
                        canDelete={canDelete}
                        onEdit={() => navigate(`/users/${u.id}/edit`)}
                        onDelete={() => handleDelete(u.id)}
                        editLabel='Editar'
                        deleteLabel='Excluir'
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[50]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
      <Snackbar open={!!deleteError} autoHideDuration={8000} onClose={() => setDeleteError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity='error' variant='filled' onClose={() => setDeleteError(null)}>{deleteError}</Alert>
      </Snackbar>
      {isLoggedAdmin && (
        <CompanyPickerDrawer
          open={companyDrawerOpen}
          onClose={() => setCompanyDrawerOpen(false)}
          onSelect={handleCompanySelect}
          title='Filtrar por empresa'
        />
      )}
    </Box>
  )
}
