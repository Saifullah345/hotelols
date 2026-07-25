import RoomsTabNav from './RoomsTabNav'

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <RoomsTabNav />
      {children}
    </div>
  )
}
