/** @type {import('next').NextConfig} */
const nextConfig = {

  images: {
    remotePatterns: [
      {
        
        protocol: 'https',
        hostname: 'iorrotlayfegnkxhyobm.supabase.co',
        port: '',
        pathname: '**',
      },
      {
      
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

module.exports = nextConfig;