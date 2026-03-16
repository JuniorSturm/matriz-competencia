import type { NavigateFunction } from 'react-router-dom'

let navigateRef: NavigateFunction | null = null

export function setNavigate(navigate: NavigateFunction) {
  navigateRef = navigate
}

export function getNavigate(): NavigateFunction | null {
  return navigateRef
}
