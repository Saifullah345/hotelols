'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary flex items-center gap-2 text-sm print:hidden"
    >
      <Printer className="h-4 w-4" />
      Print Receipt
    </button>
  )
}
