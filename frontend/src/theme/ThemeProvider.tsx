import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { createTheme, alpha } from '@mui/material/styles'

/* ─── Paleta de Cores — Skillhub ────────────────────────────────────────── */
export const BRAND = {
  // Primary
  cyan:         '#00B8D4',
  cyanLight:    '#18FFFF',
  cyanDark:     '#0088A3',
  // Secondary
  purple:       '#7C4DFF',
  purpleLight:  '#B388FF',
  purpleDark:   '#5A1FCF',
  // Semantic
  success:      '#00C853',
  warning:      '#FF9100',
  error:        '#FF5252',
  info:         '#40C4FF',
} as const

/* ─── Light palette ──────────────────────────────────────────────────────── */
const lightPalette = {
  background:     '#F4F6F9',
  surface:        '#FFFFFF',
  surfaceHover:   '#F0F2F5',
  sidebar:        '#FFFFFF',
  sidebarBorder:  '#E3E7ED',
  textPrimary:    '#1A2233',
  textSecondary:  '#5F6B7A',
  border:         '#E3E7ED',
  borderHover:    '#CDD3DC',
  tableHead:      '#F4F6F9',
  cardShadow:     'rgba(0,0,0,0.06)',
} as const

/* ─── Dark palette ───────────────────────────────────────────────────────── */
const darkPalette = {
  background:     '#0A1628',
  surface:        '#111D33',
  surfaceHover:   '#162440',
  sidebar:        '#0E1A2E',
  sidebarBorder:  'rgba(255,255,255,0.08)',
  textPrimary:    '#E8EBF0',
  textSecondary:  '#8899AA',
  border:         'rgba(255,255,255,0.08)',
  borderHover:    'rgba(255,255,255,0.15)',
  tableHead:      '#162440',
  cardShadow:     'rgba(0,0,0,0.3)',
} as const

export type ThemeMode = 'light' | 'dark'
type PaletteTokens = typeof lightPalette

export function getTokens(mode: ThemeMode): PaletteTokens {
  return mode === 'dark' ? darkPalette : lightPalette
}

/* ─── Build MUI theme for a given mode ───────────────────────────────────── */
function buildTheme(mode: ThemeMode) {
  const t = getTokens(mode)
  const isDark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      primary:    { main: BRAND.cyan,   light: BRAND.cyanLight,   dark: BRAND.cyanDark   },
      secondary:  { main: BRAND.purple, light: BRAND.purpleLight, dark: BRAND.purpleDark },
      success:    { main: BRAND.success  },
      warning:    { main: BRAND.warning  },
      error:      { main: BRAND.error    },
      info:       { main: BRAND.info     },
      background: { default: t.background, paper: t.surface },
      text:       { primary: t.textPrimary, secondary: t.textSecondary },
      divider:    t.border,
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
    },

    shape: { borderRadius: 12 },

    components: {
      /* ── Global ────── */
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.background,
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.borderHover} ${t.background}`,
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-track': { background: t.background },
            '&::-webkit-scrollbar-thumb': { background: isDark ? '#162440' : '#CDD3DC', borderRadius: 4 },
          },
          '*::selection': {
            backgroundColor: alpha(BRAND.cyan, 0.25),
            color: isDark ? '#fff' : '#000',
          },
        },
      },

      /* ── Drawer ────── */
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: t.sidebar,
            borderRight: `1px solid ${t.sidebarBorder}`,
          },
        },
      },

      /* ── Paper ────── */
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${t.border}`,
          },
        },
      },

      /* ── Button ────── */
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, padding: '8px 20px', fontSize: '0.875rem' },
          containedPrimary: {
            background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanDark} 100%)`,
            color: '#fff',
            fontWeight: 700,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.cyanLight} 0%, ${BRAND.cyan} 100%)`,
            },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleDark} 100%)`,
            color: '#fff',
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.purpleLight} 0%, ${BRAND.purple} 100%)`,
            },
          },
          outlinedPrimary: {
            borderColor: alpha(BRAND.cyan, 0.5),
            color: BRAND.cyan,
            '&:hover': { borderColor: BRAND.cyan, backgroundColor: alpha(BRAND.cyan, 0.08) },
          },
        },
      },

      /* ── TextField / Input ────── */
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              '& fieldset': { borderColor: t.border },
              '&:hover fieldset': { borderColor: t.borderHover },
              '&.Mui-focused fieldset': { borderColor: BRAND.cyan },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '& fieldset': { borderColor: t.border },
            '&:hover fieldset': { borderColor: t.borderHover },
            '&.Mui-focused fieldset': { borderColor: BRAND.cyan },
          },
        },
      },
      MuiSelect: { styleOverrides: { root: { borderRadius: 10 } } },

      /* ── Tables ────── */
      MuiTableContainer: {
        styleOverrides: { root: { borderRadius: 12, border: `1px solid ${t.border}` } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: t.tableHead,
              color: t.textSecondary,
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderBottom: `1px solid ${t.border}`,
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${t.border}`, fontSize: '0.875rem' },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: `${alpha(BRAND.cyan, 0.04)} !important` } },
        },
      },

      /* ── Chips ────── */
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
          colorSuccess: { backgroundColor: alpha(BRAND.success, 0.12), color: isDark ? BRAND.success : '#00802F' },
          colorWarning: { backgroundColor: alpha(BRAND.warning, 0.12), color: isDark ? BRAND.warning : '#B36800' },
          colorError: { backgroundColor: alpha(BRAND.error, 0.12), color: isDark ? BRAND.error : '#D32F2F' },
          colorDefault: { backgroundColor: alpha(BRAND.cyan, 0.10), color: BRAND.cyanDark },
        },
      },

      /* ── Accordion ────── */
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            borderRadius: '12px !important',
            marginBottom: 12,
            '&:before': { display: 'none' },
            '&.Mui-expanded': { marginBottom: 12 },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: { borderRadius: 12, '&:hover': { backgroundColor: alpha(BRAND.cyan, 0.04) } },
        },
      },

      /* ── ListItemButton (sidebar) ────── */
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            margin: '2px 8px',
            paddingLeft: 16,
            paddingRight: 16,
            '&.Mui-selected': {
              backgroundColor: alpha(BRAND.cyan, isDark ? 0.12 : 0.08),
              color: BRAND.cyanDark,
              '& .MuiListItemIcon-root': { color: BRAND.cyanDark },
              '&:hover': { backgroundColor: alpha(BRAND.cyan, isDark ? 0.18 : 0.12) },
            },
            '&:hover': { backgroundColor: alpha(BRAND.cyan, 0.06) },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { color: t.textSecondary, minWidth: 40 } },
      },

      /* ── IconButton ────── */
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 10, '&:hover': { backgroundColor: alpha(BRAND.cyan, 0.08) } },
        },
      },

      /* ── Alert ────── */
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
          standardError:   { backgroundColor: alpha(BRAND.error, 0.1),   color: isDark ? BRAND.error : '#D32F2F'   },
          standardSuccess: { backgroundColor: alpha(BRAND.success, 0.1), color: isDark ? BRAND.success : '#00802F' },
          standardWarning: { backgroundColor: alpha(BRAND.warning, 0.1), color: isDark ? BRAND.warning : '#B36800' },
          standardInfo:    { backgroundColor: alpha(BRAND.info, 0.1),    color: isDark ? BRAND.info : '#0277BD'    },
        },
      },

      /* ── Misc ────── */
      MuiDivider: { styleOverrides: { root: { borderColor: t.border } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#162440' : '#1A2233',
            color: '#fff',
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            fontSize: '0.8rem',
          },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${t.border}` } },
      },
      MuiCircularProgress: { defaultProps: { color: 'primary' } },
      MuiFormControl: {
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              color: t.textSecondary,
              '&.Mui-focused': { color: BRAND.cyan },
            },
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { color: t.textSecondary, '&.Mui-checked': { color: BRAND.cyan } },
        },
      },
    },
  })
}

/* ─── Theme Context ──────────────────────────────────────────────────────── */
interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
  tokens: PaletteTokens
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggleTheme: () => {},
  tokens: lightPalette,
})

export function useThemeMode() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'app-theme-mode'

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return (saved === 'dark' || saved === 'light') ? saved : 'light'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  const tokens = getTokens(mode)
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, tokens }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
