import { useEffect, useMemo, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'
import type { ToastSeverity } from '../toast'
import { consumePendingToast, setToastHandler } from '../toast'

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<ToastSeverity>('info')

  const handleClose = () => setOpen(false)

  const handler = useMemo(
    () => (sev: ToastSeverity, msg: string) => {
      setSeverity(sev)
      setMessage(msg)
      setOpen(true)
    },
    [],
  )

  useEffect(() => {
    setToastHandler(handler)
    const pending = consumePendingToast()
    if (pending) handler(pending.severity, pending.message)
    return () => setToastHandler(null)
  }, [handler])

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleClose} severity={severity} variant='filled' sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  )
}

