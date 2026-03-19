import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { BRAND } from '../theme/ThemeProvider'
import PublicAuthLayout from '../components/PublicAuthLayout'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function maskCnpj(raw: string): string {
  const v = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 14)
  if (v.length <= 2) return v
  if (v.length <= 5) return `${v.slice(0, 2)}.${v.slice(2)}`
  if (v.length <= 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`
  if (v.length <= 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`
}

function maskPhone(raw: string): string {
  const v = raw.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 2) return v.length ? `(${v}` : ''
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

function stripMask(val: string): string {
  return val.replace(/[^a-zA-Z0-9]/g, '')
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName]       = useState('')
  const [companyDocument, setCompanyDocument] = useState('')
  const [companyEmail, setCompanyEmail]     = useState('')
  const [companyPhone, setCompanyPhone]     = useState('')

  const [userName, setUserName]             = useState('')
  const [userEmail, setUserEmail]           = useState('')
  const [password, setPassword]             = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [error, setError]                   = useState('')
  const [loading, setLoading]               = useState(false)
  const [submitted, setSubmitted]           = useState(false)

  const docRaw = stripMask(companyDocument)
  const phoneRaw = companyPhone.replace(/\D/g, '')

  const companyNameError = submitted && !companyName.trim()
  const companyDocumentError = submitted && docRaw.length < 14
  const companyEmailError = submitted && !EMAIL_RE.test(companyEmail)
  const companyPhoneError = submitted && phoneRaw.length < 10

  const userNameError = submitted && !userName.trim()
  const userEmailError = submitted && !EMAIL_RE.test(userEmail)
  const passwordError = submitted && !password.trim()
  const passwordConfirmError = submitted && !passwordConfirm.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitted(true)

    if (password !== passwordConfirm) {
      setError('As senhas não conferem.')
      return
    }

    if (!companyName.trim()
      || docRaw.length < 14
      || !EMAIL_RE.test(companyEmail)
      || phoneRaw.length < 10
      || !userName.trim()
      || !EMAIL_RE.test(userEmail)
      || !password.trim()
      || !passwordConfirm.trim()
    ) {
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: companyName,
        document: docRaw,
        email: companyEmail,
        phone: phoneRaw || undefined,
        userName,
        userEmail,
        password,
      }

      const data = await authService.signup(payload)
      if (data.requiresVerification) {
        sessionStorage.setItem('pendingSignupEmail', data.email ?? userEmail)
        sessionStorage.setItem('pendingSignupPassword', password)
        navigate(`/signup/verify?email=${encodeURIComponent(data.email ?? userEmail)}`)
        return
      }
      navigate('/login')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao criar conta. Tente novamente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => navigate('/login')

  const disabled = !companyName.trim()
    || !companyDocument.trim()
    || !companyEmail.trim()
    || !companyPhone.trim()
    || !userName.trim()
    || !userEmail.trim()
    || !password.trim()
    || !passwordConfirm.trim()

  return (
    <PublicAuthLayout contentMaxWidth={800} rightPanelAlign='flex-start'>
      <Box display='flex' justifyContent='flex-end' mb={2}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={handleBackToLogin}
          variant='text'
          size='small'
        >
          Já tenho conta
        </Button>
      </Box>

      <Box mb={3}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', color: '#1A2233', letterSpacing: '-0.02em', mb: 0.5 }}>
          Criar conta
        </Typography>
        <Typography sx={{ color: '#5F6B7A', fontSize: '0.95rem' }}>
          Preencha os dados da empresa e do primeiro gestor.
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

      {/* Empresa */}
      <Box sx={{ p: 3, borderRadius: '16px', mb: 3, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)' }}>
        <Box display='flex' alignItems='center' gap={1.5} mb={2.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: alpha(BRAND.cyan, 0.15),
            color: BRAND.cyan,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BusinessRoundedIcon fontSize='small' />
          </Box>
          <Typography variant='h6' fontWeight={600}>Dados da Empresa</Typography>
        </Box>
        <Box display='flex' flexDirection='column' gap={2.5}>
          <TextField
            label='Nome da empresa'
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            fullWidth
            error={companyNameError}
            helperText={companyNameError ? 'Campo obrigatório' : ''}
          />
          <TextField
            label='CNPJ'
            value={companyDocument}
            onChange={(e) => setCompanyDocument(maskCnpj(e.target.value))}
            required
            fullWidth
            placeholder='XX.XXX.XXX/XXXX-XX'
            error={companyDocumentError}
            helperText={companyDocumentError ? 'CNPJ deve ter 14 caracteres' : ''}
            inputProps={{ maxLength: 18 }}
          />
          <TextField
            label='E-mail da empresa'
            type='email'
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            required
            fullWidth
            error={companyEmailError}
            helperText={companyEmailError ? 'Informe um e-mail válido' : ''}
          />
          <TextField
            label='Telefone'
            value={companyPhone}
            onChange={(e) => setCompanyPhone(maskPhone(e.target.value))}
            required
            fullWidth
            placeholder='(XX) XXXXX-XXXX'
            error={companyPhoneError}
            helperText={companyPhoneError ? 'Telefone inválido' : ''}
          />
        </Box>
      </Box>

      {/* Primeiro usuário */}
      <Box sx={{ p: 3, borderRadius: '16px', mb: 3, bgcolor: '#fff', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)' }}>
        <Box display='flex' alignItems='center' gap={1.5} mb={2.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: alpha(BRAND.purple, 0.15),
            color: BRAND.purple,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PersonAddAltRoundedIcon fontSize='small' />
          </Box>
          <Typography variant='h6' fontWeight={600}>Dados do primeiro gestor</Typography>
        </Box>
        <Box display='flex' flexDirection='column' gap={2.5}>
          <TextField
            label='Nome completo'
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            fullWidth
            error={userNameError}
            helperText={userNameError ? 'Campo obrigatório' : ''}
          />
          <TextField
            label='E-mail'
            type='email'
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            required
            fullWidth
            error={userEmailError}
            helperText={userEmailError ? 'Informe um e-mail válido' : ''}
          />
          <TextField
            label='Senha'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            error={passwordError}
            helperText={passwordError ? 'Campo obrigatório' : ''}
          />
          <TextField
            label='Confirmar senha'
            type='password'
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            fullWidth
            error={passwordConfirmError}
            helperText={passwordConfirmError ? 'Campo obrigatório' : ''}
          />
        </Box>
      </Box>

      <Box display='flex' justifyContent='flex-end' gap={2} flexWrap='wrap'>
        <Button variant='text' onClick={handleBackToLogin}>Cancelar</Button>
        <Button
          variant='contained'
          startIcon={<SaveRoundedIcon />}
          onClick={handleSubmit}
          disabled={loading || disabled}
          sx={{
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${BRAND.cyan} 0%, ${BRAND.cyanDark} 100%)`,
            '&:hover': { background: `linear-gradient(135deg, ${BRAND.cyanLight} 0%, ${BRAND.cyan} 100%)` },
          }}
        >
          Criar conta
        </Button>
      </Box>
    </PublicAuthLayout>
  )
}
