import { type ReactNode } from 'react'
import { Box } from '@mui/material'

/**
 * Envolve o cabeçalho da página para que fique fixo ao rolar o conteúdo.
 * Use envolvendo o primeiro bloco de cada página (título + subtítulo + ações).
 */
export default function PageHeader({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        flexShrink: 0,
        py: { xs: 1.5, md: 2 },
        mb: 2,
        mx: { xs: -1.5, sm: -2, md: -3 },
        px: { xs: 1.5, sm: 2, md: 3 },
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {children}
    </Box>
  )
}
