const express = require('express');
const cors = require('cors');
const path = require('path');
const CONFIG = require('./src/config');
const { handleLineEvent } = require('./src/botHandler');
const { setupCronJobs } = require('./src/cronJobs');
const Firebase = require('./src/firebase');

const app = express();

app.use(cors());

// Phục vụ webhook LINE (yêu cầu JSON body)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Phục vụ Web Quản Trị trực tiếp từ thư mục /admin
app.use(express.static(path.join(__dirname, 'admin')));

// 2. Health check endpoint
app.get('/api/health', async (req, res) => {
    const syntax = await Firebase.getSyntax();
    res.json({
        status: 'OK',
        service: 'PMH LINE BOT & Web Admin',
        firebaseConnected: !!syntax,
        timestamp: new Date().toISOString()
    });
});

// 3. Webhook GET verification (một số công cụ kiểm tra URL bằng GET)
app.get('/webhook', (req, res) => {
    res.send('PMH LINE BOT Webhook is running!');
});

// 4. Webhook POST - Tiếp nhận sự kiện từ LINE Messaging API
app.post('/webhook', async (req, res) => {
    // Trả lời 200 OK ngay lập tức cho LINE server để không bị timeout
    res.status(200).send('OK');

    const events = req.body.events;
    if (!events || !Array.isArray(events) || events.length === 0) {
        return;
    }

    // Xử lý song song các sự kiện trong mảng
    for (const event of events) {
        try {
            await handleLineEvent(event);
        } catch (err) {
            console.error('[Server] Lỗi khi xử lý sự kiện LINE:', err);
        }
    }
});

// 5. Fallback route chuyển về trang quản trị
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Khởi động server
const server = app.listen(CONFIG.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 PMH LINE BOT & Web Admin đang chạy tại:`);
    console.log(`   - Cổng: ${CONFIG.PORT}`);
    console.log(`   - Web Quản Trị: http://localhost:${CONFIG.PORT}`);
    console.log(`   - Webhook URL : http://localhost:${CONFIG.PORT}/webhook`);
    console.log(`   - Firebase DB : ${CONFIG.FIREBASE_DB_URL}`);
    console.log(`====================================================`);

    // Kích hoạt tác vụ hẹn giờ
    setupCronJobs();
});

// Xử lý tắt an toàn
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
