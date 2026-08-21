import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
}

export default nextConfig
