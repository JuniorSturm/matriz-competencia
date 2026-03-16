import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment, Snackbar, TablePagination,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import { usePagedSkills, useDeleteSkill } from '../hooks/useSkills'
import { useAuth } from '../hooks/useAuth'
import { CompanyPickerDrawer } from '../components/CompanyPickerDrawer'
import type { CompanyOptionResponse, SkillResponse } from '../types'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

export default function SkillsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.isAdmin ?? false
  const [companyFilter, setCompanyFilter] = useState<number | ''>('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyOptionResponse | null>(null)
  const [companyDrawerOpen, setCompanyDrawerOpen] = useState(false)
  const companyIdForApi = isAdmin && companyFilter !== '' ? (companyFilter as number) : undefined
  const [page, setPage] = useState(0)
  const rowsPerPage = 50
  const { data, isLoading, error } = usePagedSkills(page + 1, rowsPerPage, companyIdForApi)
  const deleteMutation = useDeleteSkill()
  const [nameFilter, setNameFilter] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleCompanySelect = (company: CompanyOptionResponse | null) => {
    setSelectedCompany(company)
    setCompanyFilter(company?.id ?? '')
    setPage(0)
  }

  const skills = data?.items ?? []
  const totalCount = data?.totalCount ?? 0

  const filteredSkills = useMemo<SkillResponse[]>(() => {
    if (!skills) return []
    if (!nameFilter.trim()) return skills
    const lower = nameFilter.toLowerCase()
    return skills.filter((s) => s.name.toLowerCase().includes(lower))
  }, [skills, nameFilter])

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão da competência?')) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setDeleteError(e?.response?.data?.message ?? 'Não foi possível excluir. Existem registros associados a esta competência ou uma regra de negócio impede a exclusão.')
    }
  }

  if (isLoading && !data) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar competências.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Competências</Typography>
            <Typography variant='body2' color='text.secondary'>
              {totalCount} registro{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            variant='contained'
            onClick={() => navigate('/skills/new')}
            sx={{ flexShrink: 0 }}
          >
            Nova Competência
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
          onChange={(e) => setNameFilter(e.target.value)}
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

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: '16px',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'block',
        }}
      >
        <Table size='small' stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell align='right' sx={{ width: 56 }}>Ações</TableCell>
            </TableRow>
          </TableHead>
            <TableBody>
            {filteredSkills.map((s: SkillResponse) => (
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
                  <TableRowActionsMenu
                    onEdit={() => navigate(`/skills/${s.id}/edit`)}
                    onDelete={() => handleDelete(s.id)}
                    editLabel='Editar'
                    deleteLabel='Excluir'
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Paper
        sx={{
          borderRadius: '0 0 16px 16px',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          mt: -1,
        }}
      >
        <TablePagination
          component='div'
          count={totalCount}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
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
