import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress,
  InputAdornment, Avatar, Chip, TablePagination, Snackbar,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import GroupsIcon from '@mui/icons-material/Groups'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamService } from '../services/teamService'
import { useAuth } from '../hooks/useAuth'
import { CompanyPickerDrawer } from '../components/CompanyPickerDrawer'
import type { CompanyOptionResponse } from '../types'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const
const ROWS_PER_PAGE = 50

export default function TeamsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin ?? false
  const canManage = user?.isAdmin || user?.isManager
  const [companyFilter, setCompanyFilter] = useState<number | ''>('')
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [selectedCompany, setSelectedCompany] = useState<CompanyOptionResponse | null>(null)
  const [companyDrawerOpen, setCompanyDrawerOpen] = useState(false)
  const companyIdParam = isAdmin && companyFilter !== '' ? companyFilter : undefined
  const nameParam = nameFilter.trim() || undefined
  const handleCompanySelect = (company: CompanyOptionResponse | null) => {
    setSelectedCompany(company)
    setCompanyFilter(company?.id ?? '')
    setPage(0)
  }
  const { data: paged, isLoading, error } = useQuery({
    queryKey: ['teams-paged', page + 1, ROWS_PER_PAGE, companyIdParam ?? '', nameParam ?? ''],
    queryFn: () => teamService.getPaged(page + 1, ROWS_PER_PAGE, companyIdParam, nameParam),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams-paged'] })
    },
  })

  const items = paged?.items ?? []
  const totalCount = paged?.totalCount ?? 0

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão do time?')) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e?.response?.data?.message ?? 'Não foi possível excluir. Existem registros associados a este time ou uma regra de negócio impede a exclusão.')
    }
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar times.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Times</Typography>
            <Typography variant='body2' color='text.secondary'>
              {totalCount} time{totalCount !== 1 ? 's' : ''} cadastrado{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          {canManage && (
            <Button
              startIcon={<AddIcon />}
              variant='contained'
              onClick={() => navigate('/teams/new')}
              sx={{ flexShrink: 0 }}
            >
              Novo Time
            </Button>
          )}
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
          placeholder={isAdmin ? 'Buscar por nome ou empresa...' : 'Buscar por nome...'}
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
          <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 420 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                {isAdmin && <TableCell sx={colFromSm}>Empresa</TableCell>}
                <TableCell sx={colFromSm}>Coordenador</TableCell>
                <TableCell>Membros</TableCell>
                <TableCell align='right' sx={{ width: 56 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Box display='flex' alignItems='center' gap={1.5}>
                      <Avatar
                        sx={{
                          width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700,
                          bgcolor: alpha(BRAND.purple, 0.15), color: BRAND.purple,
                        }}
                      >
                        <GroupsIcon fontSize='small' />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>{t.name}</Typography>
                    </Box>
                  </TableCell>
                  {isAdmin && (
                    <TableCell sx={colFromSm}>
                      <Typography variant='body2' color='text.secondary'>
                        {t.companyName ?? '—'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>{t.leaderName ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.memberCount} size='small' sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell align='right'>
                    <TableRowActionsMenu
                      canDelete={canManage}
                      onEdit={() => navigate(`/teams/${t.id}/edit`)}
                      onDelete={canManage ? () => handleDelete(t.id) : undefined}
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
          rowsPerPage={ROWS_PER_PAGE}
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
