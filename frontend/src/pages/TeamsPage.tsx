import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress,
  InputAdornment, Avatar, Chip, TablePagination,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import GroupsIcon from '@mui/icons-material/Groups'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamService } from '../services/teamService'
import { useAuth } from '../hooks/useAuth'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const

export default function TeamsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin ?? false
  const isCoordinator = !!(user?.isCoordinator && !user?.isAdmin && !user?.isManager)
  const canManage = user?.isAdmin || user?.isManager
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const rowsPerPage = 50

  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })

  const filtered = useMemo(() => {
    if (!teams) return []
    if (!nameFilter.trim()) return teams
    const lower = nameFilter.toLowerCase()
    return teams.filter((t) => t.name.toLowerCase().includes(lower) || (isAdmin && t.companyName?.toLowerCase().includes(lower)))
  }, [teams, nameFilter])

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page],
  )

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão do time? Os vínculos dos membros serão removidos.')) return
    await deleteMutation.mutateAsync(id)
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
              {filtered.length} time{filtered.length !== 1 ? 's' : ''} cadastrado{filtered.length !== 1 ? 's' : ''}
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

      <TextField
        placeholder={isAdmin ? 'Buscar por nome ou empresa...' : 'Buscar por nome...'}
        size='small'
        value={nameFilter}
        onChange={(e) => { setNameFilter(e.target.value); setPage(0) }}
        sx={{ mb: 2, mt: 2, minWidth: { xs: 0, sm: 280 }, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

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
              {paginated.map((t) => (
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
                      <Typography variant='body2' color='text.secondary'>{t.companyName ?? '—'}</Typography>
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
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[50]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
    </Box>
  )
}
