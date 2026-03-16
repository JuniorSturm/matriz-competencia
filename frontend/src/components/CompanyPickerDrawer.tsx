import { useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import { useQuery } from '@tanstack/react-query'
import { companyService } from '../services/companyService'
import type { CompanyOptionResponse } from '../types'

interface CompanyPickerDrawerProps {
  open: boolean
  title?: string
  onClose: () => void
  /** Chamado com null para "Todas" ou com a empresa selecionada. */
  onSelect: (company: CompanyOptionResponse | null) => void
}

const ROWS_PER_PAGE = 50

export function CompanyPickerDrawer({ open, title = 'Selecionar empresa', onClose, onSelect }: CompanyPickerDrawerProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['companies', 'options', page + 1, ROWS_PER_PAGE, search.trim() || ''],
    queryFn: () => companyService.getOptionsPaged(page + 1, ROWS_PER_PAGE, search.trim() || undefined),
    enabled: open,
  })

  const items = data?.items ?? []
  const total = data?.totalCount ?? 0

  const handleClose = () => {
    setPage(0)
    setSearch('')
    onClose()
  }

  const handleSelectTodas = () => {
    onSelect(null)
    handleClose()
  }

  const handleSelect = (company: CompanyOptionResponse) => {
    onSelect(company)
    handleClose()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 520, md: 560 }, p: 3, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Box mb={2}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Busque e selecione uma empresa na lista paginada. Ou escolha &quot;Todas&quot; para remover o filtro.
        </Typography>
      </Box>

      <TextField
        placeholder="Buscar por nome..."
        size="small"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'block' }}>
          {isLoading && !data ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small" stickyHeader sx={{ minWidth: 320 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={100}>Ação</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center" width={80}>
                    Ativa
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {page === 0 && !search.trim() && (
                  <TableRow hover sx={{ bgcolor: 'action.hover' }}>
                    <TableCell width={100}>
                      <Button variant="text" size="small" onClick={handleSelectTodas}>
                        Selecionar
                      </Button>
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={600}>
                          Todas (sem filtro)
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell width={100}>
                      <Button variant="text" size="small" onClick={() => handleSelect(c)}>
                        Selecionar
                      </Button>
                    </TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="center" width={80}>
                      {c.isActive ? (
                        <Chip label="Sim" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Não" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
    </Drawer>
  )
}
