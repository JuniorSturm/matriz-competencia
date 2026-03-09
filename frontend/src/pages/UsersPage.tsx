import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { useUsers, useDeleteUser } from '../hooks/useUsers'
import { BRAND } from '../theme/ThemeProvider'

export default function UsersPage() {
  const navigate = useNavigate()
  const { data: users, isLoading, error } = useUsers()
  const deleteMutation = useDeleteUser()
  const [nameFilter, setNameFilter] = useState('')

  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!nameFilter.trim()) return users
    const lower = nameFilter.toLowerCase()
    return users.filter((u) => u.name.toLowerCase().includes(lower))
  }, [users, nameFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('Confirma exclusão?')) return
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar usuários.</Alert>

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
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
          sx={{ borderRadius: '12px' }}
        >
          Novo Colaborador
        </Button>
      </Box>

      <TextField
        placeholder='Buscar por nome...'
        size='small'
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        sx={{ mb: 3, minWidth: 320 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer
        component={Paper}
        sx={{ borderRadius: '16px' }}
      >
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>E-mail</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Graduação</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell align='right'>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Typography variant='body2' fontWeight={600}>{u.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' color='text.secondary'>{u.email}</Typography>
                </TableCell>
                <TableCell>{u.roleName ?? '—'}</TableCell>
                <TableCell>{u.gradeName ?? '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={u.isManager ? 'Gestor' : 'Colaborador'}
                    size='small'
                    sx={{
                      bgcolor: u.isManager
                        ? alpha(BRAND.purple, 0.15)
                        : alpha(BRAND.cyan, 0.12),
                      color: u.isManager ? BRAND.purple : BRAND.cyan,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  />
                </TableCell>
                <TableCell align='right'>
                  <IconButton size='small' onClick={() => navigate(`/users/${u.id}/edit`)} sx={{ color: BRAND.cyan }}>
                    <EditIcon fontSize='small' />
                  </IconButton>
                  <IconButton size='small' onClick={() => handleDelete(u.id)} sx={{ color: BRAND.error }}>
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
