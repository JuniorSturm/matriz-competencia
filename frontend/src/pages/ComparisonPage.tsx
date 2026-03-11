import { memo, useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import { useUsers } from '../hooks/useUsers'
import { useComparison } from '../hooks/useAssessments'
import { useSkills } from '../hooks/useSkills'
import type { ComparisonRow as ComparisonRowType } from '../types'
import { BRAND } from '../theme/ThemeProvider'
import PageHeader from '../components/PageHeader'

const GAP_COLOR = (gap: number) => {
  if (gap <= 0) return 'success'
  if (gap === 1) return 'warning'
  return 'error'
}

const catChipSx = {
  bgcolor: alpha(BRAND.purple, 0.12),
  color: BRAND.purpleLight,
  fontWeight: 600,
  fontSize: '0.7rem',
} as const

const expectedChipSx = { bgcolor: alpha(BRAND.cyan, 0.12), color: BRAND.cyan, fontWeight: 600 } as const
const levelAChipSx   = { bgcolor: alpha(BRAND.cyan, 0.10), color: BRAND.cyanDark, fontWeight: 600 } as const
const levelBChipSx   = { bgcolor: alpha(BRAND.purple, 0.08), color: BRAND.purpleLight } as const
const levelCChipSx   = { bgcolor: alpha(BRAND.success, 0.08), color: BRAND.success } as const

const colFromSm = { display: { xs: 'none', sm: 'table-cell' } } as const

interface ComparisonRowProps {
  r: ComparisonRowType
  category: string
  hasC: boolean
}

const ComparisonRow = memo(function ComparisonRow({ r, category, hasC }: ComparisonRowProps) {
  return (
    <TableRow>
      <TableCell>
        <Typography variant='body2' fontWeight={600}>{r.skillName}</Typography>
      </TableCell>
      <TableCell sx={colFromSm}>
        <Chip label={category} size='small' sx={catChipSx} />
      </TableCell>
      <TableCell sx={colFromSm}>
        <Chip label={r.expectedLevel} size='small' sx={expectedChipSx} />
      </TableCell>
      <TableCell>
        <Chip label={r.userALevel} size='small' sx={levelAChipSx} />
      </TableCell>
      <TableCell>
        <Chip label={r.gapA === 0 ? 'OK' : `${r.gapA}`} size='small' color={GAP_COLOR(r.gapA) as 'success' | 'warning' | 'error'} />
      </TableCell>
      <TableCell>
        <Chip label={r.userBLevel} size='small' sx={levelBChipSx} />
      </TableCell>
      <TableCell>
        <Chip label={r.gapB === 0 ? 'OK' : `${r.gapB}`} size='small' color={GAP_COLOR(r.gapB) as 'success' | 'warning' | 'error'} />
      </TableCell>
      {hasC && r.userCLevel != null && (
        <>
          <TableCell>
            <Chip label={r.userCLevel} size='small' sx={levelCChipSx} />
          </TableCell>
          <TableCell>
            <Chip label={r.gapC === 0 ? 'OK' : `${r.gapC}`} size='small' color={GAP_COLOR(r.gapC ?? 0) as 'success' | 'warning' | 'error'} />
          </TableCell>
        </>
      )}
    </TableRow>
  )
})

export default function ComparisonPage() {
  const { data: users } = useUsers()
  const { data: skills } = useSkills()
  const [userAId, setUserAId] = useState('')
  const [userBId, setUserBId] = useState('')
  const [userCId, setUserCId] = useState('')
  const [run, setRun]         = useState(false)

  const { data: rows, isLoading, error } = useComparison(
    run ? userAId : '',
    run ? userBId : '',
    run && userCId ? userCId : undefined,
  )

  const userA = useMemo(() => users?.find((u) => u.id === userAId), [users, userAId])
  const userB = useMemo(() => users?.find((u) => u.id === userBId), [users, userBId])
  const userC = useMemo(() => users?.find((u) => u.id === userCId), [users, userCId])
  const hasC  = !!userCId

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {}
    skills?.forEach((s) => { map[s.id] = s.category })
    return map
  }, [skills])

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader>
        <Box mb={0}>
          <Typography variant='h5' fontWeight={700}>Comparação de Colaboradores</Typography>
          <Typography variant='body2' color='text.secondary'>
            Compare o desempenho de até 3 colaboradores lado a lado
          </Typography>
        </Box>
      </PageHeader>

      <Box sx={{ mt: 1, flexShrink: 0 }}>
      <Paper
        sx={{
          p: 3,
          mb: 2,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          background: `linear-gradient(135deg, ${alpha(BRAND.cyan, 0.03)} 0%, ${alpha(BRAND.purple, 0.03)} 100%)`,
        }}
      >
        <Box display='flex' flexDirection={{ xs: 'column', sm: 'row' }} gap={2} flexWrap='wrap' alignItems='stretch'>
          <FormControl sx={{ minWidth: { xs: 0, sm: 220 }, flex: { sm: 1 } }}>
            <InputLabel>Colaborador A</InputLabel>
            <Select label='Colaborador A' value={userAId} onChange={(e) => { setUserAId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Selecione...</MenuItem>
              {users?.filter((u) => !u.isManager && !u.isCoordinator).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: 0, sm: 220 }, flex: { sm: 1 } }}>
            <InputLabel>Colaborador B</InputLabel>
            <Select label='Colaborador B' value={userBId} onChange={(e) => { setUserBId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Selecione...</MenuItem>
              {users?.filter((u) => !u.isManager && !u.isCoordinator).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: 0, sm: 220 }, flex: { sm: 1 } }}>
            <InputLabel>Colaborador C (opcional)</InputLabel>
            <Select label='Colaborador C (opcional)' value={userCId} onChange={(e) => { setUserCId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Nenhum</MenuItem>
              {users?.filter((u) => !u.isManager && !u.isCoordinator).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant='contained'
            startIcon={<CompareArrowsIcon />}
            disabled={!userAId || !userBId}
            onClick={() => setRun(true)}
            sx={{
              alignSelf: { xs: 'stretch', sm: 'center' },
              px: 3,
              py: 1.2,
              minWidth: { xs: '100%', sm: 140 },
            }}
          >
            Comparar
          </Button>
        </Box>
      </Paper>

      {isLoading && <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>}
      {error && <Alert severity='error'>Erro ao carregar comparação.</Alert>}
      </Box>

      {rows && rows.length > 0 && (
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
            <Table size='small' stickyHeader sx={{ minWidth: { xs: 0, sm: 560 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Competência</TableCell>
                <TableCell sx={{ ...colFromSm, whiteSpace: 'nowrap' }}>Categoria</TableCell>
                <TableCell sx={{ ...colFromSm, whiteSpace: 'nowrap' }}>Esperado</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Box display='flex' alignItems='center' gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.cyan, flexShrink: 0 }} />
                    {userA?.name?.split(' ')[0] ?? 'A'}
                  </Box>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 70 }}>GAP A</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Box display='flex' alignItems='center' gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.purple, flexShrink: 0 }} />
                    {userB?.name?.split(' ')[0] ?? 'B'}
                  </Box>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 70 }}>GAP B</TableCell>
                {hasC && (
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Box display='flex' alignItems='center' gap={0.5}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.success, flexShrink: 0 }} />
                      {userC?.name?.split(' ')[0] ?? 'C'}
                    </Box>
                  </TableCell>
                )}
                {hasC && <TableCell sx={{ whiteSpace: 'nowrap', minWidth: 70 }}>GAP C</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <ComparisonRow
                  key={r.skillId}
                  r={r}
                  category={categoryMap[r.skillId] ?? '—'}
                  hasC={hasC}
                />
              ))}
            </TableBody>
          </Table>
          </TableContainer>
        </Paper>
      )}

      {rows && rows.length === 0 && run && !isLoading && (
        <Alert severity='info' sx={{ borderRadius: '12px' }}>
          Nenhuma competência em comum encontrada. Verifique se os colaboradores pertencem a times e se os times possuem competências vinculadas.
        </Alert>
      )}
    </Box>
  )
}
