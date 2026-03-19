export type ToastSeverity = 'success' | 'error' | 'info' | 'warning'

type ToastHandler = (severity: ToastSeverity, message: string) => void

let handler: ToastHandler | null = null

const STORAGE_KEY = 'flashToast:v1'

type FlashToastPayload = { severity: ToastSeverity; message: string; ts: number }

export function setToastHandler(next: ToastHandler | null) {
  handler = next
}

export function consumePendingToast(): { severity: ToastSeverity; message: string } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw) as FlashToastPayload
    if (!parsed?.message?.trim()) return null
    return { severity: parsed.severity, message: parsed.message }
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return null
  }
}

function show(severity: ToastSeverity, message: string) {
  if (!message?.trim()) return
  // Persist so it can be shown after redirects / first mount.
  try {
    const payload: FlashToastPayload = { severity, message, ts: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }

  // If provider already mounted, show immediately.
  handler?.(severity, message)
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
  warning: (message: string) => show('warning', message),
}

