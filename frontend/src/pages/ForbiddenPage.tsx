import { Box, Button, Typography } from '@mui/material'
import BlockIcon from '@mui/icons-material/Block'
import { Link } from 'react-router-dom'
import { BRAND } from '../theme/ThemeProvider'

export default function ForbiddenPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'error.main',
          color: 'error.contrastText',
          mb: 3,
        }}
      >
        <BlockIcon sx={{ fontSize: 48 }} />
      </Box>
      <Typography variant='h4' fontWeight={600} color='text.primary' gutterBottom>
        Acesso negado
      </Typography>
      <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 400, textAlign: 'center', mb: 3 }}>
        Você não tem permissão para acessar este recurso ou realizar esta ação.
      </Typography>
      <Button
        component={Link}
        to='/'
        variant='contained'
        sx={{
          bgcolor: BRAND.cyan,
          '&:hover': { bgcolor: BRAND.cyanDark },
        }}
      >
        Voltar ao início
      </Button>
    </Box>
  )
}
