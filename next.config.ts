import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // /join/:token is the user-friendly invite URL that redirects to the full invite page.
    // Covers the no-locale path (before middleware adds locale) and both locale prefixes.
    return [
      { source: "/join/:token",     destination: "/p/invite/:token",    permanent: false },
      { source: "/uk/join/:token",  destination: "/uk/p/invite/:token", permanent: false },
      { source: "/en/join/:token",  destination: "/en/p/invite/:token", permanent: false },
    ];
  },
};

export default nextConfig;
