# 🎮 Othello Game - Cờ Lật Online

Game cờ lật (Othello/Reversi) được phát triển với React, Next.js, Node.js và Socket.io. Hỗ trợ chơi multiplayer online và chế độ AI.

## ✨ Tính năng

### 🎯 Gameplay Core
- ✅ Click để đi quân với highlight nước đi hợp lệ
- ✅ Lật quân đúng luật Othello theo 8 hướng
- ✅ Đổi lượt 2 người chơi tự động
- ✅ Đếm thời gian 30s mỗi nước (auto skip nếu hết thời gian)
- ✅ Đếm điểm và xác định người thắng

### 🎨 Giao diện đẹp mắt
- ✅ 50+ emoji để chọn avatar
- ✅ 10 theme màu bàn cờ (cổ điển, đại dương, hoàng hôn, v.v.)
- ✅ Animation mượt mà khi lật quân
- ✅ UI gradient hiện đại với hiệu ứng glass morphism
- ✅ Bàn cờ có coordinate A-H, 1-8

### 📱 Responsive Design
- ✅ Tối ưu cho mobile và desktop
- ✅ Touch-friendly controls
- ✅ Adaptive layout

### 🏠 Multiplayer Online
- ✅ Tạo room với mã ID 6 số
- ✅ Chia sẻ link mời bạn bè
- ✅ Auto-fill mã phòng từ URL
- ✅ Chat trực tiếp trong game
- ✅ Toast notifications

### 🤖 Chế độ AI
- ✅ 3 độ khó: Dễ, Trung bình, Khó
- ✅ AI sử dụng thuật toán minimax cho độ khó cao

### 🎮 Tính năng khác
- ✅ Nút "Ván mới" để reset game
- ✅ Hướng dẫn luật chơi chi tiết
- ✅ Màn hình kết thúc với animation đẹp mắt
- ✅ Lưu theme trong session

## 🚀 Cài đặt và chạy

### Prerequisites
- Node.js 18+
- npm hoặc yarn

### 1. Clone repository
```bash
git clone <your-repo-url>
cd othello-game
```

### 2. Setup Backend
```bash
cd backend
npm install
npm run dev  # Development
# hoặc
npm run build && npm start  # Production
```

Backend sẽ chạy trên `http://localhost:3001`

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev  # Development
# hoặc
npm run build && npm start  # Production
```

Frontend sẽ chạy trên `http://localhost:3000`

## 🌐 Deploy

### Deploy Backend lên Render

1. Tạo account trên [Render.com](https://render.com)
2. Tạo new Web Service
3. Connect GitHub repository
4. Cấu hình:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `18`

5. Environment Variables:
   ```
   NODE_ENV=production
   ```

6. Deploy và copy URL (ví dụ: `https://your-app.onrender.com`)

### Deploy Frontend lên Vercel

1. Tạo account trên [Vercel.com](https://vercel.com)
2. Import GitHub repository
3. Cấu hình:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`

4. Environment Variables:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-render-backend.onrender.com
   ```

5. Deploy và copy URL

### Cập nhật cấu hình

1. **Backend** (`next.config.js`):
   ```javascript
   env: {
     NEXT_PUBLIC_SOCKET_URL: 'https://your-render-backend.onrender.com'
   }
   ```

2. **Backend** (`src/server.ts`):
   ```typescript
   cors: {
     origin: ['https://your-vercel-frontend.vercel.app'],
     credentials: true
   }
   ```

## 📁 Cấu trúc thư mục

```
othello-game/
├── backend/
│   ├── src/
│   │   └── server.ts          # Socket.io server + game logic
             database.ts
   /models/Player.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── components/
│   │   ├── Board.tsx          # Bàn cờ game
│   │   ├── Chat.tsx           # Chat component
│   │   ├── GameInfo.tsx       # Thông tin game
│   │   ├── MainMenu.tsx       # Menu chính
│   │   └── ThemeSelector.tsx  # Chọn theme
            VoiceChat.tsx
            VoiceControls.tsx
│   ├── contexts/
│   │   ├── GameContext.tsx    # Game state management
│   │   └── SocketContext.tsx  # Socket connection
│   ├── pages/
│   │   ├── _app.tsx          # App wrapper
│   │   ├── index.tsx         # Trang chính
│   │   └── game.tsx          # Trang game
│   ├── styles/
│   │   └── globals.css       # CSS styles
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
└── README.md
```

## 🎮 Hướng dẫn chơi

### Tạo phòng và mời bạn
1. Nhập tên và chọn emoji
2. Click "Tạo phòng mới"
3. Copy link và gửi cho bạn bè
4. Chờ bạn vào phòng và click "Bắt đầu game"

### Chơi với AI
1. Chọn tab "Chơi AI"
2. Chọn độ khó (Dễ/Trung bình/Khó)
3. Click "Chơi với AI"

### Luật chơi cơ bản
- Mục tiêu: Chiếm nhiều ô nhất trên bàn cờ 8x8
- Lật quân đối thủ bằng cách "kẹp" chúng theo 8 hướng
- Người chơi 1 (⚫) đi trước, người chơi 2 (⚪) đi sau
- Mỗi nước đi có 30 giây suy nghĩ

## 🛠 Công nghệ sử dụng

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Socket.io Client** - Real-time communication
- **React Hot Toast** - Notifications

### Backend
- **Node.js** + **Express** - Server
- **Socket.io** - Real-time multiplayer
- **TypeScript** - Type safety
- **UUID** - Room ID generation

## 🐛 Troubleshooting

### Backend không kết nối được
- Kiểm tra PORT và CORS settings
- Verify Socket.io URL trong frontend
- Check firewall và network settings

### Frontend lỗi build
- Xóa `.next` folder và `node_modules`
- Chạy `npm install` lại
- Kiểm tra TypeScript errors

### Game lag hoặc không sync
- Check internet connection
- Verify server đang chạy
- Clear browser cache

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Check console logs (F12)
2. Verify cả frontend và backend đang chạy
3. Kiểm tra network connectivity
4. Xem lại cấu hình environment variables

## 📄 License

MIT License - Free to use and modify.

---

🎮 **Chúc bạn chơi game vui vẻ!** 🎮

