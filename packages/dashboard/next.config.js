/** @type {import('next').NextConfig} */
const path = require('path');
const rootEnv = path.resolve(__dirname, '../../.env');
if (require('fs').existsSync(rootEnv)) require('dotenv').config({ path: rootEnv });

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.discordapp.com' }],
  },
};

module.exports = nextConfig;
