/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the 'output: 'export'' line is NOT present.
  // It will break image optimization.

  images: {
    remotePatterns: [
      {
        // Pattern for your Supabase storage URL
        protocol: 'https',
        hostname: 'iorrotlayfegnkxhyobm.supabase.co',
        port: '',
        pathname: '**',
      },
      {
        // Pattern for Google user profile pictures and their subdomains
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

module.exports = nextConfig;