/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Development only (NODE_ENV is 'development' under `next dev` and
  // 'production' under `next build`): proxy the PHP contact endpoint to the
  // companion `php -S` server started by scripts/dev-local.mjs, so the
  // Contact form works locally the same way it will on GoDaddy. Rewrites are
  // unsupported by the static export, so the key is omitted entirely at
  // build time.
  ...(process.env.NODE_ENV === 'development'
    ? {
        async rewrites() {
          const phpOrigin =
            process.env.MS_PHP_ORIGIN || 'http://127.0.0.1:8080';
          // beforeFiles: checked BEFORE the public/ filesystem, otherwise the
          // real public/api/contact.php file shadows this proxy in dev.
          return {
            beforeFiles: [
              { source: '/api/contact.php', destination: `${phpOrigin}/api/contact.php` },
            ],
          };
        },
      }
    : {}),
};

export default nextConfig;
