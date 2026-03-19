import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { inviteService } from '../services/inviteService'
import { BRAND } from '../theme/ThemeProvider'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function InviteAcceptPage() {
  const query = useQuery()
  const token = query.get('token') ?? ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await inviteService.validateInvite(token)
        if (!mounted) return
        setEmail(data.email)
        setValid(true)
      } catch (err: any) {
        if (!mounted) return
        setError(err?.response?.data?.message ?? 'Convite inválido ou expirado.')
        setValid(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (token) {
      load()
    } else {
      setError('Token de convite não informado.')
      setLoading(false)
    }
    return () => { mounted = false }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== passwordConfirm) {
      setError('As senhas não conferem.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await inviteService.acceptInvite(token, name, password)
      navigate('/login')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Não foi possível aceitar o convite.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh'>
        <CircularProgress />
      </Box>
    )
  }

  if (!valid) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh' p={3}>
        <Box maxWidth={420} width='100%'>
          <Alert severity='error' sx={{ mb: 2 }}>
            {error ?? 'Convite inválido ou expirado.'}
          </Alert>
          <Button variant='contained' onClick={() => navigate('/login')}>Ir para o login</Button>
        </Box>
      </Box>
    )
  }

  const disabled = !name.trim() || !password.trim() || !passwordConfirm.trim()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0, p: 3 }}>
      <Box sx={{ maxWidth: 480, margin: '0 auto', flex: 1, mb: '80px' }}>
        <Box display='flex' alignItems='center' gap={1.5} mb={3}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: alpha(BRAND.cyan, 0.15),
            color: BRAND.cyan,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          >
            <PersonAddAltRoundedIcon fontSize='small' />
          </Box>
          <Box>
            <Typography variant='h5' fontWeight={700}>
              Ativar conta
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Defina seu nome e senha para acessar a plataforma.
            </Typography>
          </Box>
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

        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{
            p: 3,
            borderRadius: '16px',
            bgcolor: '#fff',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          <TextField
            label='E-mail'
            value={email}
            disabled
            fullWidth
          />
          <TextField
            label='Nome completo'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label='Senha'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label='Confirmar senha'
            type='password'
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            fullWidth
          />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          zIndex: (t) => t.zIndex.appBar - 1,
          borderRadius: 0,
          bgcolor: (t) => alpha(t.palette.background.paper, 0.9),
          backdropFilter: 'blur(12px)',
          borderTop: (t) => `1px solid ${t.palette.divider}`,
        }}
      >
        <Button variant='text' onClick={() => navigate('/login')}>
          Cancelar
        </Button>
        <Button
          variant='contained'
          startIcon={<SaveRoundedIcon />}
          onClick={handleSubmit}
          disabled={submitting || disabled}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Ativar conta'}
        </Button>
      </Box>
    </Box>
  )
}

