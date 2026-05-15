/** @type {import('next').NextConfig} */
const repoName = "nasa-neo-challenge";
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  output: "export",
  trailingSlash: true,

  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : "",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;