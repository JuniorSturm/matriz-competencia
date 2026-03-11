import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Alert, CircularProgress, Chip,
  InputAdornment,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { useSkills, useDeleteSkill } from '../hooks/useSkills'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'
import TableRowActionsMenu from '../components/TableRowActionsMenu'

export default function SkillsPage() {
  const navigate = useNavigate()
  const { data: skills, isLoading, error } = useSkills()
  const deleteMutation = useDeleteSkill()
  const [nameFilter, setNameFilter] = useState('')

  const filteredSkills = useMemo(() => {
    if (!skills) return []
    if (!nameFilter.trim()) return skills
    const lower = nameFilter.toLowerCase()
    return skills.filter((s) => s.name.toLowerCase().includes(lower))
  }, [skills, nameFilter])

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão?')) return
    await deleteMutation.mutateAsync(id)
  }

  if (isLoading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>
  if (error) return <Alert severity='error'>Erro ao carregar competências.</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Box display='flex' justifyContent='space-between' alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap='wrap' gap={2}>
          <Box>
            <Typography variant='h5' fontWeight={700}>Competências</Typography>
            <Typography variant='body2' color='text.secondary'>
              {filteredSkills.length} registro{filteredSkills.length !== 1 ? 's' : ''}
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

      <TextField
        placeholder='Buscar por nome...'
        size='small'
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        sx={{ mb: 2, mt: 2, minWidth: { xs: 0, sm: 280 }, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
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
            {filteredSkills.map((s) => (
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
    </Box>
  )
}
