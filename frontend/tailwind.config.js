/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Classic theme (giữ nguyên màu kiểm tra)
        'classic-light': '#00FF00', // Xanh lá cây rất sáng
        'classic-dark': '#000000',  // Đen tuyền
        
        // Ocean theme (giữ nguyên màu tối hơn)
        'ocean-light': '#2a64c4',
        'ocean-dark': '#153a80',
        
        // Sunset theme (giữ nguyên màu tối hơn)
        'sunset-light': '#c85e0c',
        'sunset-dark': '#9b4205',
        
        // Forest theme (giữ nguyên màu tối hơn)
        'forest-light': '#046b4b',
        'forest-dark': '#024d35',
        
        // Royal theme (ĐÃ THAY ĐỔI MÀU CỰC KỲ NỔI BẬT ĐỂ KIỂM TRA)
        'royal-light': '#FF0000', // Đỏ tươi
        'royal-dark': '#0000FF',  // Xanh lam tươi
        
        // Pink theme (giữ nguyên màu tối hơn)
        'pink-light': '#b93a74',
        'pink-dark': '#8a2b56',
        
        // Mint theme (giữ nguyên màu tối hơn)
        'mint-light': '#0a8a5e',
        'mint-dark': '#036445',
        
        // Lavender theme (giữ nguyên màu tối hơn)
        'lavender-light': '#7b5fc7',
        'lavender-dark': '#5e409c',
        
        // Coral theme (giữ nguyên màu tối hơn)
        'coral-light': '#c65c69',
        'coral-dark': '#9b3f49',
        
        // Sky theme (giữ nguyên màu tối hơn)
        'sky-light': '#0b7eaf',
        'sky-dark': '#015e8b',
      },
      backgroundImage: { // Giữ nguyên các định nghĩa gradient
        'gradient-board-classic': 'linear-gradient(135deg, #1e7e34 0%, #0f4d1e 100%)',
        'gradient-board-ocean': 'linear-gradient(135deg, #2a64c4 0%, #153a80 100%)',
        'gradient-board-sunset': 'linear-gradient(135deg, #c85e0c 0%, #9b4205 100%)',
        'gradient-board-forest': 'linear-gradient(135deg, #046b4b 0%, #024d35 100%)',
        'gradient-board-royal': 'linear-gradient(135deg, #FF0000 0%, #0000FF 100%)', // Cập nhật gradient cho Royal
        'gradient-board-pink': 'linear-gradient(135deg, #b93a74 0%, #8a2b56 100%)',
        'gradient-board-mint': 'linear-gradient(135deg, #0a8a5e 0%, #036445 100%)',
        'gradient-board-lavender': 'linear-gradient(135deg, #7b5fc7 0%, #5e409c 100%)',
        'gradient-board-coral': 'linear-gradient(135deg, #c65c69 0%, #9b3f49 100%)',
        'gradient-board-sky': 'linear-gradient(135deg, #0b7eaf 0%, #015e8b 100%)',
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' }
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
