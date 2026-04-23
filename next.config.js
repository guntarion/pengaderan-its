/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React StrictMode for better development experience
  reactStrictMode: true,

  // Configure image domains for optimization
  images: {
    domains: [
      'images.unsplash.com', 
      'plus.unsplash.com',
      'lh3.googleusercontent.com', // Google profile images
      'avatars.githubusercontent.com', // GitHub profile images
      'platform-lookaside.fbsbx.com', // Facebook profile images
    ],
  },

  // Experimental features
  experimental: {
    // Keep these experimental features enabled if needed
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
    },
  },
};

module.exports = nextConfig;
