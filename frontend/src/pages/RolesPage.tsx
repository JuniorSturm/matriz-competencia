import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress,
  InputAdornment, Avatar, TablePagination, Snackbar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import WorkIcon from '@mui/icons-material/Work'
import { useAuth } from '../hooks/useAuth'
import { useRolesPagedList } from '../hooks/useRoleGrade'
import { useDeleteRole } from '../hooks/useRoles'
import { CompanyPickerDrawer } from '../components/CompanyPickerDrawer'
import type { RoleDetailResponse, CompanyOptionResponse } from '../types'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const

export default function RolesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin ?? false
  const [companyFilter, setCompanyFilter] = useState<number | ''>('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyOptionResponse | null>(null)
  const [companyDrawerOpen, setCompanyDrawerOpen] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const rowsPerPage = 50

  const companyIdForApi = isAdmin && companyFilter !== '' ? (companyFilter as number) : undefined
  const { data, isLoading, error } = useRolesPagedList(page + 1, rowsPerPage, companyIdForApi)
  const deleteMutation = useDeleteRole()

  const handleCompanySelect = (company: CompanyOptionResponse | null) => {
    setSelectedCompany(company)
    setCompanyFilter(company?.id ?? '')
    setPage(0)
  }

  const roles = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const isInitialLoading = isLoading && !data && page === 0

  const filtered = useMemo(() => {
    if (!roles.length) return []
    if (!nameFilter.trim()) return roles
    const lower = nameFilter.toLowerCase()
    return roles.filter((r: RoleDetailResponse) => (r.nome ?? '').toLowerCase().includes(lower))
  }, [roles, nameFilter])

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão do cargo?')) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e?.response?.data?.message ?? 'Não foi possível excluir. Existem registros associados a este cargo ou uma regra de negócio impede a exclusão.')
    }
  }

  if (isInitialLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar cargos.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Cargos</Typography>
            <Typography variant='body2' color='text.secondary'>
              {totalCount} cargo{totalCount !== 1 ? 's' : ''} cadastrado{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant='contained'
            onClick={() => navigate('/roles/new')}
            sx={{ flexShrink: 0 }}
          >
            Novo Cargo
          </Button>
        </Box>
      </PageHeader>

      <Box display='flex' flexWrap='wrap' gap={2} alignItems='center' sx={{ mb: 2, mt: 2 }}>
        {isAdmin && (
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
          <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 520 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Cargo</TableCell>
                {isAdmin && <TableCell sx={colFromSm}>Empresa</TableCell>}
                <TableCell align='right' sx={{ width: 56 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r: RoleDetailResponse) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Box display='flex' alignItems='center' gap={1.5}>
                      <Avatar
                        sx={{
                          width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700,
                          bgcolor: alpha(BRAND.cyan, 0.15), color: BRAND.cyan,
                        }}
                      >
                        <WorkIcon fontSize='small' />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>{r.nome}</Typography>
                    </Box>
                  </TableCell>
                  {isAdmin && (
                    <TableCell sx={colFromSm}>
                      <Typography variant='body2' color='text.secondary'>{r.companyName ?? '—'}</Typography>
                    </TableCell>
                  )}
                  <TableCell align='right'>
                    <TableRowActionsMenu
                      onEdit={() => navigate(`/roles/${r.id}/edit`)}
                      onDelete={() => handleDelete(r.id)}
                      editLabel='Editar'
                      deleteLabel='Excluir'
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[50]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
      <Snackbar open={!!deleteError} autoHideDuration={8000} onClose={() => setDeleteError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity='error' variant='filled' onClose={() => setDeleteError(null)}>{deleteError}</Alert>
      </Snackbar>
      {isAdmin && (
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
