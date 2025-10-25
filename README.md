
# Minecraft Bot Manager 🤖

Một hệ thống quản lý bot Minecraft tự động với giao diện web hiện đại, được xây dựng trên Replit.

## ✨ Tính năng

- 🤖 **Bot Minecraft tự động**: Hỗ trợ farming, PVP, và nhiều chức năng khác
- 🌐 **Web Dashboard**: Giao diện quản lý bot trực quan
- 🎮 **3D Viewer**: Xem bot hoạt động trong môi trường 3D
- 💬 **AI Chat**: Tích hợp Google Gemini AI cho tương tác thông minh
- 📊 **Real-time Monitoring**: Theo dõi trạng thái bot thời gian thực

## 🚀 Cài đặt

### Yêu cầu
- Node.js 20+
- PostgreSQL (hoặc Neon serverless database)

### Các bước

1. Clone repository:
```bash
git clone <your-repo-url>
cd <project-name>
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` và cấu hình:
```env
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

4. Chạy ứng dụng:
```bash
npm run dev
```

## 📦 Scripts

- `npm run web` - Khởi động web server
- `npm run bot` - Khởi động Minecraft bot
- `npm run viewer` - Khởi động 3D viewer
- `npm run dev` - Chạy tất cả services đồng thời
- `npm run build` - Build production
- `npm run start` - Chạy production build

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL với Drizzle ORM
- **Bot**: Mineflayer, Prismarine Viewer
- **AI**: Google Gemini AI
- **Build Tools**: Vite, esbuild

## 📁 Cấu trúc dự án

```
├── client/          # Frontend React app
├── server/          # Backend Express server
├── Embe/            # Bot logic và types
├── shared/          # Shared schemas và types
└── dist/            # Build output
```

## 🔧 Cấu hình

Bot có thể được cấu hình thông qua web interface hoặc trực tiếp trong code:

- Server Minecraft
- Chế độ hoạt động (farming, PVP, auto-eat, etc.)
- AI personality và behavior
- Auto-reconnect settings

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo Pull Request hoặc mở Issue để thảo luận.

## 📝 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 🙏 Credits

- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Prismarine Viewer](https://github.com/PrismarineJS/prismarine-viewer)
- [Google Gemini AI](https://ai.google.dev/)

## 📞 Liên hệ

Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng tạo issue trên GitHub.
