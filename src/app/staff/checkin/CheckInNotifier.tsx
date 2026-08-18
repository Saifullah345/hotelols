'use client'

import { useEffect } from 'react'

interface Props {
  overdueCount: number
  departingCount: number
}

export default function CheckInNotifier({ overdueCount, departingCount }: Props) {
  // Insert overdue / departing-today notifications into the bell (once per day)
  useEffect(() => {
    if (overdueCount > 0 || departingCount > 0) {
      fetch('/api/admin/notifications/checkin', { method: 'POST' }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
