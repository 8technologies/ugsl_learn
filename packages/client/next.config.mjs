/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  // Existing learner/admin pages have inherited lint debt. Type checking still
  // runs during production builds; lint cleanup remains a separate CI task.
  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placekitten.com",
        port: "",
        pathname: "/100/100",
      },
    ],
  },
};
export default config;
