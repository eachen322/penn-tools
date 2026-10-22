/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: [
    "@penntools/core",
    "@penntools/platform",
  ],
  // Ensures server-only modules (Prisma, env vars) never leak to the client bundle.
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  async redirects() {
    return [
      // AI Compass was a registered tool whose page only redirected here; it's a community tool now.
      { source: "/tools/ai-compass", destination: "https://akshitkalra.com/aicompass", permanent: true },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist optionally depends on `canvas` for server-side rendering.
    // We only use it in the browser, so stub it out to prevent build failures.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default config;
