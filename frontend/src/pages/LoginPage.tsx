import { useState } from 'react'
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import LoginRoundedIcon from '@mui/icons-material/LoginRounded'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuth } from '../hooks/useAuth'
import { BRAND } from '../theme/ThemeProvider'
import PublicAuthLayout from '../components/PublicAuthLayout'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()
  const { login }               = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authService.login({ email, password })
      login(data)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? ''
      if (msg.toLowerCase().includes('verificado') || msg.toLowerCase().includes('verificação')) {
        navigate(`/signup/verify?email=${encodeURIComponent(email)}`)
        return
      }
      setError('Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicAuthLayout>
      <Box mb={3}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#1A2233', letterSpacing: '-0.02em', mb: 0.5 }}>
          Bem-vindo de volta
        </Typography>
        <Typography sx={{ color: '#5F6B7A', fontSize: '0.95rem' }}>
          Acesse sua conta para continuar
        </Typography>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: alpha(BRAND.error, 0.06),
            border: `1px solid ${alpha(BRAND.error, 0.15)}`,
          }}
        >
          {error}
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
            '& .MuiInputBase-input': {
              color: '#1A2233',
              '::placeholder': { color: '#5F6B7A', opacity: 1 },
            },
          }}
        />
        <TextField
          label='Senha'
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          placeholder='••••••••'
          disabled={loading}
          autoComplete='current-password'
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: '#fff',
              '& fieldset': { borderColor: '#E3E7ED' },
              '&:hover fieldset': { borderColor: BRAND.cyan },
              '&.Mui-focused fieldset': { borderColor: BRAND.cyan, borderWidth: 2 },
            },
            '& .MuiInputBase-input': {
              color: '#1A2233',
              '::placeholder': { color: '#5F6B7A', opacity: 1 },
            },
          }}
        />
        <Button
          type='submit'
          variant='contained'
          disabled={loading || !email.trim() || !password.trim()}
          fullWidth
          size='large'
          endIcon={!loading && <LoginRoundedIcon />}
          sx={{
            mt: 1,
            py: 1.5,
            fontSize: '0.95rem',
            fontWeight: 600,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanDark} 100%)`,
            boxShadow: `0 4px 20px ${alpha(BRAND.cyan, 0.3)}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${BRAND.cyanLight} 0%, ${BRAND.cyan} 100%)`,
              boxShadow: `0 6px 28px ${alpha(BRAND.cyan, 0.4)}`,
            },
            '&.Mui-disabled': { background: '#CDD3DC', color: '#fff' },
          }}
        >
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Entrar'}
        </Button>
      </Box>

      <Box mt={2.5} textAlign='center'>
        <Typography sx={{ fontSize: '0.85rem', color: '#5F6B7A' }}>
          Ainda não tem conta?{' '}
          <Typography
            component='button'
            type='button'
            onClick={() => navigate('/signup')}
            sx={{
              ml: 0.5, p: 0, border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600, color: BRAND.cyan, textDecoration: 'underline',
            }}
          >
            Criar conta
          </Typography>
        </Typography>
        <Button variant='text' onClick={() => navigate('/password/forgot')} sx={{ mt: 1 }}>
          Esqueci minha senha
        </Button>
      </Box>
    </PublicAuthLayout>
  )
}
