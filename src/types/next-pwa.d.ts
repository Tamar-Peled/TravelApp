declare module "@ducanh2912/next-pwa" {
  import type { NextConfig } from "next";

  type PWAOptions = {
    dest?: string;
    [key: string]: unknown;
  };

  export default function withPWAInit(
    options: PWAOptions,
  ): (nextConfig: NextConfig) => NextConfig;
}

