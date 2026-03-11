import { type ReactNode } from 'react'
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, IconButton, Tooltip, Avatar, Divider,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import SchoolIcon from '@mui/icons-material/School'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import LogoutIcon from '@mui/icons-material/Logout'
import BusinessIcon from '@mui/icons-material/Business'
import GroupsIcon from '@mui/icons-material/Groups'

import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { BRAND, useThemeMode } from '../theme/ThemeProvider'

const DRAWER_WIDTH = 260

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: <DashboardIcon />,      path: '/',            managerOnly: false, adminOnly: false, coordinatorOk: true },
  { label: 'Empresas',      icon: <BusinessIcon />,       path: '/companies',   managerOnly: false, adminOnly: true,  coordinatorOk: false },
  { label: 'Colaboradores', icon: <PeopleIcon />,         path: '/users',       managerOnly: true,  adminOnly: false, coordinatorOk: true },
  { label: 'Competências',  icon: <SchoolIcon />,         path: '/skills',      managerOnly: true,  adminOnly: false, coordinatorOk: true },
  { label: 'Times',         icon: <GroupsIcon />,         path: '/teams',       managerOnly: true,  adminOnly: false, coordinatorOk: true },
  { label: 'Avaliações',    icon: <AssessmentIcon />,     path: '/assessments', managerOnly: false, adminOnly: false, coordinatorOk: true },
  { label: 'Comparação',    icon: <CompareArrowsIcon />,  path: '/comparison',  managerOnly: true,  adminOnly: false, coordinatorOk: true },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuth()
  const { mode, toggleTheme, tokens } = useThemeMode()

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* ── Sidebar ──────────────────────────────────── */}
      <Drawer
        variant='permanent'
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {/* Logo / Brand */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2.5,
            py: 2.5,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.purple} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px ${alpha(BRAND.cyan, 0.3)}`,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>S</Typography>
          </Box>
          <Box>
            <Typography
              variant='subtitle1'
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                lineHeight: 1.2,
                background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.purpleLight} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Skillhub
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              Gestão de Competências
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mx: 2, mb: 1 }} />

        {/* Navigation */}
        <Box sx={{ flex: 1, py: 1, px: 0.5 }}>
          <Typography
            variant='subtitle2'
            sx={{ px: 2.5, py: 1, color: 'text.secondary', fontSize: '0.65rem' }}
          >
            NAVEGAÇÃO
          </Typography>
          <List disablePadding>
            {NAV_ITEMS.filter((item) => {
              if (item.adminOnly) return user?.isAdmin
              if (item.managerOnly) return user?.isManager || user?.isAdmin || (item.coordinatorOk && user?.isCoordinator)
              return true
            }).map((item) => {
              const active = location.pathname === item.path
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
                  <ListItemButton
                    selected={active}
                    onClick={() => navigate(item.path)}
                    sx={{
                      py: 1,
                      ...(active && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: 3,
                          borderRadius: '0 4px 4px 0',
                          bgcolor: BRAND.cyan,
                        },
                      }),
                    }}
                  >
                    <ListItemIcon sx={{ fontSize: 20 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                        fontWeight: active ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>

        {/* Theme toggle */}
        <Box sx={{ mx: 2, mb: 1 }}>
          <Tooltip title={mode === 'light' ? 'Modo escuro' : 'Modo claro'} arrow>
            <IconButton
              onClick={toggleTheme}
              sx={{
                width: '100%',
                borderRadius: '10px',
                py: 1,
                color: 'text.secondary',
                border: `1px solid ${tokens.border}`,
                '&:hover': { bgcolor: alpha(BRAND.cyan, 0.08) },
              }}
            >
              {mode === 'light' ? <DarkModeIcon fontSize='small' /> : <LightModeIcon fontSize='small' />}
              <Typography variant='body2' sx={{ ml: 1, fontSize: '0.8rem' }}>
                {mode === 'light' ? 'Modo escuro' : 'Modo claro'}
              </Typography>
            </IconButton>
          </Tooltip>
        </Box>

        {/* User card at bottom */}
        <Box
          sx={{
            mx: 2,
            mb: 2,
            p: 1.5,
            borderRadius: '12px',
            bgcolor: alpha(BRAND.cyan, 0.06),
            border: `1px solid ${tokens.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.8rem',
              fontWeight: 700,
              bgcolor: alpha(BRAND.cyan, 0.2),
              color: BRAND.cyan,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {user?.name}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
              {user?.isAdmin ? 'Administrador' : user?.isManager ? 'Gestor' : user?.isCoordinator ? 'Coordenador' : 'Colaborador'}
            </Typography>
          </Box>
          <Tooltip title='Sair' arrow>
            <IconButton
              size='small'
              onClick={() => { logout(); navigate('/login') }}
              sx={{ color: 'text.secondary', '&:hover': { color: BRAND.error } }}
            >
              <LogoutIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      {/* ── Main Content ─────────────────────────────── */}
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          pb: 3,
          pt: 0,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', overflowX: 'hidden' }}>
          <Box sx={{ pl: 3, pr: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
