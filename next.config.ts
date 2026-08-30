import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Self-hosted Supabase — the instance storage now serves from. Kept
      // alongside the old *.supabase.co pattern so rows still holding hosted
      // project URLs keep rendering.
      { protocol: 'https', hostname: 'supabase.n6solution.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  experimental: {
    // Client-side Router Cache. Next 15 defaults `dynamic` to 0, so a prefetched
    // RSC payload is thrown away immediately and re-fetched the moment you click
    // the link you just hovered — the sidebar's ~14 links were being fetched
    // twice over, and re-fetched again on every back/forward.
    //
    // Safe to hold here only because mutations already invalidate explicitly:
    // 37 router.refresh() call sites plus revalidateTag() in the API routes.
    // If you add a mutation path that skips both, it will show stale data for
    // up to `dynamic` seconds — refresh after writing, don't lower this.
    // `static` is left at Next's default of 300s, which is already generous.
    staleTimes: {
      dynamic: 30,
    },
  },
}

export default nextConfig
