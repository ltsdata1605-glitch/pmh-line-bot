const Firebase = require('./firebase');
const lineClient = require('./lineClient');
const CONFIG = require('./config');

const NL = '\n';

// Lưu trữ phân tầng cảnh báo gần nhất của từng loại PMH trong bộ nhớ
// Format: { 'ML200': 30, 'ICT50': 10 }
const lastAlertTiers = {};

const couponService = {
    /**
     * Tạo thông điệp thống kê PMH còn lại trong kho (lệnh tk)
     * Kèm cảnh báo tự động khi số lượng < 30, < 20, < 10 hoặc hết mã (0)
     */
    async getStatisticsMessage() {
        const coupons = await Firebase.getCoupons();
        if (!coupons || coupons.length === 0) {
            return '📊 Kho PMH hiện tại trống.';
        }

        // Đếm số lượng mã chưa sử dụng theo Loại PMH
        const counts = {};
        coupons.forEach(c => {
            if (!c || !c.code || !c.type) return;
            const type = String(c.type).trim().toUpperCase();
            if (counts[type] === undefined) {
                counts[type] = 0;
            }
            if (c.status === 'UNUSED' || !c.status) {
                counts[type]++;
            }
        });

        const syntaxText = await Firebase.getSyntax();

        const lines = [
            '📊 THỐNG KÊ PMH CÒN LẠI:',
            '------------------------'
        ];

        const getStockTag = (count) => {
            if (count === 0) return ' ❌ HẾT';
            if (count < 10) return ` (🔴 Khẩn <10)`;
            if (count < 20) return ` (🟠 Gấp <20)`;
            if (count < 30) return ` (🟡 Sắp hết <30)`;
            return '';
        };

        if (syntaxText) {
            const rawLines = syntaxText.split(/\r?\n/);
            let startIndex = -1;

            for (let i = 0; i < rawLines.length; i++) {
                if (rawLines[i].indexOf('⬢') !== -1) {
                    startIndex = i;
                    break;
                }
            }

            if (startIndex !== -1) {
                const itemRegex = /^\s*-\s*([^:]+?)\s*:\s*(\S+)\s*$/;
                for (let i = startIndex; i < rawLines.length; i++) {
                    const rawLine = rawLines[i];
                    const line = rawLine.trim();

                    if (line === '') {
                        lines.push('');
                        continue;
                    }

                    if (line.indexOf('__') !== -1 || line.indexOf('--') !== -1 || line.includes('KG-') || line.includes('FORM')) {
                        break;
                    }

                    if (line.indexOf('⬢') !== -1) {
                        lines.push(line);
                    } else {
                        const match = rawLine.match(itemRegex);
                        if (match) {
                            const displayName = match[1].trim();
                            const typeCode = match[2].trim().toUpperCase();
                            const count = counts[typeCode] !== undefined ? counts[typeCode] : 0;
                            lines.push('- ' + displayName + ': ' + count + getStockTag(count));
                        } else {
                            lines.push(line);
                        }
                    }
                }
            }
        }

        // Nếu không parse được theo cấu trúc syntax, liệt kê toàn bộ các loại
        if (lines.length <= 2) {
            const sortedTypes = Object.keys(counts).sort();
            sortedTypes.forEach(t => {
                const count = counts[t];
                lines.push(`- ${t}: ${count}${getStockTag(count)}`);
            });
        }

        lines.push('------------------------');
        lines.push('💡 Gõ "cp" để lấy mẫu đăng ký PMH.');

        return lines.join(NL);
    },

    /**
     * Tự động kiểm tra và gửi cảnh báo khi số lượng mã < 30, < 20, < 10 hoặc = 0
     * @param {string} loaiPMHJustIssued - Loại PMH vừa được phát
     * @param {string} sourceChatId - ID nhóm chat hoặc cá nhân nơi phát sinh yêu cầu
     */
    async checkAndSendLowStockAlert(loaiPMHJustIssued, sourceChatId) {
        try {
            if (!loaiPMHJustIssued) return;
            const normType = String(loaiPMHJustIssued).trim().toUpperCase();

            // Đếm số lượng mã chưa sử dụng
            const remaining = await Firebase.getUnusedCountByType(normType);

            // Xác định mốc cảnh báo
            let tier = null;
            let tierTitle = '';
            let tierIcon = '';

            if (remaining === 0) {
                tier = 0;
                tierTitle = 'HẾT MÃ HOÀN TOÀN (0 mã)';
                tierIcon = '🚨';
            } else if (remaining < CONFIG.LOW_STOCK_THRESHOLDS.CRITICAL) { // < 10
                tier = 10;
                tierTitle = 'CỰC KỲ KHẨN CẤP (< 10 mã)';
                tierIcon = '🔴';
            } else if (remaining < CONFIG.LOW_STOCK_THRESHOLDS.HIGH) { // < 20
                tier = 20;
                tierTitle = 'CẦN NẠP GẤP (< 20 mã)';
                tierIcon = '🟠';
            } else if (remaining < CONFIG.LOW_STOCK_THRESHOLDS.WARNING) { // < 30
                tier = 30;
                tierTitle = 'SẮP HẾT MÃ (< 30 mã)';
                tierIcon = '🟡';
            }

            // Nếu số lượng an toàn (>= 30), xóa ghi nhớ tier cũ để lần sau kích hoạt lại
            if (tier === null) {
                delete lastAlertTiers[normType];
                return;
            }

            // Nếu đã từng cảnh báo ở chính xác tier này rồi thì không gửi lặp lại
            if (lastAlertTiers[normType] === tier) {
                return;
            }

            // Cập nhật tier đã cảnh báo
            lastAlertTiers[normType] = tier;

            // Tìm tên hiển thị từ cú pháp nếu có
            const syntaxText = await Firebase.getSyntax();
            let displayName = normType;
            if (syntaxText) {
                const itemRegex = new RegExp(`^\\s*-\\s*([^:]+?)\\s*:\\s*${normType}\\s*$`, 'mi');
                const m = syntaxText.match(itemRegex);
                if (m) displayName = m[1].trim();
            }

            const alertMessage = [
                `⚠️ CẢNH BÁO: KHO SẮP HẾT MÃ PMH ⚠️`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `${tierIcon} Loại PMH: ${displayName} (${normType})`,
                `📉 Số lượng còn lại: ${remaining} mã!`,
                `⚡ Cảnh báo: ${tierTitle}`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `👉 Quản lý vui lòng xin phiếu hoặc kiểm tra tồn trước khi tư vấn!`
            ].join(NL);

            const targets = new Set();

            // 1. Gửi vào nhóm chat nơi đơn vừa phát sinh (nếu là group C... hoặc room R...)
            if (sourceChatId && (sourceChatId.startsWith('C') || sourceChatId.startsWith('R'))) {
                targets.add(sourceChatId);
            }

            // 2. Gửi vào các nhóm chat BOT LINE đang tham gia
            try {
                const groups = await Firebase.getGroups();
                if (groups && groups.length > 0) {
                    groups.forEach(g => {
                        if (g.active !== false && g.groupId) {
                            targets.add(g.groupId);
                        }
                    });
                }
            } catch (err) {
                console.error('[LowStockAlert] Lỗi getGroups:', err.message);
            }

            // 3. Gửi cho các Admin IDs
            if (Array.isArray(CONFIG.ADMIN_IDS)) {
                CONFIG.ADMIN_IDS.forEach(adminId => {
                    if (adminId) targets.add(adminId);
                });
            }

            let sentCount = 0;
            for (const targetId of targets) {
                const ok = await lineClient.pushText(targetId, alertMessage);
                if (ok) sentCount++;
                await new Promise(r => setTimeout(r, 200));
            }

            console.log(`[LowStockAlert] Đã gửi cảnh báo [${tierTitle}] loại ${normType} (còn ${remaining} mã) tới ${sentCount} kênh.`);

            // Ghi log hệ thống
            await Firebase.logSystem('LOW_STOCK_ALERT', {
                type: normType,
                displayName: displayName,
                remainingCount: remaining,
                tier: tier,
                sentTargets: sentCount
            });
        } catch (error) {
            console.error('[LowStockAlert] Lỗi xử lý cảnh báo tồn kho:', error);
        }
    },

    /**
     * Kiểm tra trùng lặp MĐH xin mã
     * Yêu cầu: Nếu đã cấp thì phát hiện để thu hồi mã cũ và cấp mã mới
     */
    async checkDuplicateRequest(userId, loaiPMH, mdh) {
        if (!mdh) return { action: 'allow' };

        const requests = await Firebase.getRequests();
        const normMdh = String(mdh).trim().toUpperCase();
        const normType = String(loaiPMH).trim().toUpperCase();

        const duplicate = requests.slice().reverse().find(r => {
            return String(r.mdh || '').trim().toUpperCase() === normMdh &&
                (r.status === CONFIG.REQUEST_STATUS_SENT || r.status === 'SENT') &&
                r.couponCode;
        });

        if (duplicate) {
            return {
                action: 'revoke_and_reissue',
                existing: duplicate
            };
        }

        return { action: 'allow' };
    },

    /**
     * Lấy lịch sử nhận mã PMH của người dùng trong ngày hôm nay (00:00 - 23:59)
     */
    async getUserTodayHistory(userId) {
        if (!userId) return null;

        const requests = await Firebase.getRequests();
        const now = new Date();

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = dateFormatter.format(now); // "YYYY-MM-DD"

        const todayFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const todayDisplay = todayFormatter.format(now); // "DD/MM/YYYY"

        const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // Lọc các mã được phát hôm nay của Quản lý này
        const matched = requests.filter(r => {
            if (r.userId !== userId && r.recipientId !== userId) return false;
            if (r.status !== CONFIG.REQUEST_STATUS_SENT && r.status !== 'SENT') return false;
            if (!r.couponCode) return false;

            const reqDate = new Date(r.createdAt || r.updatedAt || 0);
            try {
                return dateFormatter.format(reqDate) === todayStr;
            } catch (e) {
                return false;
            }
        });

        const items = matched.map((r, idx) => {
            let timeStr = '--:--';
            try {
                timeStr = timeFormatter.format(new Date(r.createdAt || r.updatedAt));
            } catch (e) {}

            return {
                stt: idx + 1,
                time: timeStr,
                loaiPMH: r.loaiPMH || 'PMH',
                code: r.couponCode,
                mdh: r.mdh || '-',
                maKho: r.maKho || '-',
                displayName: r.displayName || 'Quản lý'
            };
        });

        return {
            todayDisplay,
            count: items.length,
            items
        };
    },

    /**
     * Tạo báo cáo tổng kết cuối ngày lúc 22:00 (Daily Recap)
     */
    async generateDailyRecapMessage() {
        const requests = await Firebase.getRequests();
        const coupons = await Firebase.getCoupons();
        const now = new Date();

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = dateFormatter.format(now); // "YYYY-MM-DD"

        const todayFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const todayDisplay = todayFormatter.format(now); // "DD/MM/YYYY"

        // Lọc các yêu cầu đã phát trong ngày hôm nay
        const todayRequests = requests.filter(r => {
            if (r.status !== CONFIG.REQUEST_STATUS_SENT && r.status !== 'SENT') return false;
            if (!r.couponCode) return false;
            const reqDate = new Date(r.createdAt || r.updatedAt || 0);
            try {
                return dateFormatter.format(reqDate) === todayStr;
            } catch (e) {
                return false;
            }
        });

        const totalSentToday = todayRequests.length;

        // Thống kê theo loại PMH
        const typeCounts = {};
        const whCounts = {};

        todayRequests.forEach(r => {
            const t = String(r.loaiPMH || 'PMH').trim().toUpperCase();
            typeCounts[t] = (typeCounts[t] || 0) + 1;

            const w = String(r.maKho || '').trim();
            if (w) {
                whCounts[w] = (whCounts[w] || 0) + 1;
            }
        });

        let typeBreakdown = '';
        if (Object.keys(typeCounts).length > 0) {
            typeBreakdown = Object.entries(typeCounts)
                .map(([type, count]) => `${type}: ${count} mã`)
                .join(' | ');
        } else {
            typeBreakdown = 'Chưa phát sinh lượt cấp mã trong ngày';
        }

        let topWarehouses = '';
        const sortedWh = Object.entries(whCounts).sort((a, b) => b[1] - a[1]);
        if (sortedWh.length > 0) {
            topWarehouses = sortedWh
                .slice(0, 5)
                .map(([kho, count]) => `Kho ${kho} (${count} mã)`)
                .join(', ');
        } else {
            topWarehouses = 'Không có';
        }

        // Đếm tồn kho hiện tại
        const remainingStock = coupons.filter(c => c.status === 'UNUSED' || !c.status).length;

        const lines = [
            `📊 BÁO CÁO PHÁT MÃ NGÀY ${todayDisplay}:`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `• Tổng mã đã phát trong ngày: ${totalSentToday} mã`,
            `• ${typeBreakdown}`,
            `• Top siêu thị xin nhiều: ${topWarehouses}`,
            `• Tồn kho hiện tại: Còn ${remainingStock.toLocaleString('vi-VN')} mã`
        ];

        return lines.join(NL);
    }
};

module.exports = couponService;
