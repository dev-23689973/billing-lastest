import path from "path";
import { fileURLToPath } from "url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/admin/tickets/create",
        destination: "/admin/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/admin/tickets/complete",
        destination: "/admin/tickets/dashboard?status=2",
        permanent: false,
      },
      {
        source: "/admin/tickets/:id(\\d+)",
        destination: "/admin/tickets/dashboard?ticket=:id",
        permanent: false,
      },
      {
        source: "/admin/tickets",
        destination: "/admin/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/manager/tickets/create",
        destination: "/manager/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/manager/tickets/complete",
        destination: "/manager/tickets/dashboard?status=2",
        permanent: false,
      },
      {
        source: "/manager/tickets/:id(\\d+)",
        destination: "/manager/tickets/dashboard?ticket=:id",
        permanent: false,
      },
      {
        source: "/manager/tickets",
        destination: "/manager/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/reseller/tickets/create",
        destination: "/reseller/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/reseller/tickets/complete",
        destination: "/reseller/tickets/dashboard?status=2",
        permanent: false,
      },
      {
        source: "/reseller/tickets/:id(\\d+)",
        destination: "/reseller/tickets/dashboard?ticket=:id",
        permanent: false,
      },
      {
        source: "/reseller/tickets",
        destination: "/reseller/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/dealer/tickets/create",
        destination: "/dealer/tickets/dashboard",
        permanent: false,
      },
      {
        source: "/dealer/tickets/complete",
        destination: "/dealer/tickets/dashboard?status=2",
        permanent: false,
      },
      {
        source: "/dealer/tickets/:id(\\d+)",
        destination: "/dealer/tickets/dashboard?ticket=:id",
        permanent: false,
      },
      {
        source: "/dealer/tickets",
        destination: "/dealer/tickets/dashboard",
        permanent: false,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default withBundleAnalyzer(nextConfig);
