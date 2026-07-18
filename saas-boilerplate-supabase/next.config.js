const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print source map upload logs in CI
  silent: !process.env.CI,

  // Pass the auth token so source maps upload and stack traces are readable
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
