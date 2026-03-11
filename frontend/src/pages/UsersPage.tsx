import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment, TablePagination,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { useUsers, useDeleteUser } from '../hooks/useUsers'
import { useAuth } from '../hooks/useAuth'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'

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
  const { data: users, isLoading, error } = useUsers()
  const deleteMutation = useDeleteUser()
  const { user: loggedUser } = useAuth()
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const rowsPerPage = 50

  const isLoggedAdmin = loggedUser?.isAdmin ?? false
  const isLoggedGestor = (loggedUser?.isManager ?? false) && !isLoggedAdmin
  const isLoggedCoordinator = (loggedUser?.isCoordinator ?? false) && !isLoggedAdmin && !(loggedUser?.isManager ?? false)
  const canDelete = isLoggedAdmin || isLoggedGestor

  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!nameFilter.trim()) return users
    const lower = nameFilter.toLowerCase()
    return users.filter((u) => u.name.toLowerCase().includes(lower))
  }, [users, nameFilter])

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredUsers, page],
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma exclusão?')) return
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar usuários.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', pr: 3 }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Box>
            <Typography variant='h5' fontWeight={700}>Colaboradores</Typography>
            <Typography variant='body2' color='text.secondary'>
              {filteredUsers.length} registro{filteredUsers.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
          startIcon={<AddIcon />}
          variant='contained'
          onClick={() => navigate('/users/new')}
        >
          Novo Colaborador
        </Button>
        </Box>
      </PageHeader>

      <TextField
        placeholder='Buscar por nome...'
        size='small'
        value={nameFilter}
        onChange={(e) => { setNameFilter(e.target.value); setPage(0) }}
        sx={{ mb: 2, mt: 2, minWidth: 320, flexShrink: 0 }}
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
          <Table size='small' stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                {isLoggedAdmin && <TableCell>Empresa</TableCell>}
                <TableCell>Cargo</TableCell>
                <TableCell>Nível</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell align='right'>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.map((u) => {
                const profile = getProfileColor(u)
                const isCommonUser = !u.isAdmin && !u.isManager && !u.isCoordinator
                const canEditUser = !isLoggedCoordinator || isCommonUser

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>{u.email}</Typography>
                    </TableCell>
                    {isLoggedAdmin && <TableCell>{u.companyName ?? '—'}</TableCell>}
                    <TableCell>{u.roleName ?? '—'}</TableCell>
                    <TableCell>{u.gradeName ?? '—'}</TableCell>
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
                      {canEditUser && (
                        <IconButton size='small' onClick={() => navigate(`/users/${u.id}/edit`)} sx={{ color: BRAND.cyan }}>
                          <EditIcon fontSize='small' />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton size='small' onClick={() => handleDelete(u.id)} sx={{ color: BRAND.error }}>
                          <DeleteIcon fontSize='small' />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={filteredUsers.length}
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
