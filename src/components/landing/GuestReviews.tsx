import Image from 'next/image'
import { Star, Quote } from 'lucide-react'

/**
 * PLACEHOLDER CONTENT — these are not real guests and not real reviews.
 * They exist so the section can be designed and laid out before there are
 * enough real stays to quote. Replace this array with rows from the `reviews`
 * table (name, city, rating, body, avatar) before launch; leaving invented
 * quotes on a live booking site tells guests something that is not true.
 */
const REVIEWS = [
  {
    name: 'Ayesha Khan',
    city: 'Lahore',
    rating: 5,
    avatar: '/avatars/guest-2.svg',
    body: 'The hotel confirmed the booking within minutes and answered every question before we travelled. We reached Murree close to midnight and the room was still ready for us.',
  },
  {
    name: 'Bilal Ahmed',
    city: 'Karachi',
    rating: 5,
    avatar: '/avatars/guest-1.svg',
    body: 'I asked for an early check-in and had a reply the same hour. Everything was arranged before I landed, so there was no waiting at the desk.',
  },
  {
    name: 'Fatima Noor',
    city: 'Islamabad',
    rating: 4,
    avatar: '/avatars/guest-4.svg',
    body: 'Staff replied quickly and the room matched the photos exactly. Breakfast started a little later than listed, but they sent it up as soon as I asked.',
  },
  {
    name: 'Usman Tariq',
    city: 'Peshawar',
    rating: 5,
    avatar: '/avatars/guest-3.svg',
    body: 'I had to move my dates two days before the trip. The hotel responded on time and shifted the booking without any argument.',
  },
  {
    name: 'Hina Raza',
    city: 'Multan',
    rating: 5,
    avatar: '/avatars/guest-5.svg',
    body: 'Two rooms for the family, both clean and exactly as described. The manager even called a day early to confirm what time we would arrive.',
  },
  {
    name: 'Zeeshan Malik',
    city: 'Faisalabad',
    rating: 4,
    avatar: '/avatars/guest-6.svg',
    body: 'Good service and honest photos. Reception picked up on the first ring every time I called, before and during the stay.',
  },
]

export default function GuestReviews() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-14">
      <div className="mb-7">
        <h2 className="text-2xl font-extrabold text-gray-900">What guests say</h2>
        <p className="text-sm text-gray-400 mt-1">Feedback from guests after their stay</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REVIEWS.map(review => (
          <figure
            key={review.name}
            className="relative flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <Quote className="absolute right-5 top-5 h-8 w-8 text-indigo-50" aria-hidden="true" />

            <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-gray-600">
              &ldquo;{review.body}&rdquo;
            </blockquote>

            <figcaption className="mt-5 flex items-center gap-3 border-t border-gray-50 pt-4">
              <Image
                src={review.avatar}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 flex-shrink-0 rounded-full"
                unoptimized
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{review.name}</p>
                <p className="truncate text-xs text-gray-400">{review.city}, Pakistan</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
