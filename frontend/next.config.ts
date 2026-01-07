import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  poweredByHeader: false,
  reactStrictMode: false, // Performance: Disable in production to avoid double-renders
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow external S3/Images
      }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  experimental: {
     optimizeCss: true,
     serverActions: {
       bodySizeLimit: '10mb',
     }
  }
};

export default nextConfig;
