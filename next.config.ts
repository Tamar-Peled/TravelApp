import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

const baseConfig: NextConfig = {};

export default function nextConfig(phase: string): NextConfig {
  // Disable PWA in dev server for fast HMR / no SW caching.
  if (phase === PHASE_DEVELOPMENT_SERVER) return baseConfig;

  // Enable during production build (and runtime config evaluation).
  if (phase === PHASE_PRODUCTION_BUILD || process.env.NODE_ENV === "production") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const withPWA = require("@ducanh2912/next-pwa").default({
      dest: "public",
    }) as (config: NextConfig) => NextConfig;
    return withPWA(baseConfig);
  }

  return baseConfig;
}
