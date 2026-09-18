const cron = require('node-cron');
const Firebase = require('./firebase');
const lineClient = require('./lineClient');
const couponService = require('./couponService');

function setupCronJobs() {
    console.log('[Cron] Khởi tạo hệ thống tự động chạy định kỳ...');

    // 1. Gửi thống kê 6:00 AM giờ Việt Nam (UTC+7 -> 23:00 UTC hôm trước)
    cron.schedule('0 23 * * *', async () => {
        console.log('[Cron] Chạy báo cáo thống kê 6:00 AM VN...');
        await sendDailyReport('🌅 BÁO CÁO ĐẦU NGÀY (6:00 AM)');
    });

    // 2. Gửi thống kê 15:00 PM giờ Việt Nam (UTC+7 -> 08:00 UTC)
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] Chạy báo cáo thống kê 15:00 PM VN...');
        await sendDailyReport('☀️ BÁO CÁO GIỮA CA (15:00 PM)');
    });
}

async function sendDailyReport(title) {
    try {
        const settings = await Firebase.getSettings();
        const activeChatIds = settings.activeChatIds || [];

        if (activeChatIds.length === 0) {
            console.log('[Cron] Chưa có nhóm chat nào đăng ký nhận báo cáo.');
            return;
        }

        const stats = await couponService.getStatisticsMessage();
        const fullMessage = `${title}\n------------------------\n${stats}`;

        for (const chatId of activeChatIds) {
            await lineClient.pushText(chatId, fullMessage);
        }
    } catch (e) {
        console.error('[Cron] Lỗi sendDailyReport:', e.message);
    }
}

module.exports = {
    setupCronJobs
};
