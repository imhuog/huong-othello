/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Khuyến nghị bật strict mode cho React
  // Xóa hoặc đảm bảo không có 'swcMinify: true' ở đây
  // Nếu bạn có các cấu hình khác, hãy giữ lại chúng ngoại trừ swcMinify
};

module.exports = nextConfig;
