require('dotenv').config();

const NEW_BOT_TOKEN = '9F7QmWsU0NsM+kZeiulqf8QfrswlRZ4l2NbriCD1+iKh4vjRmQ0yozFKm7ZXBUScaGNiWJJPaHRtxqggYCtSmr2LZZutKdjUpO7G16TBoX1eN80OJ1dpksdu5/cmZdNf1B/dpU2TO+Ip/R38bbL4eAdB04t89/1O/w1cDnyilFU=';

const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
// Bắt buộc dùng NEW_BOT_TOKEN nếu env trên Render vẫn đang lưu token cũ của BOT PMH ICT (PV0zYFf...)
const activeToken = (envToken && !envToken.startsWith('PV0zYFf')) ? envToken : NEW_BOT_TOKEN;

const CONFIG = {
    PORT: process.env.PORT || 3000,
    CHANNEL_ACCESS_TOKEN: activeToken,
    CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '',
    FIREBASE_DB_URL: (process.env.FIREBASE_DB_URL || 'https://bot-l-e1587-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, ''),
    ADMIN_IDS: (process.env.ADMIN_IDS || 'U272dcb226f96e4e17e561b19ba8ab679').split(',').map(id => id.trim()).filter(Boolean),
    APPROVAL_COMMAND: process.env.APPROVAL_COMMAND || 'DUYỆT',

    // Trạng thái phiếu
    COUPON_STATUS_UNUSED: 'UNUSED',
    COUPON_STATUS_SENT: 'SENT',

    // Trạng thái yêu cầu
    REQUEST_STATUS_PENDING: 'Chờ duyệt đơn',
    REQUEST_STATUS_SENT: 'Đã phát mã',
    REQUEST_STATUS_OUT_OF_STOCK: 'Hết mã',
    REQUEST_STATUS_ERROR: 'Lỗi',

    // Ngưỡng cảnh báo tự động khi số lượng mã < 30, < 20, < 10
    LOW_STOCK_THRESHOLDS: {
        WARNING: 30,   // Cảnh báo mốc 1: Dưới 30 mã (Vàng)
        HIGH: 20,      // Cảnh báo mốc 2: Dưới 20 mã (Cam)
        CRITICAL: 10   // Cảnh báo mốc 3: Dưới 10 mã (Đỏ khẩn cấp)
    },
    LOW_STOCK_THRESHOLD: 30
};

module.exports = CONFIG;
