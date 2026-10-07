const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error("Set BACKEND_URL to the Render API origin before deploying to Vercel.");
}
const backendOrigin = new URL(backendUrl);
if (backendOrigin.pathname !== "/" || backendOrigin.search || backendOrigin.hash ||
    backendOrigin.username || backendOrigin.password ||
    !["http:", "https:"].includes(backendOrigin.protocol)) {
  throw new Error("BACKEND_URL must be an HTTP(S) origin without a path or credentials.");
}
if (process.env.VERCEL && (backendOrigin.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(backendOrigin.hostname))) {
  throw new Error("Vercel BACKEND_URL must be a hosted HTTPS origin.");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendOrigin.origin}/api/v1/:path*`,
      },
      { source: "/api/v1/:path*", destination: `${backendOrigin.origin}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
