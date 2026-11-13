/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig = {
  /* config options here */
  ...(isCapacitorBuild
    ? { output: "export", trailingSlash: true }
    : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (isCapacitorBuild) return [];

    const backendUrl = (
      process.env.TASKIFY_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
