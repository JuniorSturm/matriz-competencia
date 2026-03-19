import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material'
import { authService } from '../services/authService'
import { useAuth } from '../hooks/useAuth'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function SignupVerifyPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const query = useQuery()
  const initialEmail = useMemo(() => query.get('email') ?? '', [query])
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const verifyResp = await authService.verifySignup({ email, code })
      setSuccess('E-mail verificado com sucesso. Entrando no sistema...')

      if (verifyResp.login) {
        login(verifyResp.login)
        setTimeout(() => navigate('/'), 200)
        return
      }

      const pendingEmail = sessionStorage.getItem('pendingSignupEmail') ?? email
      const pendingPassword = sessionStorage.getItem('pendingSignupPassword') ?? ''

      if (pendingPassword) {
        try {
          // Preferimos usar o e-mail digitado na tela de verificação,
          // pois ele é o que acabou de ser validado no backend.
          const emailToLogin = email || pendingEmail
          const loginResp = await authService.login({ email: emailToLogin, password: pendingPassword })
          login(loginResp)
          sessionStorage.removeItem('pendingSignupEmail')
          sessionStorage.removeItem('pendingSignupPassword')
          setTimeout(() => navigate('/'), 200)
          return
        } catch {
          // Tenta um fallback caso o e-mail digitado tenha sido alterado na UI.
          if (pendingEmail && pendingEmail !== email) {
            try {
              const loginResp = await authService.login({ email: pendingEmail, password: pendingPassword })
              login(loginResp)
              sessionStorage.removeItem('pendingSignupEmail')
              sessionStorage.removeItem('pendingSignupPassword')
              setTimeout(() => navigate('/'), 200)
              return
            } catch {}
          }

          setTimeout(() => navigate('/login'), 1200)
          return
        }
      }

      // Fallback quando a senha não estiver disponível (ex.: usuário abriu a página direto).
      setTimeout(() => navigate('/login'), 1200)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Código inválido ou expirado.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      await authService.resendSignupCode({ email })
      setSuccess('Novo código enviado para o e-mail informado.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível reenviar o código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box sx={{ width: '100%', maxWidth: 460, bgcolor: '#fff', p: 4, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant='h5' fontWeight={700} mb={1}>Verifique seu e-mail</Typography>
        <Typography variant='body2' color='text.secondary' mb={3}>
          Informe o código de 6 dígitos enviado para concluir seu cadastro.
        </Typography>
        {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity='success' sx={{ mb: 2 }}>{success}</Alert>}
        <Box component='form' onSubmit={handleSubmit} display='flex' flexDirection='column' gap={2}>
          <TextField label='E-mail' value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField
            label='Código de verificação'
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6 }}
            fullWidth
          />
          <Button type='submit' variant='contained' disabled={loading || !email || code.length !== 6}>
            {loading ? <CircularProgress size={20} /> : 'Verificar'}
          </Button>
          <Button type='button' variant='text' onClick={handleResend} disabled={loading || !email}>
            Reenviar código
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

