/** @type {import('next').NextConfig} */
const nextConfig = {
  // Erros de tipo agora quebram o build de propósito: foi o `ignoreBuildErrors`
  // que escondeu bugs reais (apiSuccess(data, 201), Buffer em BodyInit,
  // propriedade duplicada em UNIT_LABELS). O app mobile tem tsconfig próprio e
  // está excluído do tsconfig do web.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Next 15: renomeado de experimental.serverComponentsExternalPackages
  serverExternalPackages: ["bcryptjs"],
  images: {
    // Sem remotePatterns: todas as imagens do sistema são locais (servidas por
    // /api/v1/uploads). Com `hostname: "**"` qualquer host HTTPS podia ser
    // buscado via /_next/image, transformando o servidor em proxy aberto de
    // imagens (consumo de banda e SSRF parcial). Se algum dia precisar de um
    // host externo, liste-o explicitamente aqui.
    remotePatterns: [],
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Force HTTPS for 1 year (site is served over HTTPS via nginx/Certbot)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Prevent the site from being embedded in iframes (clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Block MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URLs to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful browser features the app doesn't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
