import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import { BRAND } from '../theme/ThemeProvider'

const VERSION = 'v1.0'

type PublicAuthLayoutProps = {
  children: React.ReactNode
  /** Largura máxima do conteúdo do painel direito (default 480). Use 800+ para formulários largos (ex.: autocadastro). */
  contentMaxWidth?: number
  /** Alinhamento vertical do painel direito: 'center' (login, forgot, reset) ou 'flex-start' (signup, conteúdo longo). */
  rightPanelAlign?: 'center' | 'flex-start'
}

export default function PublicAuthLayout({ children, contentMaxWidth = 480, rightPanelAlign = 'center' }: PublicAuthLayoutProps) {
  return (
    <Box display='flex' minHeight='100vh'>
      {/* ═══════ Left Panel — Branding ═══════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: { lg: '42%', xl: '38%' },
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(160deg, ${BRAND.cyanDark} 0%, #0E1A2E 40%, #16103A 100%)`,
        }}
      >
        {/* Mesh gradient orbs */}
        <Box sx={{
          position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500,
          background: `radial-gradient(circle, ${alpha(BRAND.cyan, 0.25)} 0%, transparent 70%)`,
        }} />
        <Box sx={{
          position: 'absolute', bottom: '-15%', left: '-10%', width: 600, height: 600,
          background: `radial-gradient(circle, ${alpha(BRAND.purple, 0.20)} 0%, transparent 70%)`,
        }} />
        <Box sx={{
          position: 'absolute', top: '40%', left: '60%', width: 300, height: 300,
          background: `radial-gradient(circle, ${alpha(BRAND.cyanLight, 0.10)} 0%, transparent 70%)`,
        }} />

        {/* Subtle dot pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `radial-gradient(${BRAND.cyan} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />

        {/* Content */}
        <Box sx={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          p: { lg: 5, xl: 6 }, width: '100%',
        }}>
          {/* Logo */}
          <Box display='flex' alignItems='center' gap={1.5}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.purple} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 24px ${alpha(BRAND.cyan, 0.35)}`,
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>S</Typography>
            </Box>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
              Skillhub
            </Typography>
          </Box>

          {/* Middle — feature cards */}
          <Box sx={{ my: 4 }}>
            <Typography variant='h3' sx={{
              color: '#fff', fontWeight: 800, lineHeight: 1.15, mb: 2,
              letterSpacing: '-0.03em', fontSize: { lg: '2.2rem', xl: '2.6rem' },
            }}>
              Gestão de{' '}
              <Box component='span' sx={{
                background: `linear-gradient(90deg, ${BRAND.cyan}, ${BRAND.purpleLight})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Competências
              </Box>
            </Typography>
            <Typography sx={{ color: alpha('#fff', 0.6), fontSize: '1rem', mb: 5, maxWidth: 340 }}>
              Avalie, compare e desenvolva as habilidades da sua equipe em um só lugar.
            </Typography>

            {/* Feature chips */}
            <Box display='flex' flexDirection='column' gap={2}>
              {[
                { icon: <TrendingUpRoundedIcon sx={{ fontSize: 20 }} />, label: 'Avaliação por níveis', desc: 'Bronze, Prata e Ouro' },
                { icon: <GroupsRoundedIcon sx={{ fontSize: 20 }} />, label: 'Comparação de equipe', desc: 'Até 3 colaboradores' },
                { icon: <InsightsRoundedIcon sx={{ fontSize: 20 }} />, label: 'Análise de GAP', desc: 'Identifique lacunas' },
              ].map((f, i) => (
                <Box key={i} display='flex' alignItems='center' gap={2}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: '10px',
                    bgcolor: alpha(i === 0 ? BRAND.cyan : i === 1 ? BRAND.purple : BRAND.success, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: i === 0 ? BRAND.cyan : i === 1 ? BRAND.purpleLight : BRAND.success,
                  }}>
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>
                      {f.label}
                    </Typography>
                    <Typography sx={{ color: alpha('#fff', 0.45), fontSize: '0.75rem' }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Footer — versão */}
          <Typography sx={{ color: alpha('#fff', 0.25), fontSize: '0.75rem' }}>
            Skillhub {VERSION}
          </Typography>
        </Box>
      </Box>

      {/* ═══════ Right Panel — Form / Content ══════════════════════════════════════ */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: rightPanelAlign,
          justifyContent: 'center',
          bgcolor: '#F8F9FC',
          p: { xs: 3, sm: 4, md: 8 },
          overflow: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: contentMaxWidth }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.purple} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 24px ${alpha(BRAND.cyan, 0.3)}`,
            }}>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22, lineHeight: 1 }}>S</Typography>
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 700, fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${BRAND.cyan}, ${BRAND.purple})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Skillhub
              </Typography>
              <Typography sx={{ color: '#5F6B7A', fontSize: '0.7rem' }}>
                Gestão de Competências
              </Typography>
            </Box>
          </Box>

          {children}

          {/* Footer — todas as telas */}
          <Typography sx={{ mt: 4, textAlign: 'center', color: '#B0B8C4', fontSize: '0.75rem' }}>
            Skillhub &mdash; Gestão de Competências
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
