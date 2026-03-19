import { Box, Chip, Paper, Skeleton, Typography } from '@mui/material'
import SchoolIcon from '@mui/icons-material/School'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EmojiObjectsOutlinedIcon from '@mui/icons-material/EmojiObjectsOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { alpha } from '@mui/material/styles'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import InfoTip from '../../components/InfoTip'
import { BRAND } from '../../theme/ThemeProvider'
import { useAuth } from '../../hooks/useAuth'
import { useAssessments } from '../../hooks/useAssessments'

type CardProps = {
  label: string
  value: number | string
  icon: ReactNode
  color: string
  gradient: string
  tip?: string
}

function StatCard({ label, value, icon, color, gradient, tip }: CardProps) {
  return (
    <Paper
      sx={{
        p: 3,
        flex: '1 1 220px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(color, 0.3),
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 30px ${alpha(color, 0.15)}`,
        },
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
          <Typography variant='subtitle2' sx={{ color: 'text.secondary', mb: 1, fontSize: '0.7rem' }}>
            {label}
            {tip ? <InfoTip title={tip} /> : null}
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

function adhColor(pct: number) {
  return pct >= 80 ? BRAND.success : pct >= 50 ? BRAND.warning : BRAND.error
}

function adhGradEnd(pct: number) {
  return pct >= 80 ? '#69F0AE' : pct >= 50 ? '#FFE082' : '#FF8A80'
}

export default function CollaboratorDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: myAssessments, isLoading } = useAssessments(user?.id ?? '')

  const myStats = useMemo(() => {
    const list = myAssessments ?? []
    if (list.length === 0) {
      return { total: 0, ok: 0, gap1: 0, gap2Plus: 0, adherence: 0, avgGap: 0, topGaps: [] as typeof list }
    }
    const total = list.length
    const ok = list.filter(a => a.gap <= 0).length
    const gap1 = list.filter(a => a.gap === 1).length
    const gap2Plus = list.filter(a => a.gap >= 2).length
    const adherence = Math.round((ok / total) * 100)
    const avgGap = total > 0 ? list.reduce((s, a) => s + Math.max(a.gap, 0), 0) / total : 0
    const topGaps = [...list].filter(a => a.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 5)
    return { total, ok, gap1, gap2Plus, adherence, avgGap, topGaps }
  }, [myAssessments])

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <PageHeader>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h4' fontWeight={800} sx={{ mb: 0.5 }}>
            Seu resumo
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Um panorama rápido das suas avaliações (detalhes completos ficam em Avaliações).
          </Typography>
        </Box>
      </PageHeader>

      {isLoading && (
        <Box display='flex' flexDirection='column' gap={2} mb={4}>
          <Skeleton variant='rounded' height={100} sx={{ borderRadius: '16px' }} />
          <Skeleton variant='rounded' height={200} sx={{ borderRadius: '16px' }} />
        </Box>
      )}

      {!isLoading && myAssessments && myAssessments.length > 0 && (
        <Box display='flex' gap={3} flexWrap='wrap' mb={4}>
          <StatCard
            label='AVALIADAS'
            value={myStats.total}
            icon={<SchoolIcon />}
            color={BRAND.purple}
            gradient={`linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)`}
            tip='Quantidade de competências avaliadas (pares competência × avaliação) para você.'
          />
          <StatCard
            label='ADERÊNCIA'
            value={`${myStats.adherence}%`}
            icon={<TrendingUpIcon />}
            color={adhColor(myStats.adherence)}
            gradient={`linear-gradient(135deg, ${adhColor(myStats.adherence)} 0%, ${adhGradEnd(myStats.adherence)} 100%)`}
            tip='Percentual de competências sem GAP (GAP ≤ 0). Cálculo: (OK / Total) × 100. GAP = esperado − atual.'
          />
          <StatCard
            label='SEM GAP'
            value={myStats.ok}
            icon={<CheckCircleOutlineIcon />}
            color={BRAND.success}
            gradient={`linear-gradient(135deg, ${BRAND.success} 0%, #69F0AE 100%)`}
            tip='Quantidade de competências em que você atende ou supera o esperado (GAP ≤ 0).'
          />
          <StatCard
            label='COM GAP'
            value={myStats.gap1 + myStats.gap2Plus}
            icon={<WarningAmberIcon />}
            color={myStats.gap2Plus > 0 ? BRAND.error : BRAND.warning}
            gradient={
              myStats.gap2Plus > 0
                ? `linear-gradient(135deg, ${BRAND.error} 0%, #FF8A80 100%)`
                : `linear-gradient(135deg, ${BRAND.warning} 0%, #FFE082 100%)`
            }
            tip='Quantidade de competências com defasagem (GAP > 0).'
          />
        </Box>
      )}

      {!isLoading && myStats.topGaps.length > 0 && (
        <Paper sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Typography variant='subtitle1' fontWeight={900} mb={0.5} display='flex' alignItems='center' gap={1}>
            <ErrorOutlineIcon sx={{ color: BRAND.warning, fontSize: 22 }} />
            Seus principais GAPs
            <InfoTip title='Lista as competências com maior defasagem (GAP > 0), ordenadas do maior para o menor. GAP = esperado − atual.' />
          </Typography>
          <Typography variant='body2' color='text.secondary' mb={2}>
            Para detalhes completos (incluindo por categoria), acesse Avaliações.
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
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    minWidth: 60,
                    bgcolor: alpha(a.gap >= 2 ? BRAND.error : BRAND.warning, 0.14),
                    color: a.gap >= 2 ? BRAND.error : BRAND.warning,
                  }}
                />
                <Box flex={1}>
                  <Typography variant='body2' fontWeight={700}>
                    {a.skillName}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Esperado: {a.expectedLevel} · Atual: {a.currentLevel}
                  </Typography>
                </Box>
                <Chip
                  label={a.gap >= 2 ? 'Crítico' : 'Atenção'}
                  size='small'
                  sx={{
                    fontWeight: 800,
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

      {!isLoading && (!myAssessments || myAssessments.length === 0) && (
        <Paper
          sx={{
            p: 4,
            borderRadius: '16px',
            textAlign: 'center',
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(BRAND.cyan, 0.05)} 0%, ${alpha(BRAND.purple, 0.05)} 100%)`,
          }}
        >
          <EmojiObjectsOutlinedIcon sx={{ fontSize: 48, color: BRAND.warning, mb: 1 }} />
          <Typography variant='h6' fontWeight={900} mb={1}>
            Nenhuma avaliação encontrada
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Seu gestor/coordenador ainda não realizou sua avaliação de competências.
          </Typography>
        </Paper>
      )}

      <Paper
        sx={{
          p: 2.5,
          borderRadius: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: `1px solid transparent`,
          maxWidth: 520,
          '&:hover': { borderColor: BRAND.cyan, boxShadow: `0 4px 20px ${alpha(BRAND.cyan, 0.15)}` },
        }}
        onClick={() => navigate('/assessments')}
      >
        <Box display='flex' alignItems='center' gap={1.5} mb={1}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanLight} 100%)`,
              color: '#fff',
            }}
          >
            <AssignmentOutlinedIcon fontSize='small' />
          </Box>
          <Typography variant='subtitle2' fontWeight={900}>
            Avaliações
          </Typography>
        </Box>
        <Typography variant='body2' color='text.secondary' mb={1.5}>
          Acesse a tela de Avaliações para ver o resumo completo e detalhes por competência.
        </Typography>
        <Box display='flex' alignItems='center' gap={1}>
          <Typography variant='body2' fontWeight={900} sx={{ color: BRAND.cyan }}>
            Abrir Avaliações
          </Typography>
          <ArrowForwardIcon sx={{ fontSize: 18, color: BRAND.cyan }} />
        </Box>
      </Paper>
    </Box>
  )
}

