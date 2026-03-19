import { useMemo, useState } from 'react'
import {
  Box,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SchoolIcon from '@mui/icons-material/School'
import { alpha } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import InfoTip from '../../components/InfoTip'
import { BRAND } from '../../theme/ThemeProvider'
import { dashboardService } from '../../services/dashboardService'
import type { ManagerCompanyDashboard } from '../../types'

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

export default function ManagerDashboardPage() {
  const { data, isLoading } = useQuery<ManagerCompanyDashboard>({
    queryKey: ['dashboard-manager-company'],
    queryFn: () => dashboardService.getManagerCompany(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  const teams = data?.teams ?? []
  const [tab, setTab] = useState(0)

  const activeTeam = useMemo(() => {
    if (teams.length === 0) return null
    return teams[Math.min(tab, teams.length - 1)]
  }, [teams, tab])

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <PageHeader>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h4' fontWeight={800} sx={{ mb: 0.5 }}>
            Panorama da Empresa
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Visão macro para priorizar ações por time e por competência.
          </Typography>
        </Box>
      </PageHeader>

      {isLoading && (
        <Box display='flex' flexDirection='column' gap={2} mb={3}>
          <Skeleton variant='rounded' height={120} sx={{ borderRadius: '16px' }} />
          <Skeleton variant='rounded' height={260} sx={{ borderRadius: '16px' }} />
        </Box>
      )}

      {!isLoading && data && (
        <>
          <Typography variant='h6' fontWeight={800} mb={1} display='flex' alignItems='center' gap={1}>
            <GroupsIcon sx={{ color: BRAND.cyan }} /> {data.companyName}
          </Typography>

          <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
            <StatPill
              label='Aderência (empresa)'
              value={`${data.summary.adherencePct}%`}
              color={adhColor(data.summary.adherencePct)}
              tip='Percentual de avaliações sem GAP (GAP ≤ 0). Cálculo: (OK / Total) × 100. GAP = nível esperado − nível atual.'
            />
            <StatPill
              label='GAP Médio (empresa)'
              value={data.summary.avgGap.toFixed(1)}
              color={BRAND.warning}
              tip='Média dos GAPs positivos (defasagens). GAPs negativos são considerados 0. Cálculo: AVG(MAX(GAP, 0)).'
            />
            <StatPill
              label='Avaliações (empresa)'
              value={`${data.summary.total}`}
              color={BRAND.purple}
              tip='Quantidade de pares (colaborador × competência) considerados nas métricas da empresa.'
            />
            <StatPill
              label='GAP ≥ 2 (empresa)'
              value={`${data.summary.gap2Plus}`}
              color={BRAND.error}
              tip='Quantidade de avaliações com defasagem crítica. Critério: GAP ≥ 2.'
            />
          </Box>

          <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Typography variant='subtitle1' fontWeight={800} mb={2}>
                Times mais críticos (Top {data.topCriticalTeams.length || 0})
                <InfoTip title='Ordenação: menor aderência, depois maior GAP ≥ 2 e maior GAP médio. Serve para priorizar ações táticas por time.' />
              </Typography>
              {data.topCriticalTeams.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  Sem dados suficientes ainda (verifique se os times possuem competências vinculadas e colaboradores com cargo/nível).
                </Typography>
              ) : (
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Time</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Aderência</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>GAP ≥ 2</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topCriticalTeams.map((t) => (
                      <TableRow key={t.teamId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{t.teamName}</TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={`${t.adherencePct}%`}
                            size='small'
                            sx={{ fontWeight: 800, bgcolor: alpha(adhColor(t.adherencePct), 0.12), color: adhColor(t.adherencePct) }}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip label={t.gap2Plus} size='small' sx={{ fontWeight: 800, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800, color: BRAND.warning }}>
                          {t.avgGap.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Typography variant='subtitle1' fontWeight={800} mb={2} display='flex' alignItems='center' gap={1}>
                <SchoolIcon sx={{ color: BRAND.purple }} /> Competências mais críticas (empresa)
                <InfoTip title='Competências com maior número de ocorrências com GAP ≥ 2 na empresa. GAP Médio aqui é a média do GAP apenas das ocorrências críticas.' />
              </Typography>
              {data.topCriticalSkills.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  Sem competências críticas ainda (GAP ≥ 2).
                </Typography>
              ) : (
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Competência</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Categoria</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Ocorrências</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topCriticalSkills.map((s) => (
                      <TableRow key={s.skillId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{s.skillName}</TableCell>
                        <TableCell>{s.categoryName}</TableCell>
                        <TableCell align='center'>
                          <Chip label={s.criticalCount} size='small' sx={{ fontWeight: 800, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                        </TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800, color: BRAND.error }}>
                          {s.avgCriticalGap.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography variant='h5' fontWeight={900} mb={2} display='flex' alignItems='center' gap={1}>
            <TrendingUpIcon sx={{ color: BRAND.cyan }} /> Visão por Time
          </Typography>

          {teams.length >= 2 && (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(typeof v === 'number' ? v : 0)}
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
            >
              {teams.map((t, idx) => (
                <Tab key={t.teamId} label={t.teamName} id={`mgr-team-tab-${idx}`} />
              ))}
            </Tabs>
          )}

          {!activeTeam && (
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Typography variant='body2' color='text.secondary' fontWeight={700}>
                Nenhum time com dados para exibir ainda.
              </Typography>
            </Paper>
          )}

          {activeTeam && (
            <>
              <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
                <StatPill
                  label='Aderência (time)'
                  value={`${activeTeam.summary.adherencePct}%`}
                  color={adhColor(activeTeam.summary.adherencePct)}
                  tip='Percentual de avaliações sem GAP no time. (OK / Total) × 100.'
                />
                <StatPill
                  label='GAP Médio (time)'
                  value={activeTeam.summary.avgGap.toFixed(1)}
                  color={BRAND.warning}
                  tip='Média das defasagens no time. AVG(MAX(GAP, 0)).'
                />
                <StatPill
                  label='Avaliações (time)'
                  value={`${activeTeam.summary.total}`}
                  color={BRAND.purple}
                  tip='Quantidade de pares (colaborador × competência) considerados para este time.'
                />
                <StatPill
                  label='GAP ≥ 2 (time)'
                  value={`${activeTeam.summary.gap2Plus}`}
                  color={BRAND.error}
                  tip='Quantidade de avaliações críticas no time (GAP ≥ 2).'
                />
              </Box>

              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={800} mb={2}>
                  Distribuição de GAP — {activeTeam.teamName}
                  <InfoTip title='OK: GAP ≤ 0 (atende ou supera). GAP = 1: defasagem leve. GAP ≥ 2: defasagem crítica. GAP = esperado − atual.' />
                </Typography>
                <Box display='flex' gap={3} flexWrap='wrap'>
                  {[
                    { label: 'OK', value: activeTeam.summary.ok, icon: <TrendingUpIcon fontSize='small' />, color: BRAND.success },
                    { label: 'GAP = 1', value: activeTeam.summary.gap1, icon: <WarningAmberIcon fontSize='small' />, color: BRAND.warning },
                    { label: 'GAP ≥ 2', value: activeTeam.summary.gap2Plus, icon: <ErrorOutlineIcon fontSize='small' />, color: BRAND.error },
                  ].map((g) => (
                    <Box key={g.label} display='flex' alignItems='center' gap={1}>
                      <Box sx={{ color: g.color }}>{g.icon}</Box>
                      <Typography variant='body2' fontWeight={800}>
                        {g.label}:
                      </Typography>
                      <Chip label={g.value} size='small' sx={{ bgcolor: alpha(g.color, 0.12), color: g.color, fontWeight: 900 }} />
                      {activeTeam.summary.total > 0 && (
                        <Typography variant='caption' color='text.disabled'>
                          ({Math.round((g.value / activeTeam.summary.total) * 100)}%)
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Box mt={3} />

              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={800} mb={2}>
                  Competências críticas — {activeTeam.teamName}
                  <InfoTip title='Competências com mais ocorrências críticas (GAP ≥ 2) neste time. Ocorrências = quantos colaboradores estão críticos nessa competência.' />
                </Typography>
                {activeTeam.criticalSkills.length === 0 ? (
                  <Typography variant='body2' color='text.secondary'>
                    Nenhuma competência com GAP ≥ 2 neste time.
                  </Typography>
                ) : (
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Competência</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Categoria</TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Ocorrências</TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                        <TableCell align='center' sx={{ fontWeight: 800, fontSize: '0.75rem' }}>
                          Impacto
                          <InfoTip title='Cálculo relacionado à Aderência do time:\n\nAderência do time = (OK / TotalDoTime) × 100, onde OK = GAP <= 0.\nTotalDoTime = quantidade de pares (membro do time x competencia vinculada ao time) usados nos calculos.\n\nImpacto (time) desta competencia = (OcorrenciasCriticas / TotalDoTime) × 100.\nOcorrenciasCriticas = pares com GAP >= 2 para esta competencia.\n\nSe voce "zerar" essas ocorrencias criticas (GAP >= 2 -> GAP <= 0), a Aderencia do time aumenta exatamente em Impacto (time) (em pontos percentuais).\n\nImpacto (categoria) exibido na linha "Cat." = (OcorrenciasCriticasNaCategoria / TotalDaCategoria) × 100, calculado para a mesma competencia dentro da sua categoria.' />
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeTeam.criticalSkills.map((cs) => (
                        <TableRow key={cs.skillId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{cs.skillName}</TableCell>
                          <TableCell>{cs.categoryName}</TableCell>
                          <TableCell align='center'>
                            <Chip label={cs.criticalCount} size='small' sx={{ fontWeight: 800, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                          </TableCell>
                          <TableCell align='center' sx={{ fontWeight: 900, color: BRAND.error }}>
                            {cs.avgCriticalGap.toFixed(1)}
                          </TableCell>
                          <TableCell align='center'>
                            {(() => {
                              const totalTime = Math.max(0, activeTeam.summary.total)
                              const timeImpactRaw = totalTime > 0 ? (cs.criticalCount / totalTime) * 100 : 0
                              const timeImpactPct = Math.min(100, timeImpactRaw)

                              const catTotal = Math.max(0, cs.categoryTotalPairs)
                              const catCritical = Math.max(0, cs.categoryCriticalCount)
                              const categoryImpactRaw = catTotal > 0 ? (catCritical / catTotal) * 100 : 0
                              const categoryImpactPct = Math.min(100, categoryImpactRaw)

                              return (
                                <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' gap={0.6}>
                              <LinearProgress
                                variant='determinate'
                                value={timeImpactPct}
                                sx={{
                                  width: 70,
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: alpha(BRAND.error, 0.12),
                                  '& .MuiLinearProgress-bar': { bgcolor: BRAND.error, borderRadius: 3 },
                                }}
                              />
                              <Typography variant='caption' fontWeight={900} sx={{ minWidth: 40, textAlign: 'center' }}>
                                {timeImpactPct.toFixed(2)}%
                              </Typography>
                              <Typography variant='caption' color='text.disabled' sx={{ fontWeight: 800 }}>
                                Cat.: {categoryImpactPct.toFixed(2)}%
                              </Typography>
                                </Box>
                              )
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            </>
          )}
        </>
      )}
    </Box>
  )
}

