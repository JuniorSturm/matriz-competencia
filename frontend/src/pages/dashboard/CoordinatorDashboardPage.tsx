import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Divider,
  Paper,
  Alert,
  Skeleton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SchoolIcon from '@mui/icons-material/School'
import { alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import InfoTip from '../../components/InfoTip'
import { BRAND } from '../../theme/ThemeProvider'
import { dashboardService } from '../../services/dashboardService'
import type { CoordinatorTeamsDashboard } from '../../types'

function adhColor(pct: number) {
  return pct >= 80 ? BRAND.success : pct >= 50 ? BRAND.warning : BRAND.error
}

function StatPill({ label, value, color, tip }: { label: string; value: string; color: string; tip?: string }) {
  return (
    <Paper sx={{ p: 2.25, borderRadius: '16px', textAlign: 'center' }}>
      <Typography variant='h3' fontWeight={800} sx={{ color }}>
        {value}
      </Typography>
      <Typography variant='body2' color='text.secondary' fontWeight={700}>
        {label}
        {tip ? <InfoTip title={tip} /> : null}
      </Typography>
    </Paper>
  )
}

export default function CoordinatorDashboardPage() {
  const { data, isLoading, isError } = useQuery<CoordinatorTeamsDashboard>({
    queryKey: ['dashboard-coordinator-teams'],
    queryFn: () => dashboardService.getCoordinatorTeams(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  const teams = data?.teams ?? []
  const [tab, setTab] = useState(0)

  const active = useMemo(() => {
    if (teams.length === 0) return null
    return teams[Math.min(tab, teams.length - 1)]
  }, [teams, tab])

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <PageHeader>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h4' fontWeight={800} sx={{ mb: 0.5 }}>
            Visão das Equipes
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Métricas isoladas por time, com foco em ações por competência e por colaborador.
          </Typography>
        </Box>
      </PageHeader>

      {isLoading && (
        <Box display='flex' flexDirection='column' gap={2} mb={3}>
          <Skeleton variant='rounded' height={120} sx={{ borderRadius: '16px' }} />
          <Skeleton variant='rounded' height={260} sx={{ borderRadius: '16px' }} />
        </Box>
      )}

      {!isLoading && isError && (
        <Alert severity='error' sx={{ borderRadius: '12px', mb: 2 }}>
          Erro ao carregar a dashboard do coordenador. Tente novamente em instantes.
        </Alert>
      )}

      {!isLoading && teams.length === 0 && (
        <Paper sx={{ p: 3, borderRadius: '16px' }}>
          <Typography variant='body2' color='text.secondary' fontWeight={700}>
            Nenhum time vinculado como líder (coordenador) para exibir ainda.
          </Typography>
        </Paper>
      )}

      {!isLoading && teams.length > 0 && (
        <>
          {teams.length >= 2 && (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(typeof v === 'number' ? v : 0)}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              {teams.map((t, idx) => (
                <Tab key={t.teamId} label={t.teamName} id={`coord-team-tab-${idx}`} />
              ))}
            </Tabs>
          )}

          {active && (
            <>
              <Typography variant='h6' fontWeight={900} mb={2} display='flex' alignItems='center' gap={1}>
                <GroupsIcon sx={{ color: BRAND.cyan }} /> {active.teamName}
                {active.companyName && (
                  <Typography component='span' variant='body2' color='text.secondary' fontWeight={600}>
                    — {active.companyName}
                  </Typography>
                )}
              </Typography>

              <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
                <StatPill
                  label='Aderência (time)'
                  value={`${active.summary.adherencePct}%`}
                  color={adhColor(active.summary.adherencePct)}
                  tip='Percentual de avaliações sem GAP no time. (OK / Total) × 100. GAP = esperado − atual.'
                />
                <StatPill
                  label='GAP Médio (time)'
                  value={active.summary.avgGap.toFixed(1)}
                  color={BRAND.warning}
                  tip='Média dos GAPs positivos (defasagens) no time. AVG(MAX(GAP, 0)).'
                />
                <StatPill
                  label='Avaliações (time)'
                  value={`${active.summary.total}`}
                  color={BRAND.purple}
                  tip='Quantidade de pares (colaborador × competência) considerados para este time.'
                />
                <StatPill
                  label='GAP ≥ 2 (time)'
                  value={`${active.summary.gap2Plus}`}
                  color={BRAND.error}
                  tip='Quantidade de avaliações críticas no time (GAP ≥ 2).'
                />
              </Box>

              <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
                <Typography variant='subtitle1' fontWeight={900} mb={2}>
                  Distribuição de GAP
                  <InfoTip title='OK: GAP ≤ 0 (atende ou supera). GAP = 1: defasagem leve. GAP ≥ 2: defasagem crítica. GAP = esperado − atual.' />
                </Typography>
                <Box display='flex' gap={3} flexWrap='wrap'>
                  {[
                    { label: 'OK', value: active.summary.ok, color: BRAND.success },
                    { label: 'GAP = 1', value: active.summary.gap1, color: BRAND.warning },
                    { label: 'GAP ≥ 2', value: active.summary.gap2Plus, color: BRAND.error },
                  ].map((g) => (
                    <Box key={g.label} display='flex' alignItems='center' gap={1}>
                      <Typography variant='body2' fontWeight={900}>
                        {g.label}:
                      </Typography>
                      <Chip label={g.value} size='small' sx={{ bgcolor: alpha(g.color, 0.12), color: g.color, fontWeight: 900 }} />
                      {active.summary.total > 0 && (
                        <Typography variant='caption' color='text.disabled'>
                          ({Math.round((g.value / active.summary.total) * 100)}%)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
                <Paper sx={{ p: 3, borderRadius: '16px' }}>
                  <Typography variant='subtitle1' fontWeight={900} mb={2} display='flex' alignItems='center' gap={1}>
                    <SchoolIcon sx={{ color: BRAND.purple }} /> Competências críticas
                    <InfoTip title='Competências com mais ocorrências críticas (GAP ≥ 2) neste time. Ocorrências = quantos colaboradores estão críticos nessa competência.' />
                  </Typography>
                  {active.criticalSkills.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      Nenhuma competência com GAP ≥ 2 neste time.
                    </Typography>
                  ) : (
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Competência</TableCell>
                          <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Categoria</TableCell>
                          <TableCell align='center' sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Ocorrências</TableCell>
                          <TableCell align='center' sx={{ fontWeight: 900, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {active.criticalSkills.map((cs) => (
                          <TableRow key={cs.skillId} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{cs.skillName}</TableCell>
                            <TableCell>{cs.categoryName}</TableCell>
                            <TableCell align='center'>
                              <Chip label={cs.criticalCount} size='small' sx={{ fontWeight: 900, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                            </TableCell>
                            <TableCell align='center' sx={{ fontWeight: 900, color: BRAND.error }}>
                              {cs.avgCriticalGap.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Paper>

                <Paper sx={{ p: 3, borderRadius: '16px' }}>
                  <Typography variant='subtitle1' fontWeight={900} mb={2} display='flex' alignItems='center' gap={1}>
                    <ErrorOutlineIcon sx={{ color: BRAND.warning }} /> Colaboradores críticos (time)
                    <InfoTip title='Ranking ordenado por menor aderência, depois maior GAP ≥ 2 e maior GAP médio. Ajuda a priorizar quem precisa de atenção primeiro.' />
                  </Typography>
                  {active.criticalPeople.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      Sem colaboradores para ranquear (verifique cargo/nível e competências do time).
                    </Typography>
                  ) : (
                    <TableContainer sx={{ maxHeight: 360 }}>
                      <Table size='small' stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Colaborador</TableCell>
                            <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Cargo</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Aderência</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 900, fontSize: '0.75rem' }}>GAP ≥ 2</TableCell>
                            <TableCell align='center' sx={{ fontWeight: 900, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {active.criticalPeople.map((p) => (
                            <TableRow key={p.userId} hover>
                              <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                              <TableCell>{p.roleName ?? '—'}</TableCell>
                              <TableCell align='center'>
                                <Chip
                                  label={`${p.adherencePct}%`}
                                  size='small'
                                  sx={{ fontWeight: 900, bgcolor: alpha(adhColor(p.adherencePct), 0.12), color: adhColor(p.adherencePct) }}
                                />
                              </TableCell>
                              <TableCell align='center'>
                                <Chip label={p.gap2Plus} size='small' sx={{ fontWeight: 900, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                              </TableCell>
                              <TableCell align='center' sx={{ fontWeight: 900, color: BRAND.warning }}>
                                {p.avgGap.toFixed(1)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              </Box>

              <Divider sx={{ my: 3 }} />
              <Typography variant='caption' color='text.secondary'>
                Observação: métricas são calculadas apenas com as competências vinculadas ao time e com colaboradores que possuem cargo e nível.
              </Typography>
            </>
          )}
        </>
      )}
    </Box>
  )
}

