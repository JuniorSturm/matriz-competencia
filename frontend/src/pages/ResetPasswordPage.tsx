import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, CircularProgress, TextField, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { authService } from '../services/authService'
import { BRAND } from '../theme/ThemeProvider'
import PublicAuthLayout from '../components/PublicAuthLayout'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function ResetPasswordPage() {
  const query = useQuery()
  const token = useMemo(() => query.get('token') ?? '', [query])
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        await authService.validatePasswordReset(token)
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Token inválido ou expirado.')
      } finally {
        setLoading(false)
      }
    }
    if (token) run()
    else {
      setError('Token não informado.')
      setLoading(false)
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirm) {
      setError('As senhas não conferem.')
      return
    }
    setSubmitting(true)
    try {
      await authService.resetPassword({ token, newPassword })
      navigate('/login')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível redefinir a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicAuthLayout>
      <Box sx={{
        bgcolor: '#fff',
        p: 3,
        borderRadius: 3,
        boxShadow: '0 1px 6px rgba(15,23,42,0.12)',
      }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', mb: 0.5 }}>
          Redefinir senha
        </Typography>
        <Typography sx={{ color: '#5F6B7A', fontSize: '0.9rem', mb: 2 }}>
          Crie uma nova senha para acessar sua conta.
        </Typography>

        {loading && (
          <Box display='flex' justifyContent='center' py={3}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
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

            <Box
              component='form'
              onSubmit={handleSubmit}
              display='flex'
              flexDirection='column'
              gap={2.5}
            >
              <TextField
                label='Nova senha'
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: '#F8F9FC',
                    '& fieldset': { borderColor: '#E3E7ED' },
                    '&.Mui-focused fieldset': { borderColor: BRAND.cyan, borderWidth: 2 },
                  },
                }}
              />
              <TextField
                label='Confirmar senha'
                type='password'
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: '#F8F9FC',
                    '& fieldset': { borderColor: '#E3E7ED' },
                    '&.Mui-focused fieldset': { borderColor: BRAND.cyan, borderWidth: 2 },
                  },
                }}
              />
              <Button
                type='submit'
                variant='contained'
                disabled={submitting || !newPassword || !confirm}
                fullWidth
                sx={{
                  mt: 1,
                  py: 1.3,
                  fontWeight: 600,
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanDark} 100%)`,
                  boxShadow: `0 4px 18px ${alpha(BRAND.cyan, 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${BRAND.cyanLight} 0%, ${BRAND.cyan} 100%)`,
                  },
                }}
              >
                {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Salvar nova senha'}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </PublicAuthLayout>
  )
}
