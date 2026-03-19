import { useEffect, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { api } from '../services/api'

type EmailLog = {
  id: number
  to: string
  subject: string
  templateKey: string
  payload: string | null
  sentAt: string
  status: string
  error: string | null
  createdAt: string
}

export default function EmailLogsPage() {
  const [items, setItems] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/emails', { params: { to: filter || undefined } })
      setItems(res.data.items)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível carregar os e-mails.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resend = async (id: number) => {
    await api.post(`/emails/${id}/resend`)
    await load()
  }

  if (loading) return <Box display='flex' justifyContent='center' py={8}><CircularProgress /></Box>

  return (
    <Box p={3}>
      <Typography variant='h5' fontWeight={700} mb={2}>E-mails enviados</Typography>
      {error && <Alert severity='error' sx={{ mb: 2 }}>{error}</Alert>}
      <Box display='flex' gap={2} mb={2}>
        <TextField label='Filtrar por destinatário' value={filter} onChange={(e) => setFilter(e.target.value)} />
        <Button variant='contained' onClick={load}>Filtrar</Button>
      </Box>
      <Paper>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Para</TableCell>
              <TableCell>Assunto</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ação</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.to}</TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell>{row.templateKey}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>
                  {row.status === 'FAIL' && <Button onClick={() => resend(row.id)}>Reenviar</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

