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
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { usePagedUsers } from '../hooks/useUsers'
import type { UserResponse } from '../types'

interface UserPickerDrawerProps {
  open: boolean
  title: string
  onClose: () => void
  onSelect: (user: UserResponse) => void
}

export function UserPickerDrawer({ open, title, onClose, onSelect }: UserPickerDrawerProps) {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const rowsPerPage = 50

  const { data, isLoading } = usePagedUsers(page + 1, rowsPerPage, search || undefined, true)

  const users = data?.items ?? []
  const total = data?.totalCount ?? 0

  const handleClose = () => {
    setPage(0)
    setSearch('')
    onClose()
  }

  const colEmailSx   = { display: { xs: 'none', sm: 'table-cell' } } as const
  const colCompanySx = { display: { xs: 'none', md: 'table-cell' } } as const

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 640, md: 720 }, p: 3, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Box mb={2}>
        <Typography variant='h6' fontWeight={700}>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          Busque e selecione um colaborador na lista paginada.
        </Typography>
      </Box>

      <TextField
        placeholder='Buscar por nome...'
        size='small'
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      <Paper sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'block' }}>
          {isLoading && !data ? (
            <Box display='flex' justifyContent='center' py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 520 } }}>
              <TableHead>
                <TableRow>
                  <TableCell width={80}>Selecionar</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell sx={colEmailSx}>E-mail</TableCell>
                  <TableCell sx={colCompanySx}>Empresa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u: UserResponse) => (
                  <TableRow key={u.id} hover>
                    <TableCell width={80}>
                      <Button
                        variant='text'
                        size='small'
                        onClick={() => { onSelect(u); handleClose() }}
                      >
                        Selecionar
                      </Button>
                    </TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell sx={colEmailSx}>{u.email}</TableCell>
                    <TableCell sx={colCompanySx}>{u.companyName ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>
    </Drawer>
  )
}

