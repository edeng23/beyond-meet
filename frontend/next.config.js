/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    env: {
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    },
    webpack: (config, { isServer }) => {
        // Add handling for canvas in SSR
        if (isServer) {
            config.externals.push({
                'react-force-graph-2d': 'commonjs react-force-graph-2d',
                canvas: 'commonjs canvas'
            });
        }

        return config;
    },
    transpilePackages: ['react-force-graph-2d', 'd3-force'],
}

module.exports = nextConfig 