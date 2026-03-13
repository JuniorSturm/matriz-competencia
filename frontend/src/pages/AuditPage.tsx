import { useState, useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useAuditLogs } from '../hooks/useAuditLogs'
import { auditService, type AuditFilters } from '../services/auditService'
import type { AuditLogDetailResponse, AuditLogResponse } from '../types'
import PageHeader from '../components/PageHeader'
import { BRAND } from '../theme/ThemeProvider'

const ROWS_PER_PAGE = 50
const MAX_RANGE_DAYS = 7

function getTodayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T12:00:00').getTime()
  const b = new Date(to + 'T12:00:00').getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

// Nome da entidade = mesmo nome da tela no menu (AppLayout)
const ENTITY_TYPE_LABELS: Record<string, string> = {
  User: 'Colaboradores',
  Assessment: 'Avaliações',
  Skill: 'Competências',
  SkillExpectation: 'Competências',
  SkillDescription: 'Competências',
  Team: 'Times',
  Role: 'Cargos',
  Company: 'Empresas',
  CompanyUser: 'Empresas',
}

// Operação em português (exibição e filtro). Novos logs só usam Criação, Atualização ou Exclusão.
const OPERATION_LABELS: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  UPSERT: 'Criação ou Atualização', // legado: registros antigos podem ter esse valor
}

const OPERATION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Atualização' },
  { value: 'DELETE', label: 'Exclusão' },
]

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'User', label: 'Colaboradores' },
  { value: 'Assessment', label: 'Avaliações' },
  { value: 'Skill', label: 'Competências' },
  { value: 'SkillExpectation', label: 'Competências (expectativa)' },
  { value: 'SkillDescription', label: 'Competências (descrição)' },
  { value: 'Team', label: 'Times' },
  { value: 'Role', label: 'Cargos' },
  { value: 'Company', label: 'Empresas' },
  { value: 'CompanyUser', label: 'Empresas (usuário)' },
]

export default function AuditPage() {
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<AuditLogDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [entityFilter, setEntityFilter] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [dateFrom, setDateFrom] = useState(() => getTodayISO())
  const [dateTo, setDateTo] = useState(() => getTodayISO())

  const filters: AuditFilters = useMemo(() => {
    const f: AuditFilters = {}
    if (entityFilter) f.entityType = entityFilter
    if (operationFilter) f.operation = operationFilter
    if (!dateFrom || !dateTo) return Object.keys(f).length ? f : undefined
    const from = dateFrom > dateTo ? dateTo : dateFrom
    const to = dateFrom > dateTo ? dateFrom : dateTo
    const days = daysBetween(from, to)
    if (days > MAX_RANGE_DAYS) {
      f.dateFrom = addDays(to, -MAX_RANGE_DAYS)
      f.dateTo = to
    } else {
      f.dateFrom = from
      f.dateTo = to
    }
    return f
  }, [entityFilter, operationFilter, dateFrom, dateTo])

  const { data, isLoading, error, isFetching } = useAuditLogs(page + 1, ROWS_PER_PAGE, filters)

  const logs: AuditLogResponse[] = data?.items ?? []
  const total = data?.totalCount ?? 0

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleFilterChange = () => {
    setPage(0)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    setPage(0)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    setPage(0)
  }

  const from = dateFrom && dateTo ? (dateFrom > dateTo ? dateTo : dateFrom) : ''
  const to = dateFrom && dateTo ? (dateFrom > dateTo ? dateFrom : dateTo) : ''
  const rangeDays = from && to ? daysBetween(from, to) : 0
  const isRangeClamped = rangeDays > MAX_RANGE_DAYS
  const effectiveFrom = isRangeClamped && to ? addDays(to, -MAX_RANGE_DAYS) : from

  const openDetail = async (id: number) => {
    setDetailError(null)
    setLoadingDetail(true)
    try {
      const d = await auditService.getById(id)
      setDetail(d)
    } catch (e) {
      setDetailError('Não foi possível carregar os detalhes do registro de auditoria.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseDetail = () => {
    setDetail(null)
    setDetailError(null)
  }

  if (isLoading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity='error'>Erro ao carregar auditoria.</Alert>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <PageHeader>
        <Typography variant='h5' sx={{ fontWeight: 700, color: 'text.primary' }}>
          Auditoria
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          Histórico de alterações realizadas no sistema.
        </Typography>
      </PageHeader>

      {/* Filtros: Entidade, Operação, intervalo de data */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 2, mb: 2 }}>
        <FormControl size='small' sx={{ minWidth: 180 }}>
          <InputLabel>Entidade</InputLabel>
          <Select
            value={entityFilter}
            label='Entidade'
            onChange={(e) => { setEntityFilter(e.target.value); handleFilterChange() }}
          >
            {ENTITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size='small' sx={{ minWidth: 140 }}>
          <InputLabel>Operação</InputLabel>
          <Select
            value={operationFilter}
            label='Operação'
            onChange={(e) => { setOperationFilter(e.target.value); handleFilterChange() }}
          >
            {OPERATION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              size='small'
              label='Data inicial'
              type='date'
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
            <TextField
              size='small'
              label='Data final'
              type='date'
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />
          </Box>
          {isRangeClamped && (
            <FormHelperText sx={{ mt: 0 }}>
              Intervalo máximo de {MAX_RANGE_DAYS} dias. Exibindo de {effectiveFrom} a {to}.
            </FormHelperText>
          )}
        </Box>
        {(entityFilter || operationFilter || dateFrom !== getTodayISO() || dateTo !== getTodayISO()) && (
          <Button
            size='small'
            variant='outlined'
            onClick={() => {
              setEntityFilter('')
              setOperationFilter('')
              setDateFrom(getTodayISO())
              setDateTo(getTodayISO())
              setPage(0)
            }}
          >
            Limpar filtros
          </Button>
        )}
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
                  <TableCell>Data</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Operação</TableCell>
                  <TableCell>Entidade</TableCell>
                  <TableCell align='right'>Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l: AuditLogResponse) => (
                  <TableRow key={l.id} hover>
                    <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{l.userEmail ?? '—'}</TableCell>
                    <TableCell>{l.ipAddress ?? '—'}</TableCell>
                    <TableCell>
                      <Box
                        component='span'
                        sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          bgcolor: alpha(BRAND.cyan, 0.08),
                          color: BRAND.cyanDark,
                        }}
                      >
                        {OPERATION_LABELS[l.operation] ?? l.operation}
                      </Box>
                    </TableCell>
                    <TableCell>{ENTITY_TYPE_LABELS[l.entityType] ?? l.entityType}</TableCell>
                    <TableCell align='right'>
                      <Button size='small' variant='text' onClick={() => openDetail(l.id)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant='body2' sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        Nenhum registro de auditoria encontrado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component='div'
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={ROWS_PER_PAGE}
            rowsPerPageOptions={[ROWS_PER_PAGE]}
            sx={{ flexShrink: 0, borderTop: 1, borderColor: 'divider' }}
          />
        </Paper>

      <Dialog open={!!detail || loadingDetail} onClose={handleCloseDetail} fullWidth maxWidth='md'>
        <DialogTitle>Detalhes da alteração</DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#0b1020' }}>
          {loadingDetail && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!loadingDetail && detailError && (
            <Alert severity='error'>{detailError}</Alert>
          )}
          {!loadingDetail && detail && (
            <Box sx={{ color: '#e5e7eb', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
              <pre style={{ margin: 0 }}>
                {detail.payload
                  ? JSON.stringify(JSON.parse(detail.payload), null, 2)
                  : '// Nenhum detalhe registrado.'}
              </pre>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

