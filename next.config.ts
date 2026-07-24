import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  turbopack: {
    resolveAlias: {
      "maplibre-contour": "./node_modules/maplibre-contour/dist/index.mjs",
    },
  },
};

export default nextConfig;
