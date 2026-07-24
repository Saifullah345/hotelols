'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

export function RoomRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
    >
      {children}
    </tr>
  )
}

export function ActionsCell({ children }: { children: ReactNode }) {
  return (
    <td
      className="table-cell"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-end gap-1 pr-1">
        {children}
      </div>
    </td>
  )
}
