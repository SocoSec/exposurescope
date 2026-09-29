/** @type {import('next').NextConfig} */
// ─────────────────────────────────────────────────────────────────────────────
// Security headers on every response. What each one does:
//   Content-Security-Policy  which sources scripts, styles and requests may use.
//                            connect-src allows only this site and the Pwned
//                            Passwords API (the one call the browser makes).
//   X-Frame-Options / frame-ancestors  nobody can embed Exposio in a frame
//                            (blocks clickjacking the consent checkbox).
//   Referrer-Policy          never tell other sites which page linked to them.
//   Permissions-Policy       no camera, microphone or location access, ever.
//   Strict-Transport-Security  browsers must always use HTTPS.
//
// Next.js needs 'unsafe-inline' for its hydration scripts without a nonce
// setup, and the dev server needs 'unsafe-eval' + websockets for hot reload —
// those two relaxations apply ONLY to `next dev`.
// ─────────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://api.pwnedpasswords.com" + (isDev ? " ws: wss:" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // don't advertise the framework
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
