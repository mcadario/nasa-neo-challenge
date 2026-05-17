/** @type {import('next').NextConfig} */
const repoName = "nasa-neo-challenge";
const isGithubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGithubPages ? `/${repoName}` : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,

  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",

  images: {
    unoptimized: true,
  },

  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;