import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build for the Docker image / VM deploy.
  output: "standalone",
  // Keep Prisma's generated client and engine out of the bundler.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;
