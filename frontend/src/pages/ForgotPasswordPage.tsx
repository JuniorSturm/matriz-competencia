import { useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, TextField, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { BRAND } from '../theme/ThemeProvider'
import PublicAuthLayout from '../components/PublicAuthLayout'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authService.forgotPassword(email)
      setSuccess('Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível processar a solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicAuthLayout>
      <Box mb={3}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#1A2233', letterSpacing: '-0.02em', mb: 0.5 }}>
          Esqueci minha senha
        </Typography>
        <Typography sx={{ color: '#5F6B7A', fontSize: '0.95rem' }}>
          Informe seu e-mail para receber um link de redefinição.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{
            mb: 2,
            borderRadius: '12px',
            bgcolor: alpha(BRAND.error, 0.06),
            border: `1px solid ${alpha(BRAND.error, 0.15)}`,
          }}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mb: 2, borderRadius: '12px' }}>
          {success}
        </Alert>
      )}

      <Box component='form' onSubmit={handleSubmit} display='flex' flexDirection='column' gap={2.5}>
        <TextField
          label='E-mail'
          type='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoFocus
          placeholder='usuario@empresa.com'
          disabled={loading}
          autoComplete='email'
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: '#fff',
              '& fieldset': { borderColor: '#E3E7ED' },
              '&:hover fieldset': { borderColor: BRAND.cyan },
              '&.Mui-focused fieldset': { borderColor: BRAND.cyan, borderWidth: 2 },
            },
          }}
        />
        <Button
          type='submit'
          variant='contained'
          disabled={loading || !email.trim()}
          fullWidth
          size='large'
          endIcon={!loading && <SendRoundedIcon />}
          sx={{
            mt: 1,
            py: 1.5,
            fontWeight: 600,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanDark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(BRAND.cyan, 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.cyanLight} 0%, ${BRAND.cyan} 100%)`,
            },
          }}
        >
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar link'}
        </Button>
        <Button variant='text' onClick={() => navigate('/login')} sx={{ mt: 0.5 }}>
          Voltar ao login
        </Button>
      </Box>
    </PublicAuthLayout>
  )
}
