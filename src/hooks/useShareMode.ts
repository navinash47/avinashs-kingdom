import { useMemo } from 'react'
import { isShareHost } from '../lib/shareMode'

export function useShareMode() {
  return useMemo(() => isShareHost(), [])
}
