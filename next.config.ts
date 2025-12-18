import type { NextConfig } from "next";

const allowedDevOrigins =
  process.env.NEXT_DEV_ORIGINS?.split(",").map((v) => v.trim()).filter(Boolean) ??
  ["http://127.0.0.1:3000", "http://localhost:3000"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
