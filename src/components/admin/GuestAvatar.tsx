import { guestAvatar, guestInitial, guestLabel, avatarColor } from '@/lib/guest'

type Guest = Parameters<typeof guestLabel>[0]

/**
 * The guest's uploaded photo when their account has one, coloured initials
 * otherwise — never a blank circle, since `full_name` starts out empty.
 */
export default function GuestAvatar({
  guest, size = 'sm', className = '',
}: {
  guest: Guest
  size?: 'sm' | 'lg'
  className?: string
}) {
  const box = size === 'lg' ? 'w-14 h-14 text-xl rounded-2xl' : 'w-8 h-8 text-xs rounded-full'
  const photo = guestAvatar(guest)

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className={`${box} shrink-0 border border-gray-200 object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`${box} shrink-0 flex items-center justify-center font-bold text-white ${avatarColor(guestLabel(guest))} ${className}`}
    >
      {guestInitial(guest)}
    </div>
  )
}
