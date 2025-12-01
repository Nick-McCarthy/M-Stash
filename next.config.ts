import type { NextConfig } from "next";

// Get S3 bucket configuration from environment variables
const bucketName = process.env.AWS_S3_BUCKET_NAME || "media-library-hosting";
const awsRegion = process.env.AWS_REGION || "us-east-1";

// Construct S3 hostname: {bucket}.s3.{region}.amazonaws.com
const s3Hostname = `${bucketName}.s3.${awsRegion}.amazonaws.com`;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: s3Hostname,
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude pg and related modules from client-side bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
