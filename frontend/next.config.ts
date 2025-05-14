//alte Version in notes!

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TypeScript-Fehler während des Builds ignorieren
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint-Fehler während des Builds ebenfalls ignorieren
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;