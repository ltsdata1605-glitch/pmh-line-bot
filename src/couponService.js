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
                `👉 Quản lý / Admin vui lòng nạp thêm mã vào kho sớm để tránh gián đoạn duyệt đơn.`
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
     * Kiểm tra trùng lặp yêu cầu xin mã
     */
    async checkDuplicateRequest(userId, loaiPMH, mdh) {
        if (!mdh) return { action: 'allow' };

        const requests = await Firebase.getRequests();
        const normMdh = String(mdh).trim().toUpperCase();
        const normType = String(loaiPMH).trim().toUpperCase();

        const duplicate = requests.find(r => {
            return String(r.mdh || '').trim().toUpperCase() === normMdh &&
                (r.status === CONFIG.REQUEST_STATUS_SENT || r.status === CONFIG.REQUEST_STATUS_PENDING);
        });

        if (duplicate) {
            if (String(duplicate.loaiPMH).trim().toUpperCase() === normType) {
                return { action: 'block_same_type', existing: duplicate };
            } else {
                return { action: 'allow_with_change_notice', existing: duplicate };
            }
        }

        return { action: 'allow' };
    }
};

module.exports = couponService;
