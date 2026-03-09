import { useMemo } from 'react'
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, LinearProgress,
  Tooltip, Divider, Skeleton, Button,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import PeopleIcon from '@mui/icons-material/People'
import SchoolIcon from '@mui/icons-material/School'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import GroupsIcon from '@mui/icons-material/Groups'
import EmojiObjectsOutlinedIcon from '@mui/icons-material/EmojiObjectsOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useUsers } from '../hooks/useUsers'
import { useSkills } from '../hooks/useSkills'
import { useAuth } from '../hooks/useAuth'
import { useAssessments } from '../hooks/useAssessments'
import { assessmentService } from '../services/assessmentService'
import { BRAND } from '../theme/ThemeProvider'

/* ── Tooltip helper ──────────────────────────────────────── */
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

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  gradient: string
}

function StatCard({ label, value, icon, color, gradient }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 3,
        flex: '1 1 220px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        '&:hover': {
          borderColor: alpha(color, 0.3),
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease',
          boxShadow: `0 8px 30px ${alpha(color, 0.15)}`,
        },
        transition: 'all 0.2s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
        }}
      />
      <Box display='flex' alignItems='flex-start' justifyContent='space-between'>
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ color: 'text.secondary', mb: 1, fontSize: '0.7rem' }}
          >
            {label}
          </Typography>
          <Typography
            variant='h3'
            sx={{
              fontWeight: 700,
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2.5rem',
            }}
          >
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: alpha(color, 0.12),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  )
}

export default function DashboardPage() {
  const { user }         = useAuth()
  const { data: users }  = useUsers()
  const { data: skills } = useSkills()
  const navigate = useNavigate()
  const isManager = user?.isManager ?? false

  const totalUsers    = users?.length  ?? 0
  const totalSkills   = skills?.length ?? 0
  const totalManagers = users?.filter((u) => u.isManager).length ?? 0

  /* ── Collaborator: fetch own assessments ───────────────── */
  const { data: myAssessments, isLoading: myLoading } = useAssessments(
    !isManager && user?.id ? user.id : '',
  )

  const myStats = useMemo(() => {
    if (!myAssessments || myAssessments.length === 0)
      return { total: 0, ok: 0, gap1: 0, gap2plus: 0, aderencia: 0, avgGap: 0, topGaps: [] as NonNullable<typeof myAssessments> }
    const total = myAssessments.length
    const ok = myAssessments.filter(a => a.gap <= 0).length
    const gap1 = myAssessments.filter(a => a.gap === 1).length
    const gap2plus = myAssessments.filter(a => a.gap >= 2).length
    const aderencia = Math.round((ok / total) * 100)
    const avgGap = total > 0
      ? myAssessments.reduce((s, a) => s + Math.max(a.gap, 0), 0) / total
      : 0
    const topGaps = [...myAssessments].filter(a => a.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 5)
    return { total, ok, gap1, gap2plus, aderencia, avgGap, topGaps }
  }, [myAssessments])

  /* ── Manager: fetch assessments for all collaborators ────── */
  const collaborators = useMemo(
    () => (users ?? []).filter(u => !u.isManager && u.roleId && u.gradeId),
    [users],
  )

  const assessmentQueries = useQueries({
    queries: collaborators.map(u => ({
      queryKey: ['assessments', u.id] as const,
      queryFn: () => assessmentService.getByUser(u.id),
      staleTime: 5 * 60_000,
      enabled: isManager,
    })),
  })

  const allLoaded = assessmentQueries.length > 0 && assessmentQueries.every(q => q.isSuccess)
  const someLoading = assessmentQueries.some(q => q.isLoading)

  const team = useMemo(() => {
    if (!allLoaded || collaborators.length === 0) return null

    const userSummaries = collaborators.map((u, i) => {
      const a = assessmentQueries[i]?.data ?? []
      const total = a.length
      const gapOk = a.filter(x => x.gap <= 0).length
      const gap1 = a.filter(x => x.gap === 1).length
      const gap2plus = a.filter(x => x.gap >= 2).length
      const avgGap = total > 0
        ? a.reduce((s, x) => s + Math.max(x.gap, 0), 0) / total
        : 0
      const aderencia = total > 0 ? Math.round((gapOk / total) * 100) : 100
      return { user: u, assessments: a, total, gapOk, gap1, gap2plus, avgGap, aderencia }
    })

    const all = userSummaries.flatMap(us => us.assessments)
    const totalA = all.length
    const tOk = all.filter(x => x.gap <= 0).length
    const t1 = all.filter(x => x.gap === 1).length
    const t2 = all.filter(x => x.gap >= 2).length
    const globalAd = totalA > 0 ? Math.round((tOk / totalA) * 100) : 0
    const globalAvg = totalA > 0 ? all.reduce((s, x) => s + Math.max(x.gap, 0), 0) / totalA : 0

    const byRole: Record<string, { total: number; gapOk: number; users: number; aderencia: number; avgGap: number }> = {}
    for (const us of userSummaries) {
      const r = us.user.roleName ?? 'Sem cargo'
      if (!byRole[r]) byRole[r] = { total: 0, gapOk: 0, users: 0, aderencia: 0, avgGap: 0 }
      byRole[r].total += us.total
      byRole[r].gapOk += us.gapOk
      byRole[r].users += 1
    }
    for (const k of Object.keys(byRole)) {
      const b = byRole[k]
      b.aderencia = b.total > 0 ? Math.round((b.gapOk / b.total) * 100) : 0
      b.avgGap = b.total > 0
        ? userSummaries.filter(us => (us.user.roleName ?? 'Sem cargo') === k)
            .reduce((s, us) => s + us.avgGap, 0) / b.users
        : 0
    }

    const sg: Record<string, { name: string; cat: string; count: number; totalGap: number }> = {}
    for (const a of all) {
      if (a.gap >= 2) {
        if (!sg[a.skillName]) sg[a.skillName] = { name: a.skillName, cat: '', count: 0, totalGap: 0 }
        sg[a.skillName].count += 1
        sg[a.skillName].totalGap += a.gap
      }
    }
    if (skills) for (const s of skills) { if (sg[s.name]) sg[s.name].cat = s.category }
    const criticalSkills = Object.values(sg)
      .sort((a, b) => b.count - a.count || b.totalGap - a.totalGap)
      .slice(0, 5)

    const ranking = [...userSummaries].sort((a, b) => a.aderencia - b.aderencia)

    return {
      globalAd, globalAvg, totalA, tOk, t1, t2,
      criticalGapUsers: userSummaries.filter(us => us.gap2plus > 0).length,
      byRole, criticalSkills, ranking,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded, collaborators.length, skills?.length])

  const adhColor = (pct: number) =>
    pct >= 80 ? BRAND.success : pct >= 50 ? BRAND.warning : BRAND.error

  const adhLabel = (pct: number) =>
    pct >= 80 ? 'Bom' : pct >= 50 ? 'Alerta' : 'Crítico'

  const adhGradEnd = (pct: number) =>
    pct >= 80 ? '#69F0AE' : pct >= 50 ? '#FFE082' : '#FF8A80'

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant='h4' fontWeight={700} sx={{ mb: 0.5 }}>
          Bem-vindo, {user?.name?.split(' ')[0]}
          <Box
            component='span'
            sx={{ ml: 1, display: 'inline-block', animation: 'wave 1.5s ease-in-out infinite', '@keyframes wave': { '0%,100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(20deg)' }, '75%': { transform: 'rotate(-10deg)' } } }}
          >
            👋
          </Box>
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {isManager
            ? 'Painel de gestão — visão geral do time'
            : 'Acompanhe seu desenvolvimento profissional e evolua suas competências.'}
        </Typography>
      </Box>

      {/* ═══ Manager Stat Cards ═══ */}
      {isManager && (
        <Box display='flex' gap={3} flexWrap='wrap' mb={4}>
          <StatCard
            label='COLABORADORES'
            value={totalUsers}
            icon={<PeopleIcon />}
            color={BRAND.cyan}
            gradient={`linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanLight} 100%)`}
          />
          <StatCard
            label='COMPETÊNCIAS'
            value={totalSkills}
            icon={<SchoolIcon />}
            color={BRAND.purple}
            gradient={`linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`}
          />
          <StatCard
            label='GESTORES'
            value={totalManagers}
            icon={<SupervisorAccountIcon />}
            color={BRAND.success}
            gradient={`linear-gradient(135deg, ${BRAND.success} 0%, #69F0AE 100%)`}
          />
          {team && (
            <StatCard
              label='ADERÊNCIA GERAL'
              value={`${team.globalAd}%`}
              icon={<TrendingUpIcon />}
              color={adhColor(team.globalAd)}
              gradient={`linear-gradient(135deg, ${adhColor(team.globalAd)} 0%, ${adhGradEnd(team.globalAd)} 100%)`}
            />
          )}
        </Box>
      )}

      {/* ═══ Manager loading state ═══ */}
      {isManager && someLoading && (
        <Box display='flex' flexDirection='column' gap={2} mb={4}>
          <Skeleton variant='rounded' height={160} sx={{ borderRadius: '16px' }} />
          <Skeleton variant='rounded' height={200} sx={{ borderRadius: '16px' }} />
        </Box>
      )}

      {/* ═══ Manager Team Summary ═══ */}
      {isManager && team && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant='h5' fontWeight={700} mb={3} display='flex' alignItems='center' gap={1}>
            <GroupsIcon sx={{ color: BRAND.cyan }} /> Visão Geral do Time
          </Typography>

          {/* KPI Row */}
          <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }} gap={2} mb={3}>
            <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={800} color='success.main'>{team.globalAd}%</Typography>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Aderência Geral
                <InfoTip title='Percentual global de competências sem GAP (nível atual ≥ esperado) considerando todos os colaboradores do time.' />
              </Typography>
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={800} color='warning.main'>{team.globalAvg.toFixed(1)}</Typography>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                GAP Médio
                <InfoTip title='Média aritmética dos GAPs positivos de todo o time. Quanto menor, melhor o desempenho geral.' />
              </Typography>
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={800} color='error.main'>{team.criticalGapUsers}</Typography>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Com GAP Crítico
                <InfoTip title='Colaboradores que possuem ao menos uma competência com GAP ≥ 2 (defasagem crítica).' />
              </Typography>
            </Paper>
            <Paper sx={{ p: 2.5, borderRadius: '16px', textAlign: 'center' }}>
              <Typography variant='h3' fontWeight={800} color={BRAND.purple}>{team.totalA}</Typography>
              <Typography variant='body2' color='text.secondary' fontWeight={600}>
                Avaliações
                <InfoTip title='Total de pares (colaborador × competência) avaliados no sistema.' />
              </Typography>
            </Paper>
          </Box>

          {/* Gap Distribution */}
          <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
            <Typography variant='subtitle1' fontWeight={700} mb={2}>
              Distribuição de GAP — Time
              <InfoTip title='Classificação global dos GAPs: OK (atende/supera), GAP = 1 (defasagem leve), GAP ≥ 2 (defasagem crítica).' />
            </Typography>
            <Box display='flex' gap={3} flexWrap='wrap'>
              {[
                { label: 'Sem GAP (OK)', value: team.tOk, icon: <CheckCircleOutlineIcon fontSize='small' />, color: BRAND.success },
                { label: 'GAP = 1', value: team.t1, icon: <WarningAmberIcon fontSize='small' />, color: BRAND.warning },
                { label: 'GAP ≥ 2', value: team.t2, icon: <ErrorOutlineIcon fontSize='small' />, color: BRAND.error },
              ].map(g => (
                <Box key={g.label} display='flex' alignItems='center' gap={1}>
                  <Box sx={{ color: g.color }}>{g.icon}</Box>
                  <Typography variant='body2' fontWeight={600}>{g.label}:</Typography>
                  <Chip label={g.value} size='small' sx={{ bgcolor: alpha(g.color, 0.12), color: g.color, fontWeight: 700 }} />
                  {team.totalA > 0 && (
                    <Typography variant='caption' color='text.disabled'>
                      ({Math.round((g.value / team.totalA) * 100)}%)
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Aderência por Cargo */}
          <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
            <Typography variant='subtitle1' fontWeight={700} mb={2}>
              Aderência por Cargo
              <InfoTip title='Aderência média agrupada por cargo. Mostra quantos colaboradores cada cargo possui e o percentual de competências sem GAP.' />
            </Typography>
            {Object.entries(team.byRole)
              .sort(([, a], [, b]) => a.aderencia - b.aderencia)
              .map(([role, d]) => (
                <Box key={role} mb={2}>
                  <Box display='flex' justifyContent='space-between' alignItems='center' mb={0.5}>
                    <Typography variant='body2' fontWeight={600}>{role}</Typography>
                    <Box display='flex' alignItems='center' gap={1}>
                      <Chip label={`${d.users} colab.`} size='small' sx={{ fontSize: '0.7rem', height: 20 }} />
                      <Typography variant='body2' fontWeight={700} sx={{ color: adhColor(d.aderencia), minWidth: 40, textAlign: 'right' }}>
                        {d.aderencia}%
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={d.aderencia}
                    sx={{
                      height: 8, borderRadius: 4,
                      bgcolor: alpha(adhColor(d.aderencia), 0.12),
                      '& .MuiLinearProgress-bar': { bgcolor: adhColor(d.aderencia), borderRadius: 4 },
                    }}
                  />
                </Box>
              ))}
          </Paper>

          <Box display='grid' gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
            {/* Ranking de Colaboradores */}
            <Paper sx={{ p: 3, borderRadius: '16px' }}>
              <Typography variant='subtitle1' fontWeight={700} mb={2}>
                Ranking de Colaboradores
                <InfoTip title='Colaboradores ordenados por aderência (do menor para o maior). Os primeiros da lista precisam de mais atenção para desenvolvimento.' />
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size='small' stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Colaborador</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cargo</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Aderência</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.ranking.map((r, i) => (
                      <TableRow key={r.user.id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{i + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.user.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{r.user.roleName ?? '—'}</TableCell>
                        <TableCell align='center'>
                          <Box display='flex' alignItems='center' gap={1} justifyContent='center'>
                            <LinearProgress
                              variant='determinate'
                              value={r.aderencia}
                              sx={{
                                width: 60, height: 6, borderRadius: 3,
                                bgcolor: alpha(adhColor(r.aderencia), 0.12),
                                '& .MuiLinearProgress-bar': { bgcolor: adhColor(r.aderencia), borderRadius: 3 },
                              }}
                            />
                            <Typography variant='caption' fontWeight={700} sx={{ color: adhColor(r.aderencia) }}>
                              {r.aderencia}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={adhLabel(r.aderencia)}
                            size='small'
                            sx={{
                              fontWeight: 700, fontSize: '0.65rem', height: 22,
                              bgcolor: alpha(adhColor(r.aderencia), 0.12),
                              color: adhColor(r.aderencia),
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Competências Mais Críticas */}
            {team.criticalSkills.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: '16px' }}>
                <Typography variant='subtitle1' fontWeight={700} mb={2}>
                  Competências Mais Críticas
                  <InfoTip title='As 5 competências com maior número de colaboradores com GAP ≥ 2. São as que mais precisam de planos de desenvolvimento.' />
                </Typography>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Competência</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Categoria</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Colab.</TableCell>
                      <TableCell align='center' sx={{ fontWeight: 700, fontSize: '0.75rem' }}>GAP Médio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.criticalSkills.map(cs => (
                      <TableRow key={cs.name} hover>
                        <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{cs.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{cs.cat || '—'}</TableCell>
                        <TableCell align='center'>
                          <Chip label={cs.count} size='small' sx={{ fontWeight: 700, bgcolor: alpha(BRAND.error, 0.12), color: BRAND.error }} />
                        </TableCell>
                        <TableCell align='center'>
                          <Typography variant='body2' fontWeight={700} color='error.main'>
                            {(cs.totalGap / cs.count).toFixed(1)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* ═══ Collaborator Dashboard ═══ */}
      {!isManager && (
        <>
          {/* Loading state */}
          {myLoading && (
            <Box display='flex' flexDirection='column' gap={2} mb={4}>
              <Skeleton variant='rounded' height={100} sx={{ borderRadius: '16px' }} />
              <Skeleton variant='rounded' height={200} sx={{ borderRadius: '16px' }} />
            </Box>
          )}

          {/* KPI Cards */}
          {!myLoading && myAssessments && myAssessments.length > 0 && (
            <Box display='flex' gap={3} flexWrap='wrap' mb={4}>
              <StatCard
                label='AVALIADAS'
                value={myStats.total}
                icon={<SchoolIcon />}
                color={BRAND.purple}
                gradient={`linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`}
              />
              <StatCard
                label='ADERÊNCIA'
                value={`${myStats.aderencia}%`}
                icon={<TrendingUpIcon />}
                color={adhColor(myStats.aderencia)}
                gradient={`linear-gradient(135deg, ${adhColor(myStats.aderencia)} 0%, ${adhGradEnd(myStats.aderencia)} 100%)`}
              />
              <StatCard
                label='SEM GAP'
                value={myStats.ok}
                icon={<CheckCircleOutlineIcon />}
                color={BRAND.success}
                gradient={`linear-gradient(135deg, ${BRAND.success} 0%, #69F0AE 100%)`}
              />
              <StatCard
                label='COM GAP'
                value={myStats.gap1 + myStats.gap2plus}
                icon={<WarningAmberIcon />}
                color={myStats.gap2plus > 0 ? BRAND.error : BRAND.warning}
                gradient={myStats.gap2plus > 0
                  ? `linear-gradient(135deg, ${BRAND.error} 0%, #FF8A80 100%)`
                  : `linear-gradient(135deg, ${BRAND.warning} 0%, #FFE082 100%)`
                }
              />
            </Box>
          )}

          {/* Gap Overview */}
          {!myLoading && myStats.topGaps.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
              <Typography variant='subtitle1' fontWeight={700} mb={0.5} display='flex' alignItems='center' gap={1}>
                <ErrorOutlineIcon sx={{ color: BRAND.warning, fontSize: 22 }} />
                Seus Principais GAPs
              </Typography>
              <Typography variant='body2' color='text.secondary' mb={2}>
                Competências que mais precisam de atenção. Para detalhes completos, acesse a aba <b>Resumo</b> em Avaliações.
              </Typography>

              <Box display='flex' flexDirection='column' gap={1.5}>
                {myStats.topGaps.map(a => (
                  <Box
                    key={a.skillId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: '12px',
                      bgcolor: alpha(a.gap >= 2 ? BRAND.error : BRAND.warning, 0.06),
                    }}
                  >
                    <Chip
                      label={`GAP ${a.gap}`}
                      size='small'
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        minWidth: 60,
                        bgcolor: alpha(a.gap >= 2 ? BRAND.error : BRAND.warning, 0.14),
                        color: a.gap >= 2 ? BRAND.error : BRAND.warning,
                      }}
                    />
                    <Box flex={1}>
                      <Typography variant='body2' fontWeight={600}>{a.skillName}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Esperado: {a.expectedLevel} · Atual: {a.currentLevel}
                      </Typography>
                    </Box>
                    <Chip
                      label={a.gap >= 2 ? 'Crítico' : 'Atenção'}
                      size='small'
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 22,
                        bgcolor: alpha(a.gap >= 2 ? BRAND.error : BRAND.warning, 0.12),
                        color: a.gap >= 2 ? BRAND.error : BRAND.warning,
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* No assessments yet fallback */}
          {!myLoading && (!myAssessments || myAssessments.length === 0) && (
            <Paper
              sx={{
                p: 4, borderRadius: '16px', textAlign: 'center', mb: 3,
                background: `linear-gradient(135deg, ${alpha(BRAND.cyan, 0.05)} 0%, ${alpha(BRAND.purple, 0.05)} 100%)`,
              }}
            >
              <EmojiObjectsOutlinedIcon sx={{ fontSize: 48, color: BRAND.warning, mb: 1 }} />
              <Typography variant='h6' fontWeight={700} mb={1}>
                Nenhuma avaliação encontrada
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Seu gestor ainda não realizou sua avaliação de competências.
                Enquanto isso, explore as seções do sistema para se familiarizar.
              </Typography>
            </Paper>
          )}

          {/* Orientation Cards */}
          <Divider sx={{ my: 3 }} />
          <Typography variant='subtitle1' fontWeight={700} mb={2} display='flex' alignItems='center' gap={1}>
            <EmojiObjectsOutlinedIcon sx={{ color: BRAND.warning, fontSize: 22 }} />
            Explore o Skillhub
          </Typography>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: `1px solid transparent`,
              maxWidth: 480,
              '&:hover': { borderColor: BRAND.cyan, boxShadow: `0 4px 20px ${alpha(BRAND.cyan, 0.15)}` },
            }}
            onClick={() => navigate('/assessments')}
          >
            <Box display='flex' alignItems='center' gap={1.5} mb={1}>
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: '12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanLight} 100%)`,
                  color: '#fff',
                }}
              >
                <AssignmentOutlinedIcon fontSize='small' />
              </Box>
              <Typography variant='subtitle2' fontWeight={700}>Avaliações</Typography>
            </Box>
            <Typography variant='body2' color='text.secondary' mb={1.5}>
              Veja suas competências avaliadas, níveis esperados vs. atuais, e o resumo completo com indicadores de aderência e GAP.
            </Typography>
            <Button
              size='small'
              endIcon={<ArrowForwardIcon />}
              sx={{ textTransform: 'none', fontWeight: 600, color: BRAND.cyan }}
            >
              Acessar Avaliações
            </Button>
          </Paper>
        </>
      )}
    </Box>
  )
}
