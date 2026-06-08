import type { NextConfig } from 'next';

/**
 * Next.js configuration for static export
 * Per D-17: Static export to Netlify CDN
 * No server functions required - all AI calls are client-side to Ollama
 */
const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;