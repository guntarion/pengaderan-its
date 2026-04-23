/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Performance optimizations
  experimental: {
    // Enable server actions
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    // Optimize page loading
    optimizeCss: true,
    // Add output export
    output: 'standalone',
  },
  compiler: {
    // Remove console.log in production but keep error/warn/info for structured logger
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn', 'info', 'debug'] }
      : false,
  },
  // Improve page load performance
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Prevent clickjacking — only allow framing from same origin
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Prevent XSS in older browsers (modern browsers use CSP)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Force HTTPS (enable when deployed with HTTPS)
          // {
          //   key: 'Strict-Transport-Security',
          //   value: 'max-age=31536000; includeSubDomains',
          // },
          // Content Security Policy
          // Permissive by default — tighten per project.
          // Uses 'unsafe-inline' for styles (required by Tailwind/CSS-in-JS)
          // and 'unsafe-eval' in dev (required by Next.js HMR).
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline for Next.js
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              // Styles: self + inline for Tailwind
              "style-src 'self' 'unsafe-inline'",
              // Images: self + data URIs + Google (for OAuth avatars)
              "img-src 'self' data: blob: https://lh3.googleusercontent.com",
              // Fonts: self + Google Fonts
              "font-src 'self' data:",
              // API connections: self + configured services
              "connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com",
              // Frames: same origin only
              "frame-ancestors 'self'",
              // Form submissions: self only
              "form-action 'self'",
              // Base URI: self only
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
