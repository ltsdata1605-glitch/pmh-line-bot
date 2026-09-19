const cron = require('node-cron');
const Firebase = require('./firebase');
const lineClient = require('./lineClient');
const couponService = require('./couponService');

function setupCronJobs() {
    console.log('[Cron] Khởi tạo hệ thống tự động chạy định kỳ & scheduler hẹn giờ...');

    // 1. Kiểm tra và chạy lịch hẹn thông báo mỗi phút theo giờ Việt Nam (UTC+7)
    cron.schedule('* * * * *', async () => {
        await checkAndRunSchedules();
    });

    // 2. Báo cáo thống kê 6:00 AM giờ Việt Nam (UTC+7 -> 23:00 UTC hôm trước)
    cron.schedule('0 23 * * *', async () => {
        console.log('[Cron] Chạy báo cáo thống kê 6:00 AM VN...');
        await sendDailyReport('🌅 BÁO CÁO ĐẦU NGÀY (6:00 AM)');
    });

    // 3. Báo cáo thống kê 15:00 PM giờ Việt Nam (UTC+7 -> 08:00 UTC)
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] Chạy báo cáo thống kê 15:00 PM VN...');
        await sendDailyReport('☀️ BÁO CÁO GIỮA CA (15:00 PM)');
    });
}

/**
 * Kiểm tra các lịch hẹn thông báo cần kích hoạt
 */
async function checkAndRunSchedules() {
    try {
        const now = new Date();

        // Định dạng thời gian theo múi giờ Việt Nam (UTC+7)
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const currentTime = timeFormatter.format(now); // "HH:mm"

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const currentDate = dateFormatter.format(now); // "YYYY-MM-DD"

        const dayFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            weekday: 'short'
        });
        const currentDay = dayFormatter.format(now); // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"

        const schedules = await Firebase.getSchedules();
        if (!schedules || schedules.length === 0) return;

        for (const sched of schedules) {
            if (sched.active === false) continue;

            // 1. Kiểm tra giờ: HH:mm
            if (sched.time !== currentTime) continue;

            // 2. Ngăn ngừa chạy trùng lặp trong cùng 1 phút
            if (sched.lastRunAt) {
                const diffMs = now.getTime() - new Date(sched.lastRunAt).getTime();
                if (diffMs < 55 * 1000) {
                    continue;
                }
            }

            // 3. Kiểm tra chu kỳ lặp (scheduleType)
            const type = sched.scheduleType || 'DAILY';
            if (type === 'ONCE') {
                if (sched.date && sched.date !== currentDate) {
                    continue;
                }
            } else if (type === 'WEEKDAYS') {
                const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(currentDay);
                if (!isWeekday) continue;
            } else if (type === 'CUSTOM_DAYS') {
                // Múi giờ Việt Nam: 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7
                const vnDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                const vnDayNum = vnDate.getDay();
                if (Array.isArray(sched.daysOfWeek) && sched.daysOfWeek.length > 0) {
                    const matched = sched.daysOfWeek.map(Number).includes(vnDayNum);
                    if (!matched) continue;
                }
            }


            console.log(`[Cron] ⏰ Kích hoạt lịch hẹn "${sched.title || sched.id}" (${currentTime})...`);
            await executeSchedule(sched);
        }
    } catch (err) {
        console.error('[Cron] Lỗi checkAndRunSchedules:', err.message);
    }
}

/**
 * Thực thi gửi thông báo theo một lịch hẹn cụ thể
 */
async function executeSchedule(sched) {
    try {
        if (!sched || !sched.content) return { success: false, reason: 'NO_CONTENT' };

        let targetGroupIds = [];
        if (!sched.target || sched.target === 'ALL_GROUPS') {
            const groups = await Firebase.getGroups();
            targetGroupIds = groups.filter(g => g.active !== false).map(g => g.groupId);
        } else if (Array.isArray(sched.target)) {
            targetGroupIds = sched.target;
        } else if (typeof sched.target === 'string') {
            targetGroupIds = [sched.target];
        }

        if (targetGroupIds.length === 0) {
            console.log(`[Cron] Lịch "${sched.title}" không có nhóm nhận nào.`);
            await Firebase.updateSchedule(sched.id, {
                lastRunAt: new Date().toISOString(),
                lastStatus: 'SKIPPED_NO_GROUPS'
            });
            return { success: false, reason: 'NO_GROUPS' };
        }

        let sentCount = 0;
        const msg = sched.content;

        for (const gid of targetGroupIds) {
            const ok = await lineClient.pushText(gid, msg);
            if (ok) sentCount++;
            await new Promise(r => setTimeout(r, 250));
        }

        const updates = {
            lastRunAt: new Date().toISOString(),
            lastStatus: sentCount > 0 ? 'SUCCESS' : 'FAILED',
            lastSentCount: sentCount,
            runCount: (sched.runCount || 0) + 1
        };

        // Nếu là loại gửi 1 lần duy nhất, tắt active sau khi chạy
        if (sched.scheduleType === 'ONCE') {
            updates.active = false;
        }

        await Firebase.updateSchedule(sched.id, updates);
        await Firebase.logSystem('SCHEDULE_EXECUTED', {
            scheduleId: sched.id,
            title: sched.title,
            sentCount,
            totalTargets: targetGroupIds.length
        });

        console.log(`[Cron] Hoàn thành gửi lịch "${sched.title}": ${sentCount}/${targetGroupIds.length} nhóm.`);
        return { success: true, sentCount, total: targetGroupIds.length };
    } catch (err) {
        console.error(`[Cron] Lỗi executeSchedule "${sched.id}":`, err.message);
        await Firebase.updateSchedule(sched.id, {
            lastRunAt: new Date().toISOString(),
            lastStatus: 'ERROR: ' + err.message
        });
        return { success: false, error: err.message };
    }
}

/**
 * Gửi thông báo phát sóng tức thì tới các nhóm
 */
async function broadcastMessage(text, targetGroupIds = null) {
    if (!text || !text.trim()) return { success: false, message: 'Nội dung thông báo không được để trống' };

    let targets = targetGroupIds;
    if (!targets || targets === 'ALL_GROUPS' || (Array.isArray(targets) && targets.length === 0)) {
        const groups = await Firebase.getGroups();
        targets = groups.filter(g => g.active !== false).map(g => g.groupId);
    }

    if (!Array.isArray(targets) || targets.length === 0) {
        return { success: false, message: 'Không có nhóm nào để gửi' };
    }

    let sent = 0;
    const cleanText = text.trim();
    for (const gid of targets) {
        const ok = await lineClient.pushText(gid, cleanText);
        if (ok) sent++;
        await new Promise(r => setTimeout(r, 200));
    }

    await Firebase.logSystem('BROADCAST_SENT', {
        sentCount: sent,
        totalTargets: targets.length
    });

    return { success: true, sentCount: sent, total: targets.length };
}

/**
 * Báo cáo tự động sáng/chiều
 */
async function sendDailyReport(title) {
    try {
        const settings = await Firebase.getSettings();
        let targetChatIds = settings.activeChatIds || [];

        // Nếu settings chưa lưu chat IDs thì lấy toàn bộ nhóm đang active
        if (targetChatIds.length === 0) {
            const groups = await Firebase.getGroups();
            targetChatIds = groups.filter(g => g.active !== false).map(g => g.groupId);
        }

        if (targetChatIds.length === 0) {
            console.log('[Cron] Chưa có nhóm chat nào để gửi báo cáo.');
            return;
        }

        const stats = await couponService.getStatisticsMessage();
        const fullMessage = `${title}\n------------------------\n${stats}`;

        for (const chatId of targetChatIds) {
            await lineClient.pushText(chatId, fullMessage);
            await new Promise(r => setTimeout(r, 200));
        }
    } catch (e) {
        console.error('[Cron] Lỗi sendDailyReport:', e.message);
    }
}

module.exports = {
    setupCronJobs,
    checkAndRunSchedules,
    executeSchedule,
    broadcastMessage
};
