import type { ReactNode } from 'react'
import { Box, Paper, Skeleton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import BusinessIcon from '@mui/icons-material/Business'
import PeopleIcon from '@mui/icons-material/People'
import GroupsIcon from '@mui/icons-material/Groups'
import WorkIcon from '@mui/icons-material/Work'
import GradeIcon from '@mui/icons-material/Grade'
import CategoryIcon from '@mui/icons-material/Category'
import SchoolIcon from '@mui/icons-material/School'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import EmailIcon from '@mui/icons-material/Email'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import PageHeader from '../../components/PageHeader'
import InfoTip from '../../components/InfoTip'
import { alpha } from '@mui/material/styles'
import { BRAND } from '../../theme/ThemeProvider'
import { dashboardService } from '../../services/dashboardService'
import type { AdminHealthStats } from '../../types'

type CardProps = {
  label: string
  value: number | string
  icon: ReactNode
  color: string
  tip?: string
}

function StatCard({ label, value, icon, color, tip }: CardProps) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant='subtitle2' sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {label}
          {tip ? <InfoTip title={tip} /> : null}
        </Typography>
        <Typography variant='h4' fontWeight={800} sx={{ color }}>
          {value}
        </Typography>
      </Box>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: alpha(color, 0.12),
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
    </Paper>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminHealthStats>({
    queryKey: ['dashboard-admin-health'],
    queryFn: () => dashboardService.getAdminHealth(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })

  return (
    <Box sx={{ minWidth: 0, overflowX: 'hidden' }}>
      <PageHeader>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h4' fontWeight={800} sx={{ mb: 0.5 }}>
            Saúde do Sistema
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Visão operacional e crescimento do produto.
          </Typography>
        </Box>
      </PageHeader>

      {isLoading && (
        <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={2}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} variant='rounded' height={90} sx={{ borderRadius: '16px' }} />
          ))}
        </Box>
      )}

      {!isLoading && data && (
        <>
          <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={2} mb={3}>
            <StatCard label='EMPRESAS (TOTAL)' value={data.companiesTotal} icon={<BusinessIcon />} color={BRAND.cyan} tip='Total de empresas cadastradas no sistema.' />
            <StatCard label='EMPRESAS (ATIVAS)' value={data.companiesActive} icon={<VerifiedUserIcon />} color={BRAND.success} tip='Empresas com status ativo (is_active = true).' />
            <StatCard label='USUÁRIOS (TOTAL)' value={data.usersTotal} icon={<PeopleIcon />} color={BRAND.purple} tip='Total de usuários cadastrados.' />
            <StatCard label='USUÁRIOS (VERIFICADOS)' value={data.usersEmailVerified} icon={<VerifiedUserIcon />} color={BRAND.success} tip='Usuários com e-mail verificado (is_email_verified = true).' />
            <StatCard label='TIMES' value={data.teamsTotal} icon={<GroupsIcon />} color={BRAND.cyanLight} tip='Total de times cadastrados.' />
            <StatCard label='CARGOS (ROLES)' value={data.rolesTotal} icon={<WorkIcon />} color={BRAND.warning} tip='Total de cargos (roles) cadastrados (somatório entre empresas).' />
            <StatCard label='NÍVEIS (GRADES)' value={data.gradesTotal} icon={<GradeIcon />} color={BRAND.purpleLight} tip='Total de níveis (grades) cadastrados.' />
            <StatCard label='CATEGORIAS' value={data.categoriesTotal} icon={<CategoryIcon />} color={BRAND.cyan} tip='Total de categorias cadastradas (somatório entre empresas).' />
            <StatCard label='COMPETÊNCIAS' value={data.skillsTotal} icon={<SchoolIcon />} color={BRAND.purple} tip='Total de competências cadastradas.' />
          </Box>

          <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={2}>
            <StatCard label='AVALIAÇÕES (REGISTROS)' value={data.skillAssessmentsTotal} icon={<AssignmentOutlinedIcon />} color={BRAND.purple} tip='Total de registros em skill_assessments (avaliações realizadas).' />
            <StatCard label='AUDITORIA (LOGS)' value={data.auditLogsTotal} icon={<FactCheckIcon />} color={BRAND.cyan} tip='Total de registros em audit_logs (operações registradas).' />
            <StatCard label='E-MAILS (LOGS)' value={data.emailLogsTotal} icon={<EmailIcon />} color={BRAND.warning} tip='Total de logs de envio de e-mail em email_logs.' />
          </Box>
        </>
      )}
    </Box>
  )
}

