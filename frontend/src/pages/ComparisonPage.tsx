import { useMemo, useState } from 'react'
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
import { BRAND } from '../theme/ThemeProvider'

const GAP_COLOR = (gap: number) => {
  if (gap <= 0) return 'success'
  if (gap === 1) return 'warning'
  return 'error'
}

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

  const userA = users?.find((u) => u.id === userAId)
  const userB = users?.find((u) => u.id === userBId)
  const userC = users?.find((u) => u.id === userCId)
  const hasC  = !!userCId

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {}
    skills?.forEach((s) => { map[s.id] = s.category })
    return map
  }, [skills])

  return (
    <Box>
      <Box mb={3}>
        <Typography variant='h5' fontWeight={700}>Comparação de Colaboradores</Typography>
        <Typography variant='body2' color='text.secondary'>
          Compare o desempenho de até 3 colaboradores lado a lado
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          background: `linear-gradient(135deg, ${alpha(BRAND.cyan, 0.03)} 0%, ${alpha(BRAND.purple, 0.03)} 100%)`,
        }}
      >
        <Box display='flex' gap={2} flexWrap='wrap' alignItems='flex-end'>
          <FormControl sx={{ minWidth: 220, flex: 1 }}>
            <InputLabel>Colaborador A</InputLabel>
            <Select label='Colaborador A' value={userAId} onChange={(e) => { setUserAId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Selecione...</MenuItem>
              {users?.filter((u) => !u.isManager).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 220, flex: 1 }}>
            <InputLabel>Colaborador B</InputLabel>
            <Select label='Colaborador B' value={userBId} onChange={(e) => { setUserBId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Selecione...</MenuItem>
              {users?.filter((u) => !u.isManager).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 220, flex: 1 }}>
            <InputLabel>Colaborador C (opcional)</InputLabel>
            <Select label='Colaborador C (opcional)' value={userCId} onChange={(e) => { setUserCId(e.target.value); setRun(false) }}>
              <MenuItem value=''>Nenhum</MenuItem>
              {users?.filter((u) => !u.isManager).map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant='contained'
            startIcon={<CompareArrowsIcon />}
            disabled={!userAId || !userBId}
            onClick={() => setRun(true)}
            sx={{
              alignSelf: 'center',
              px: 3,
              py: 1.2,
              borderRadius: '12px',
              minWidth: 140,
            }}
          >
            Comparar
          </Button>
        </Box>
      </Paper>

      {isLoading && <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>}
      {error && <Alert severity='error'>Erro ao carregar comparação.</Alert>}

      {rows && rows.length > 0 && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: '16px' }}
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Competência</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Esperado</TableCell>
                <TableCell>
                  <Box display='flex' alignItems='center' gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.cyan }} />
                    {userA?.name ?? 'A'}
                  </Box>
                </TableCell>
                <TableCell>GAP A</TableCell>
                <TableCell>
                  <Box display='flex' alignItems='center' gap={0.5}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.purple }} />
                    {userB?.name ?? 'B'}
                  </Box>
                </TableCell>
                <TableCell>GAP B</TableCell>
                {hasC && (
                  <TableCell>
                    <Box display='flex' alignItems='center' gap={0.5}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: BRAND.success }} />
                      {userC?.name ?? 'C'}
                    </Box>
                  </TableCell>
                )}
                {hasC && <TableCell>GAP C</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.skillId}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>{r.skillName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryMap[r.skillId] ?? '—'}
                      size='small'
                      sx={{
                        bgcolor: alpha(BRAND.purple, 0.12),
                        color: BRAND.purpleLight,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.expectedLevel}
                      size='small'
                      sx={{ bgcolor: alpha(BRAND.cyan, 0.12), color: BRAND.cyan, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.userALevel}
                      size='small'
                      sx={{ bgcolor: alpha(BRAND.cyan, 0.08), color: BRAND.cyanLight }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.gapA === 0 ? 'OK' : `${r.gapA}`} size='small' color={GAP_COLOR(r.gapA) as 'success' | 'warning' | 'error'} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={r.userBLevel}
                      size='small'
                      sx={{ bgcolor: alpha(BRAND.purple, 0.08), color: BRAND.purpleLight }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={r.gapB === 0 ? 'OK' : `${r.gapB}`} size='small' color={GAP_COLOR(r.gapB) as 'success' | 'warning' | 'error'} />
                  </TableCell>
                  {hasC && r.userCLevel != null && (
                    <>
                      <TableCell>
                        <Chip
                          label={r.userCLevel}
                          size='small'
                          sx={{ bgcolor: alpha(BRAND.success, 0.08), color: BRAND.success }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={r.gapC === 0 ? 'OK' : `${r.gapC}`} size='small' color={GAP_COLOR(r.gapC ?? 0) as 'success' | 'warning' | 'error'} />
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
