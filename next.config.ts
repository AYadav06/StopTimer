import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // `pg` relies on optional native resolution; keep it out of the bundler so it
  // runs as a normal Node.js package on Vercel.
  serverExternalPackages: ['pg'],
}

export default nextConfig
