/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/sistema",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Rewrite /uploads/* to the authenticated API serve route so all uploaded
  // files (old and new) are served with correct Content-Type by Next.js,
  // bypassing any nginx static-file config issues.
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/v1/uploads/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
