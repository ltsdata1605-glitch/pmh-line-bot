const express = require('express');
const cors = require('cors');
const path = require('path');
const CONFIG = require('./src/config');
const { handleLineEvent } = require('./src/botHandler');
const { setupCronJobs, executeSchedule, broadcastMessage } = require('./src/cronJobs');
const lineClient = require('./src/lineClient');
const Firebase = require('./src/firebase');
const realtimeHub = require('./src/realtimeHub');

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
        version: '1.3.3',
        botName: 'DM_Tây Nam Bộ',
        tokenPrefix: CONFIG.CHANNEL_ACCESS_TOKEN.slice(0, 10),
        service: 'PMH LINE BOT & Web Admin',
        firebaseConnected: !!syntax,
        realtimeClients: realtimeHub.getClientCount(),
        timestamp: new Date().toISOString()
    });
});

// 2.0 Server-Sent Events (SSE) Realtime Stream cho Web Admin
app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Tắt buffering proxy Render / Nginx

    res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    realtimeHub.addClient(res);
    console.log(`[Realtime] Web Admin connected (active: ${realtimeHub.getClientCount()})`);

    // Heartbeat định kỳ 20s tránh ngắt kết nối HTTP
    const heartbeatTimer = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch (e) {
            clearInterval(heartbeatTimer);
        }
    }, 20000);

    req.on('close', () => {
        clearInterval(heartbeatTimer);
        realtimeHub.removeClient(res);
        console.log(`[Realtime] Web Admin disconnected (active: ${realtimeHub.getClientCount()})`);
    });
});

// 2.1 Kích hoạt gửi ngay một lịch hẹn thông báo
app.post('/api/schedules/trigger/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const schedules = await Firebase.getSchedules();
        const sched = schedules.find(s => s.id === id);
        if (!sched) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lịch hẹn' });
        }
        const result = await executeSchedule(sched);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2.2 Phát sóng thông báo nhanh tới nhóm
app.post('/api/broadcast', async (req, res) => {
    try {
        const { text, targets } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung thông báo không được để trống' });
        }
        const result = await broadcastMessage(text, targets || 'ALL_GROUPS');
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2.3 Làm mới thông tin (tên, avatar) của các nhóm đã lưu
app.post('/api/groups/refresh', async (req, res) => {
    try {
        const groups = await Firebase.getGroups();
        let updatedCount = 0;
        for (const g of groups) {
            if (g.groupId && g.groupId.startsWith('C')) {
                const summary = await lineClient.getGroupSummary(g.groupId);
                if (summary && summary.groupName) {
                    await Firebase.saveGroup({
                        groupId: g.groupId,
                        groupName: summary.groupName,
                        pictureUrl: summary.pictureUrl || g.pictureUrl || ''
                    });
                    updatedCount++;
                }
            }
        }
        res.json({ success: true, updatedCount });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. Webhook GET verification (một số công cụ kiểm tra URL bằng GET)
app.get('/webhook', (req, res) => {
    res.send('PMH LINE BOT Webhook is running!');
});

// 4. Webhook POST - Tiếp nhận sự kiện từ LINE Messaging API
app.post('/webhook', async (req, res) => {
    const events = req.body.events;
    if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(200).send('No events');
    }

    Firebase.logSystem('WEBHOOK_EVENTS', events.map(e => ({
        type: e.type,
        text: e.message?.text,
        sourceType: e.source?.type,
        groupId: e.source?.groupId,
        userId: e.source?.userId
    }))).catch(() => {});

    // Xử lý tất cả sự kiện song song trước khi trả về 200 OK (chuẩn architecture của Botline_nhacviec)
    await Promise.all(
        events.map(async (event) => {
            if (event?.deliveryContext?.isRedelivery) {
                console.log('[LINE] Bỏ qua sự kiện redelivery:', event.webhookEventId);
                return;
            }
            try {
                await handleLineEvent(event);
            } catch (err) {
                console.error('[Server] Lỗi khi xử lý sự kiện LINE:', err);
                Firebase.logSystem('EVENT_HANDLER_ERROR', err?.message || String(err)).catch(() => {});
            }
        })
    );

    return res.status(200).send('OK');
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
