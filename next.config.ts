import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Link previews (Telegram, Viber, WhatsApp) read only <head>. By default Next puts page metadata there
  // only for user agents it knows as bots and streams it into <body> for everyone else, so a messenger
  // it does not know showed the site's generic description instead of the dispute's. Every request
  // gets the metadata in <head>.
  htmlLimitedBots: /.*/,
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
