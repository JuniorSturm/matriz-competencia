import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment, Avatar, TablePagination,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { companyService } from '../services/companyService'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const

export default function CompaniesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [nameFilter, setNameFilter] = useState('')
  const [page, setPage] = useState(0)
  const rowsPerPage = 50

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: companyService.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => companyService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] }),
  })

  const filtered = useMemo(() => {
    if (!companies) return []
    if (!nameFilter.trim()) return companies
    const lower = nameFilter.toLowerCase()
    return companies.filter((c) => c.name.toLowerCase().includes(lower))
  }, [companies, nameFilter])

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page],
  )

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão da empresa? Os usuários vinculados serão desassociados.')) return
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar empresas.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Empresas</Typography>
            <Typography variant='body2' color='text.secondary'>
              {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} cadastrada{filtered.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant='contained'
            onClick={() => navigate('/companies/new')}
            sx={{ flexShrink: 0 }}
          >
            Nova Empresa
          </Button>
        </Box>
      </PageHeader>

      <TextField
        placeholder='Buscar por nome...'
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
          <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 520 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Empresa</TableCell>
                <TableCell sx={colFromSm}>CNPJ</TableCell>
                <TableCell sx={colFromSm}>E-mail</TableCell>
                <TableCell sx={colFromSm}>Telefone</TableCell>
                <TableCell sx={colFromSm}>Colaboradores</TableCell>
                <TableCell sx={colFromSm}>Gestores</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='right' sx={{ width: 56 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Box display='flex' alignItems='center' gap={1.5}>
                      <Avatar
                        sx={{
                          width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700,
                          bgcolor: alpha(BRAND.cyan, 0.15), color: BRAND.cyan,
                        }}
                      >
                        <BusinessIcon fontSize='small' />
                      </Avatar>
                      <Typography variant='body2' fontWeight={600}>{c.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>{c.document ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>{c.email ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>{c.phone ?? '—'}</Typography>
                  </TableCell>
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>
                      {c.users.filter((u) => !u.isManager).length}
                    </Typography>
                  </TableCell>
                  <TableCell sx={colFromSm}>
                    <Typography variant='body2' color='text.secondary'>
                      {c.users.filter((u) => u.isManager).length}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.isActive ? 'Ativa' : 'Inativa'}
                      size='small'
                      sx={{
                        bgcolor: c.isActive ? alpha(BRAND.success, 0.12) : alpha(BRAND.error, 0.12),
                        color: c.isActive ? BRAND.success : BRAND.error,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <TableRowActionsMenu
                      onEdit={() => navigate(`/companies/${c.id}/edit`)}
                      onDelete={() => handleDelete(c.id)}
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
