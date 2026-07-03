import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fab-erp/shared", "@fab-erp/core", "@fab-erp/agent"],
};

export default nextConfig;
