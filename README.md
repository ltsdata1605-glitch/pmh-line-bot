# 🤖 HỆ THỐNG PMH LINE BOT & WEB ADMIN CLOUD

Hệ thống quản lý kho mã Coupon PMH và phát mã tự động qua **LINE Messaging API**, sử dụng **Node.js Express** và cơ sở dữ liệu thời gian thực **Firebase Realtime Database** (Singapore - Ping ~50ms).

> [!NOTE]
> **Dự án này đã tách rời và loại bỏ hoàn toàn Google Apps Script**. Toàn bộ logic chạy trên Node.js chuẩn, dễ dàng đưa lên GitHub và triển khai trên Cloud (Render, Railway, Fly.io, Vercel) chỉ với 1 cú click.

---

## 📁 Cấu Trúc Dự Án

```text
├── .gitignore              # Bỏ qua node_modules, .env để bảo mật
├── .env.example            # Mẫu biến môi trường
├── .env                    # Cấu hình Token & Firebase thực tế (không đẩy lên Git)
├── package.json            # Quản lý thư viện và scripts
├── server.js               # Điểm chạy Express Server (Webhook & Web Admin)
├── src/
│   ├── config.js           # Quản lý cấu hình biến môi trường
│   ├── firebase.js         # Thao tác đọc/ghi siêu tốc vào Firebase Realtime DB
│   ├── lineClient.js       # Tương tác với LINE Messaging API (reply, push, quote)
│   ├── parser.js           # Bóc tách form đăng ký xin mã PMH của Quản lý
│   ├── couponService.js    # Tìm mã, thống kê (tk), kiểm tra chống trùng lặp
│   ├── botHandler.js       # Phân luồng xử lý toàn bộ lệnh bot (DUYỆT, cp, tk, form PMH)
│   └── cronJobs.js         # Gửi thống kê tự động 6h & 15h định kỳ (thay thế Trigger GAS)
└── admin/                  # Giao diện Web Quản Trị (Light theme, Xuất/Nhập Excel)
```

---

## 🚀 Hướng Dẫn Chạy Tại Máy Cục Bộ (Localhost)

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Khởi động server
```bash
npm start
```
Server sẽ chạy tại cổng `3000`:
- **Web Quản Trị**: [http://localhost:3000](http://localhost:3000)
- **Webhook Endpoint**: `http://localhost:3000/webhook`
- **Kiểm tra trạng thái**: `http://localhost:3000/api/health`

---

## 🌐 Hướng Dẫn Đưa Lên GitHub (Từng Bước)

### Bước 1: Khởi tạo Git cục bộ
Mở Terminal tại thư mục dự án và chạy:
```bash
git init
git add .
git commit -m "Khoi tao PMH LINE Bot va Web Admin Node.js"
```

### Bước 2: Tạo Repository trên GitHub
1. Truy cập [https://github.com/new](https://github.com/new)
2. Đặt tên Repository (Ví dụ: `pmh-line-bot`).
3. Chọn chế độ **Private** (Riêng tư) để bảo mật mã nguồn.
4. Bấm **Create repository**.

### Bước 3: Đẩy mã nguồn lên GitHub
Copy các lệnh hiển thị trên GitHub (thay `YOUR_USERNAME` bằng tên GitHub của bạn):
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pmh-line-bot.git
git push -u origin main
```

---

## ☁️ Hướng Dẫn Triển Khai Chạy 24/7 Lên Cloud (Miễn Phí với Render.com)

Render.com cho phép bạn host Web Service Node.js miễn phí, tự động cập nhật mỗi khi bạn push code lên GitHub:

### Bước 1: Đăng ký & Kết nối GitHub
1. Truy cập [https://render.com](https://render.com) và đăng nhập bằng tài khoản **GitHub**.
2. Chọn **New +** ➔ **Web Service**.
3. Chọn repository `pmh-line-bot` vừa tạo.

### Bước 2: Cấu hình Web Service
- **Name**: `pmh-line-bot` (hoặc tên tuỳ ý)
- **Region**: Singapore (Southeast Asia)
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: **Free**

### Bước 3: Thêm Biến Môi Trường (Environment Variables)
Kéo xuống mục **Environment Variables**, thêm các biến sau:
- `LINE_CHANNEL_ACCESS_TOKEN`: *(Dán Token LINE của bạn)*
- `FIREBASE_DB_URL`: `https://bot-l-e1587-default-rtdb.asia-southeast1.firebasedatabase.app`
- `ADMIN_IDS`: `U272dcb226f96e4e17e561b19ba8ab679`
- `APPROVAL_COMMAND`: `DUYỆT`

Nhấn **Create Web Service**. Sau khoảng 1-2 phút, Render sẽ cấp cho bạn đường dẫn URL HTTPS công khai, ví dụ:
```text
https://pmh-line-bot.onrender.com
```

---

## 🔗 Cài Đặt Webhook Trên LINE Developers Console

1. Truy cập [LINE Developers Console](https://developers.line.biz/console/).
2. Chọn Channel **Messaging API** của Bot.
3. Chuyển sang tab **Messaging API**:
   - Tại mục **Webhook URL**, bấm **Edit** và dán:
     ```text
     https://pmh-line-bot.onrender.com/webhook
     ```
   - Gạt công tắc **Use webhook** sang **ON**.
   - Bấm nút **Verify** ➔ Nhận thông báo **Success** màu xanh là hoàn tất 100%!

> [!TIP]
> Từ bây giờ, bất cứ khi nào bạn chỉnh sửa code và gõ `git push`, Render sẽ tự động cập nhật phiên bản mới nhất cho Bot và Web Admin mà không cần thao tác thủ công nào nữa!
