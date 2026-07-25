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
      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${isDragOver ? 'border-t-2 border-indigo-400 bg-indigo-50/30' : ''}`}
    >
      {children}
    </tr>
  )
}

export function ActionsCell({ children }: { children: ReactNode }) {
  return (
    <td className="table-cell" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-end gap-1 pr-1">
        {children}
      </div>
    </td>
  )
}
