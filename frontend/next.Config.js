/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Khuyến nghị bật strict mode cho React
  // Xóa hoặc đảm bảo không có 'swcMinify: true' ở đây
  // Nếu bạn có các cấu hình khác, hãy giữ lại chúng ngoại trừ swcMinify
};

// frontend/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true
});

module.exports = withPWA({
  reactStrictMode: true
});

module.exports = nextConfig;

