import { useMemo, useState } from 'react'
import {
  Alert, Box, CircularProgress, Drawer, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Skeleton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Chip, Tab, Tabs,
  LinearProgress, Divider, Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useUsers } from '../hooks/useUsers'
import { useAssessments, useUpsertAssessment } from '../hooks/useAssessments'
import { useSkills, useSkillDescriptions } from '../hooks/useSkills'
import type { CompetencyLevel } from '../types'
import { LEVELS } from '../types'
import { useAuth } from '../hooks/useAuth'
import { BRAND } from '../theme/ThemeProvider'

/* ── Tooltip helper ─────────────────────────────────────────── */
const InfoTip = ({ title }: { title: string }) => (
  <Tooltip
    title={title}
    arrow
    placement='top'
    slotProps={{ tooltip: { sx: { maxWidth: 320, fontSize: '0.8rem', lineHeight: 1.5 } } }}
  >
    <InfoOutlinedIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.disabled', cursor: 'help', verticalAlign: 'middle' }} />
  </Tooltip>
)

const GAP_COLOR = (gap: number) => {
  if (gap <= 0) return 'success'
  if (gap === 1) return 'warning'
  return 'error'
}

const LEVEL_CHIP_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  PRATA: '#9E9E9E',
  OURO: '#FFD700',
}

const LEVEL_ORDER = ['BRONZE', 'PRATA', 'OURO'] as const

export default function AssessmentsPage() {
  const { user: authUser } = useAuth()
  const { data: users }    = useUsers()
  const { data: skills }   = useSkills()
  const [selectedUserId, setSelectedUserId] = useState<string>(authUser?.isManager ? '' : (authUser?.id ?? ''))
  const { data: assessments, isLoading, error } = useAssessments(selectedUserId)
  const upsertMutation = useUpsertAssessment()
  const [tabIndex, setTabIndex] = useState(0)

  /* ── Flyout state ─────────────────────────────────────────────── */
  const [drawerSkillId, setDrawerSkillId] = useState<number | null>(null)
  const drawerOpen = drawerSkillId !== null
  const { data: descriptions, isLoading: descLoading } = useSkillDescriptions(drawerSkillId)

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  )

  const drawerDescriptions = useMemo(() => {
    if (!descriptions || !selectedUser?.roleId) return []
    return LEVEL_ORDER
      .map((lvl) => {
        const d = descriptions.find(
          (desc) => desc.roleId === selectedUser.roleId && desc.level === lvl,
        )
        return { level: lvl, description: d?.description ?? null }
      })
  }, [descriptions, selectedUser])

  const drawerSkillName = useMemo(
    () => assessments?.find((a) => a.skillId === drawerSkillId)?.skillName ?? '',
    [assessments, drawerSkillId],
  )

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {}
    skills?.forEach((s) => { map[s.id] = s.category })
    return map
  }, [skills])

  /* ── Summary computed data ─────────────────────────────────────── */
  const summary = useMemo(() => {
    if (!assessments || assessments.length === 0) return null

    const total = assessments.length

    // Per-category counts
    const byCat: Record<string, { total: number; gapOk: number; gap1: number; gap2plus: number }> = {}
    // Level distribution (current)
    const levelDist: Record<string, number> = { DESCONHECE: 0, BRONZE: 0, PRATA: 0, OURO: 0 }
    // Gap distribution
    let gapOk = 0, gap1 = 0, gap2plus = 0, gapNeg = 0
    let totalGap = 0

    for (const a of assessments) {
      const cat = categoryMap[a.skillId] ?? 'Outros'
      if (!byCat[cat]) byCat[cat] = { total: 0, gapOk: 0, gap1: 0, gap2plus: 0 }
      byCat[cat].total++

      levelDist[a.currentLevel] = (levelDist[a.currentLevel] ?? 0) + 1

      if (a.gap <= 0) { gapOk++; byCat[cat].gapOk++ }
      else if (a.gap === 1) { gap1++; byCat[cat].gap1++ }
      else { gap2plus++; byCat[cat].gap2plus++ }

      if (a.gap < 0) gapNeg++
      totalGap += Math.max(0, a.gap)
    }

    const avgGap = total > 0 ? totalGap / total : 0
    const aderencia = total > 0 ? Math.round(((gapOk) / total) * 100) : 0

    return { total, byCat, levelDist, gapOk, gap1, gap2plus, gapNeg, avgGap, aderencia }
  }, [assessments, categoryMap])

  const handleLevelChange = async (skillId: number, level: CompetencyLevel) => {
    if (!selectedUserId) return
    await upsertMutation.mutateAsync({ userId: selectedUserId, skillId, currentLevel: level })
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant='h5' fontWeight={700}>Avaliação de Competências</Typography>
        <Typography variant='body2' color='text.secondary'>
          Avalie o nível atual de cada competência
        </Typography>
      </Box>

      {authUser?.isManager && (
        <FormControl sx={{ mb: 3, minWidth: 300 }}>
          <InputLabel>Colaborador</InputLabel>
          <Select
            label='Colaborador'
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <MenuItem value=''>Selecione...</MenuItem>
            {users?.filter((u) => !u.isManager).map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {isLoading && <Box display='flex' justifyContent='center' py={6}><CircularProgress /></Box>}
      {error && <Alert severity='error'>Erro ao carregar avaliações.</Alert>}

      {assessments && assessments.length > 0 && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
              <Tab label='Avaliações' />
              <Tab label='Resumo' />
            </Tabs>
          </Box>

          {/* ── TAB 0: Grid ────────────────────────────────────────── */}
          {tabIndex === 0 && (
            <TableContainer
              component={Paper}
              sx={{ borderRadius: '16px' }}
            >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Competência</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Cargo</TableCell>
                <TableCell>Esperado</TableCell>
                <TableCell>Atual</TableCell>
                <TableCell>GAP</TableCell>
                <TableCell align='center'>Detalhes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assessments.map((a) => (
                <TableRow key={a.skillId}>
                  <TableCell>
                    <Typography variant='body2' fontWeight={600}>{a.skillName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryMap[a.skillId] ?? '—'}
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
                    <Typography variant='body2' color='text.secondary'>{a.roleName ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={a.expectedLevel}
                      size='small'
                      sx={{
                        bgcolor: alpha(BRAND.cyan, 0.12),
                        color: BRAND.cyan,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {authUser?.isManager ? (
                      <Select
                        size='small'
                        value={a.currentLevel}
                        onChange={(e) => handleLevelChange(a.skillId, e.target.value as CompetencyLevel)}
                        sx={{ minWidth: 120 }}
                      >
                        {LEVELS.map((l) => (
                          <MenuItem key={l} value={l}>{l}</MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Chip label={a.currentLevel} size='small' />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={a.gap === 0 ? 'OK' : `${a.gap > 0 ? '+' : ''}${a.gap}`}
                      size='small'
                      color={GAP_COLOR(a.gap) as 'success' | 'warning' | 'error'}
                    />
                  </TableCell>
                  <TableCell align='center'>
                    <IconButton
                      size='small'
                      onClick={() => setDrawerSkillId(a.skillId)}
                      sx={{ color: BRAND.cyan }}
                    >
                      <InfoOutlinedIcon fontSize='small' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
          )}

          {/* ── TAB 1: Resumo ──────────────────────────────────────── */}
          {tabIndex === 1 && summary && (
            <Box display='flex' flexDirection='column' gap={3}>
              {/* KPI Cards */}
              <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2}>
                <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
                  <Typography variant='h3' fontWeight={800} color={BRAND.cyan}>{summary.total}</Typography>
                  <Typography variant='body2' color='text.secondary' fontWeight={600}>
                    Competências
                    <InfoTip title='Número total de competências vinculadas ao cargo e graduação do colaborador selecionado.' />
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
                  <Typography variant='h3' fontWeight={800} color='success.main'>{summary.aderencia}%</Typography>
                  <Typography variant='body2' color='text.secondary' fontWeight={600}>
                    Aderência
                    <InfoTip title='Percentual de competências sem GAP (nível atual ≥ nível esperado). Calculado como: (competências com GAP ≤ 0 / total de competências) × 100.' />
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
                  <Typography variant='h3' fontWeight={800} color='warning.main'>{summary.avgGap.toFixed(1)}</Typography>
                  <Typography variant='body2' color='text.secondary' fontWeight={600}>
                    GAP Médio
                    <InfoTip title='Média aritmética dos GAPs positivos (somente defasagens). GAP = nível esperado − nível atual. Valores negativos (supera) são contados como 0.' />
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
                  <Typography variant='h3' fontWeight={800} color={BRAND.purple}>{summary.gapNeg}</Typography>
                  <Typography variant='body2' color='text.secondary' fontWeight={600}>
                    Superam
                    <InfoTip title='Número de competências em que o colaborador supera o nível esperado (GAP negativo — nível atual maior que o esperado).' />
                  </Typography>
                </Paper>
              </Box>

              {/* Gap distribution */}
              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={700} mb={2}>
                  Distribuição de GAP
                  <InfoTip title='Agrupa as competências em 3 faixas de GAP: OK (atende ou supera, GAP ≤ 0), GAP = 1 (defasagem leve) e GAP ≥ 2 (defasagem crítica). O GAP é calculado como nível esperado − nível atual.' />
                </Typography>
                <Box display='flex' gap={3} flexWrap='wrap'>
                  {[
                    { label: 'Sem GAP (OK)', count: summary.gapOk, icon: <CheckCircleOutlineIcon />, color: 'success.main' },
                    { label: 'GAP = 1', count: summary.gap1, icon: <WarningAmberIcon />, color: 'warning.main' },
                    { label: 'GAP ≥ 2', count: summary.gap2plus, icon: <ErrorOutlineIcon />, color: 'error.main' },
                  ].map((item) => (
                    <Box key={item.label} display='flex' alignItems='center' gap={1.5} flex={1} minWidth={140}>
                      <Box sx={{ color: item.color, display: 'flex' }}>{item.icon}</Box>
                      <Box>
                        <Typography variant='h5' fontWeight={800} color={item.color}>{item.count}</Typography>
                        <Typography variant='caption' color='text.secondary'>{item.label}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Level distribution */}
              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={700} mb={2}>
                  Nível Atual — Distribuição
                  <InfoTip title='Mostra quantas competências o colaborador possui em cada nível atualmente avaliado: OURO (domínio pleno), PRATA (intermediário), BRONZE (básico) e DESCONHECE (não avaliado ou sem conhecimento).' />
                </Typography>
                <Box display='flex' flexDirection='column' gap={1.5}>
                  {(['OURO', 'PRATA', 'BRONZE', 'DESCONHECE'] as const).map((lvl) => {
                    const count = summary.levelDist[lvl] ?? 0
                    const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
                    const barColor = LEVEL_CHIP_COLORS[lvl] ?? '#9E9E9E'
                    return (
                      <Box key={lvl} display='flex' alignItems='center' gap={2}>
                        <Chip
                          label={lvl}
                          size='small'
                          sx={{
                            minWidth: 100,
                            fontWeight: 700,
                            bgcolor: alpha(barColor, 0.15),
                            color: lvl === 'DESCONHECE' ? 'text.secondary' : barColor,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant='determinate'
                            value={pct}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              bgcolor: (t) => alpha(barColor, t.palette.mode === 'dark' ? 0.12 : 0.08),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                                bgcolor: barColor,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant='body2' fontWeight={700} sx={{ minWidth: 60, textAlign: 'right' }}>
                          {count} ({pct}%)
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Paper>

              {/* Per-category breakdown */}
              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={700} mb={2}>
                  Detalhamento por Categoria
                  <InfoTip title='Apresenta a quantidade de competências por categoria, com a distribuição de GAPs (OK, GAP 1, GAP ≥ 2) e a aderência percentual de cada categoria. Aderência = (competências OK / total da categoria) × 100.' />
                </Typography>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Categoria</TableCell>
                        <TableCell align='center'>Total</TableCell>
                        <TableCell align='center'>
                          <Chip label='OK' size='small' color='success' variant='outlined' sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip label='GAP 1' size='small' color='warning' variant='outlined' sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip label='GAP ≥2' size='small' color='error' variant='outlined' sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align='center'>Aderência</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(summary.byCat)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([cat, data]) => {
                          const catAdh = data.total > 0 ? Math.round((data.gapOk / data.total) * 100) : 0
                          return (
                            <TableRow key={cat}>
                              <TableCell>
                                <Chip
                                  label={cat}
                                  size='small'
                                  sx={{
                                    bgcolor: alpha(BRAND.purple, 0.12),
                                    color: BRAND.purpleLight,
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell align='center'>
                                <Typography fontWeight={700}>{data.total}</Typography>
                              </TableCell>
                              <TableCell align='center'>
                                <Typography fontWeight={600} color='success.main'>{data.gapOk}</Typography>
                              </TableCell>
                              <TableCell align='center'>
                                <Typography fontWeight={600} color='warning.main'>{data.gap1}</Typography>
                              </TableCell>
                              <TableCell align='center'>
                                <Typography fontWeight={600} color='error.main'>{data.gap2plus}</Typography>
                              </TableCell>
                              <TableCell align='center'>
                                <Chip
                                  label={`${catAdh}%`}
                                  size='small'
                                  color={catAdh >= 80 ? 'success' : catAdh >= 50 ? 'warning' : 'error'}
                                  sx={{ fontWeight: 700 }}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      <TableRow sx={{ '& td': { fontWeight: 700, borderTop: 2, borderColor: 'divider' } }}>
                        <TableCell><Typography fontWeight={700}>Total</Typography></TableCell>
                        <TableCell align='center'><Typography fontWeight={700}>{summary.total}</Typography></TableCell>
                        <TableCell align='center'><Typography fontWeight={700} color='success.main'>{summary.gapOk}</Typography></TableCell>
                        <TableCell align='center'><Typography fontWeight={700} color='warning.main'>{summary.gap1}</Typography></TableCell>
                        <TableCell align='center'><Typography fontWeight={700} color='error.main'>{summary.gap2plus}</Typography></TableCell>
                        <TableCell align='center'>
                          <Chip label={`${summary.aderencia}%`} size='small' color={summary.aderencia >= 80 ? 'success' : summary.aderencia >= 50 ? 'warning' : 'error'} sx={{ fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Competências com maior GAP */}
              {(() => {
                const criticals = assessments!
                  .filter((a) => a.gap >= 2)
                  .sort((a, b) => b.gap - a.gap)
                  .slice(0, 5)
                if (criticals.length === 0) return null
                return (
                  <Paper sx={{ p: 3, borderRadius: '16px' }}>
                    <Typography variant='subtitle1' fontWeight={700} mb={2}>
                      Maiores GAPs (Top 5)
                      <InfoTip title='Lista as 5 competências com maior defasagem (GAP ≥ 2), ordenadas do maior para o menor. Essas são as competências que requerem mais atenção para desenvolvimento do colaborador.' />
                    </Typography>
                    <Box display='flex' flexDirection='column' gap={1}>
                      {criticals.map((a) => (
                        <Box
                          key={a.skillId}
                          display='flex'
                          alignItems='center'
                          justifyContent='space-between'
                          sx={{
                            py: 1,
                            px: 2,
                            borderRadius: '10px',
                            bgcolor: (t) => alpha(t.palette.error.main, t.palette.mode === 'dark' ? 0.08 : 0.04),
                          }}
                        >
                          <Box>
                            <Typography variant='body2' fontWeight={600}>{a.skillName}</Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {categoryMap[a.skillId] ?? '—'} &bull; Esperado: {a.expectedLevel} &bull; Atual: {a.currentLevel}
                            </Typography>
                          </Box>
                          <Chip label={`+${a.gap}`} size='small' color='error' sx={{ fontWeight: 700 }} />
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                )
              })()}
            </Box>
          )}
        </>
      )}

      {assessments && assessments.length === 0 && selectedUserId && (
        <Alert severity='info' sx={{ borderRadius: '12px' }}>
          Nenhuma competência encontrada para este colaborador.
        </Alert>
      )}

      {/* ── Flyout de Descrições ──────────────────────────────────── */}
      <Drawer
        anchor='right'
        open={drawerOpen}
        onClose={() => setDrawerSkillId(null)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 420 }, p: 3 },
        }}
      >
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
          <Box>
            <Typography variant='h6' fontWeight={700}>Descrição por Nível</Typography>
            <Typography variant='body2' color='text.secondary'>{drawerSkillName}</Typography>
          </Box>
          <IconButton onClick={() => setDrawerSkillId(null)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {descLoading && (
          <Box>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant='rounded' height={80} sx={{ mb: 2, borderRadius: '12px' }} />
            ))}
          </Box>
        )}

        {!descLoading && drawerDescriptions.map(({ level, description }) => (
          <Box
            key={level}
            sx={{
              mb: 2,
              p: 2,
              borderRadius: '12px',
              bgcolor: (t) => alpha(LEVEL_CHIP_COLORS[level], t.palette.mode === 'dark' ? 0.15 : 0.08),
              border: 1,
              borderColor: (t) => alpha(LEVEL_CHIP_COLORS[level], t.palette.mode === 'dark' ? 0.3 : 0.2),
            }}
          >
            <Chip
              label={level}
              size='small'
              sx={{
                mb: 1,
                fontWeight: 700,
                bgcolor: alpha(LEVEL_CHIP_COLORS[level], 0.2),
                color: LEVEL_CHIP_COLORS[level],
                border: `1px solid ${alpha(LEVEL_CHIP_COLORS[level], 0.4)}`,
              }}
            />
            <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-line' }}>
              {description ?? 'Sem descrição cadastrada.'}
            </Typography>
          </Box>
        ))}

        {!descLoading && drawerDescriptions.length === 0 && (
          <Alert severity='info' sx={{ borderRadius: '12px' }}>
            Nenhuma descrição cadastrada para esta competência.
          </Alert>
        )}
      </Drawer>
    </Box>
  )
}
