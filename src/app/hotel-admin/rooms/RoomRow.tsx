'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode, DragEventHandler } from 'react'

interface RoomRowProps {
  href: string
  children: ReactNode
  draggable?: boolean
  isDragOver?: boolean
  onDragStart?: DragEventHandler
  onDragOver?: DragEventHandler
  onDrop?: DragEventHandler
  onDragEnd?: DragEventHandler
}

export function RoomRow({ href, children, draggable, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: RoomRowProps) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${isDragOver ? 'border-t-2 border-primary-400 bg-primary-50/30' : ''}`}
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
      <div className="flex items-center justify-end pr-1">
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-gray-200 bg-gray-50/80 p-0.5">
          {children}
        </div>
      </div>
    </td>
  )
}
