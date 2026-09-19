require('dotenv').config();

const CONFIG = {
    PORT: process.env.PORT || 3000,
    CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '9F7QmWsU0NsM+kZeiulqf8QfrswlRZ4l2NbriCD1+iKh4vjRmQ0yozFKm7ZXBUScaGNiWJJPaHRtxqggYCtSmr2LZZutKdjUpO7G16TBoX1eN80OJ1dpksdu5/cmZdNf1B/dpU2TO+Ip/R38bbL4eAdB04t89/1O/w1cDnyilFU=',
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

    // Cảnh báo sắp hết mã
    LOW_STOCK_THRESHOLD: 5
};

module.exports = CONFIG;
