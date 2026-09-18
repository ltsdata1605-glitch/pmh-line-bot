require('dotenv').config();

const CONFIG = {
    PORT: process.env.PORT || 3000,
    CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'PV0zYFfao3csbp9pgnhaoPfl20UdgD34o41ybR4omINqt/u4j/LIpQkJXBGvF+KxRXv4yd7SU6//WJ/gdIUZGhy8MbAPAF6nSklA2PJwyPGsDew30Vu17P655KoEigJx4KpH10kgnRBsIK1db2OXJwdB04t89/1O/w1cDnyilFU=',
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
