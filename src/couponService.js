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

            // Tính toán dự báo tốc độ tiêu thụ và thời gian cạn kho
            const forecast = await this.calculateDepletionForecast(normType, remaining);

            const alertLines = [
                `⚠️ CẢNH BÁO: KHO SẮP HẾT MÃ PMH ⚠️`,
                `━━━━━━━━━━━━━━━━━━━━━`,
                `${tierIcon} Loại PMH: ${displayName} (${normType})`,
                `📉 Số lượng còn lại: ${remaining} mã!`,
                `⚡ Cảnh báo: ${tierTitle}`
            ];

            if (forecast && forecast.text) {
                alertLines.push(`⏱️ ${forecast.text}`);
            }

            alertLines.push(`━━━━━━━━━━━━━━━━━━━━━`);
            alertLines.push(`👉 Quản lý vui lòng kiểm tra tồn hoặc xin trước khi tư vấn!`);

            const alertMessage = alertLines.join(NL);

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

        const cleanMdh = (val) => String(val || '').replace(/[\s\r\n\t]+/g, '').toUpperCase();
        const normMdh = cleanMdh(mdh);
        if (!normMdh) return { action: 'allow' };

        // 1. Kiểm tra xem đơn MĐH này có đang nằm trong hàng đợi chờ duyệt không
        const requests = await Firebase.getRequests();
        const pendingReq = requests.slice().reverse().find(r => {
            const rMdh = cleanMdh(r.mdh);
            const isPending = r.status === CONFIG.REQUEST_STATUS_PENDING || r.status === 'PENDING' || r.status === 'Chờ duyệt đơn';
            return rMdh === normMdh && isPending;
        });

        if (pendingReq) {
            return {
                action: 'already_pending',
                existing: pendingReq
            };
        }

        // 2. Kiểm tra trong danh sách requests đã phát mã (ưu tiên đơn gần nhất)
        const duplicateReq = requests.slice().reverse().find(r => {
            const rMdh = cleanMdh(r.mdh);
            const isSent = r.status === CONFIG.REQUEST_STATUS_SENT || r.status === 'SENT' || r.status === 'Đã phát mã';
            return rMdh === normMdh && isSent && r.couponCode;
        });

        if (duplicateReq) {
            return {
                action: 'revoke_and_reissue',
                existing: duplicateReq
            };
        }

        // 2. Fallback: Kiểm tra trực tiếp trong danh sách coupons (theo orderId)
        try {
            const coupons = await Firebase.getCoupons();
            const dupCoupon = coupons.find(c => {
                const cMdh = cleanMdh(c.orderId);
                const isSent = c.status === 'SENT' || c.status === CONFIG.COUPON_STATUS_SENT;
                return cMdh === normMdh && isSent && c.code;
            });

            if (dupCoupon) {
                return {
                    action: 'revoke_and_reissue',
                    existing: {
                        couponCode: dupCoupon.code,
                        loaiPMH: dupCoupon.type || loaiPMH,
                        displayName: dupCoupon.recipient || 'Quản lý',
                        createdAt: dupCoupon.sentAt || dupCoupon.updatedAt || new Date().toISOString(),
                        mdh: dupCoupon.orderId
                    }
                };
            }
        } catch (e) {
            console.error('[couponService] Lỗi fallback kiểm tra coupons:', e.message);
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
     * Lấy toàn bộ lịch sử nhận mã PMH của người dùng, gom nhóm và phân theo từng ngày
     */
    async getUserAllHistory(userId) {
        if (!userId) return null;

        const requests = await Firebase.getRequests();

        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const displayDateFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // Lọc tất cả các mã đã phát của Quản lý này
        const matched = requests.filter(r => {
            if (r.userId !== userId && r.recipientId !== userId) return false;
            if (r.status !== CONFIG.REQUEST_STATUS_SENT && r.status !== 'SENT') return false;
            if (!r.couponCode) return false;
            return true;
        });

        if (!matched || matched.length === 0) {
            return { count: 0, groups: [] };
        }

        // Sắp xếp thời gian giảm dần (mới nhất lên đầu)
        matched.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

        // Gom nhóm theo từng ngày
        const groupMap = {};
        matched.forEach(r => {
            const reqDate = new Date(r.createdAt || r.updatedAt || 0);
            let dateKey = 'Khác';
            let dateDisplay = 'Khác';
            try {
                dateKey = dateFormatter.format(reqDate); // "YYYY-MM-DD"
                dateDisplay = displayDateFormatter.format(reqDate); // "DD/MM/YYYY"
            } catch (e) {}

            if (!groupMap[dateKey]) {
                groupMap[dateKey] = {
                    dateKey,
                    dateDisplay,
                    items: []
                };
            }

            let timeStr = '--:--';
            try {
                timeStr = timeFormatter.format(reqDate);
            } catch (e) {}

            groupMap[dateKey].items.push({
                time: timeStr,
                loaiPMH: r.loaiPMH || 'PMH',
                code: r.couponCode,
                mdh: r.mdh || '-',
                maKho: r.maKho || '-',
                displayName: r.displayName || 'Quản lý'
            });
        });

        const groups = Object.values(groupMap);
        const displayName = matched[0]?.displayName || 'Quản lý';

        return {
            displayName,
            count: matched.length,
            groups
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
    },

    /**
     * Phân tích tốc độ tiêu thụ và dự báo thời gian cạn kho PMH
     * Dựa trên dữ liệu 2 giờ gần nhất
     */
    async calculateDepletionForecast(loaiPMH, remainingCount = null) {
        try {
            if (!loaiPMH) return null;
            const normType = String(loaiPMH).trim().toUpperCase();

            let remaining = remainingCount;
            if (remaining === null) {
                remaining = await Firebase.getUnusedCountByType(normType);
            }

            const requests = await Firebase.getRequests();
            const now = Date.now();
            const twoHoursAgo = now - (2 * 60 * 60 * 1000);

            // Đếm số lượng mã của loại này được phát trong 2 giờ gần nhất
            const recentIssued = requests.filter(r => {
                if (String(r.loaiPMH || '').trim().toUpperCase() !== normType) return false;
                if (r.status !== CONFIG.REQUEST_STATUS_SENT && r.status !== 'SENT' && r.status !== 'Đã phát mã') return false;
                const reqTime = new Date(r.createdAt || r.updatedAt || 0).getTime();
                return reqTime >= twoHoursAgo;
            });

            const countIn2Hours = recentIssued.length;
            // Tốc độ cấp (mã/giờ)
            const speedPerHour = Math.round((countIn2Hours / 2) * 10) / 10;

            if (speedPerHour <= 0) {
                return {
                    speedPerHour: 0,
                    minutesLeft: null,
                    text: null
                };
            }

            if (remaining <= 0) {
                return {
                    speedPerHour,
                    minutesLeft: 0,
                    text: `⚡ Tốc độ cấp: ${speedPerHour} mã/giờ. Kho ${normType} đã CẠN SẠCH mã!`
                };
            }

            // Thời gian cạn kho (phút)
            const minutesLeft = Math.round((remaining / speedPerHour) * 60);
            let timeStr = '';
            if (minutesLeft < 60) {
                timeStr = `${minutesLeft} phút`;
            } else {
                const hours = Math.floor(minutesLeft / 60);
                const mins = minutesLeft % 60;
                timeStr = mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
            }

            const text = `⚡ Tốc độ cấp: ${speedPerHour} mã/giờ. Dự kiến kho ${normType} sẽ cạn sạch sau ${timeStr} nữa. Quản lý vui lòng kiểm tra tồn hoặc xin trước khi tư vấn!`;

            return {
                speedPerHour,
                minutesLeft,
                timeStr,
                text
            };
        } catch (e) {
            console.error('[couponService] Lỗi calculateDepletionForecast:', e.message);
            return null;
        }
    },

    /**
     * Tra cứu lịch sử & trạng thái chi tiết của 1 Đơn Hàng (MĐH)
     */
    async lookupOrderDetails(mdh) {
        if (!mdh) return { found: false, message: 'Vui lòng nhập Mã đơn hàng cần tra cứu.' };

        const cleanMdh = (val) => String(val || '').replace(/[\s\r\n\t]+/g, '').toUpperCase();
        const normMdh = cleanMdh(mdh);
        if (!normMdh) return { found: false, message: 'Mã đơn hàng không hợp lệ.' };

        const requests = await Firebase.getRequests();
        const coupons = await Firebase.getCoupons();

        // 1. Tìm tất cả các yêu cầu liên quan đến MĐH này
        const matchedRequests = requests.filter(r => cleanMdh(r.mdh) === normMdh);

        // 2. Tìm tất cả các coupon đang hoặc đã gắn với MĐH này
        const matchedCoupons = coupons.filter(c => cleanMdh(c.orderId) === normMdh);

        if (matchedRequests.length === 0 && matchedCoupons.length === 0) {
            return {
                found: false,
                mdh: normMdh,
                message: `❌ Không tìm thấy thông tin nào cho Mã đơn hàng "${normMdh}".\n👉 Vui lòng kiểm tra lại chính xác mã đơn hàng!`
            };
        }

        // Lấy đơn yêu cầu mới nhất làm đại diện
        const latestReq = matchedRequests[matchedRequests.length - 1] || {};
        const firstReq = matchedRequests[0] || {};

        const displayName = latestReq.displayName || firstReq.displayName || (matchedCoupons[0]?.recipient) || 'Quản lý';
        const maKho = latestReq.maKho || firstReq.maKho || (matchedCoupons[0]?.warehouse) || '-';
        const loaiPMH = latestReq.loaiPMH || firstReq.loaiPMH || (matchedCoupons[0]?.type) || 'PMH';

        // Lấy mã PMH hiện tại có hiệu lực
        let currentCode = latestReq.couponCode || '';
        if (!currentCode && matchedCoupons.length > 0) {
            const activeCoupon = matchedCoupons.find(c => c.status === 'SENT' || c.status === CONFIG.COUPON_STATUS_SENT);
            if (activeCoupon) currentCode = activeCoupon.code;
        }

        // Trạng thái đơn hàng
        const status = latestReq.status || (currentCode ? 'Đã phát mã' : 'Chưa cấp mã');

        // Định dạng thời gian
        const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: false
        });

        let issuedTime = '--:--';
        try {
            const t = latestReq.createdAt || latestReq.updatedAt || matchedCoupons[0]?.sentAt || matchedCoupons[0]?.updatedAt;
            if (t) issuedTime = timeFormatter.format(new Date(t));
        } catch (e) {}

        const approvedBy = latestReq.approvedBy || (latestReq.isReplaced ? 'BOT_AUTO_REPLACE' : 'Quản trị viên');

        // Kiểm tra lịch sử đổi mã / thu hồi
        let isReplaced = !!latestReq.isReplaced;
        let oldCode = latestReq.oldCode || '';
        let oldType = latestReq.oldType || loaiPMH;
        let oldTime = latestReq.oldTime || '';

        // Nếu có nhiều hơn 1 yêu cầu thành công hoặc đơn trước bị đổi mã
        if (!isReplaced && matchedRequests.length > 1) {
            const sentReqs = matchedRequests.filter(r => r.status === CONFIG.REQUEST_STATUS_SENT || r.status === 'SENT' || r.status === 'Đã phát mã');
            if (sentReqs.length > 1) {
                isReplaced = true;
                oldCode = sentReqs[0].couponCode;
                oldType = sentReqs[0].loaiPMH || loaiPMH;
                try {
                    oldTime = timeFormatter.format(new Date(sentReqs[0].createdAt || sentReqs[0].updatedAt));
                } catch (e) {
                    oldTime = 'trước đó';
                }
            }
        }

        return {
            found: true,
            mdh: normMdh,
            displayName,
            maKho,
            loaiPMH,
            currentCode,
            status,
            issuedTime,
            approvedBy,
            isReplaced,
            oldCode,
            oldType,
            oldTime
        };
    },

    /**
     * Báo cáo kết xuất đối soát toàn diện gửi tin nhắn riêng cho Admin hàng ngày
     */
    async generateAdminDailyAuditReport() {
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

        const displayDateFormatter = new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const todayDisplay = displayDateFormatter.format(now);

        // 1. Lọc đơn phát trong ngày
        const todaySentReqs = requests.filter(r => {
            if (r.status !== CONFIG.REQUEST_STATUS_SENT && r.status !== 'SENT' && r.status !== 'Đã phát mã') return false;
            if (!r.couponCode) return false;
            const reqDate = new Date(r.createdAt || r.updatedAt || 0);
            try {
                return dateFormatter.format(reqDate) === todayStr;
            } catch (e) {
                return false;
            }
        });

        // 2. Thống kê theo loại PMH
        const countByType = {};
        const countByStore = {};
        const swappedOrders = [];

        todaySentReqs.forEach(r => {
            const type = String(r.loaiPMH || 'KHAC').trim().toUpperCase();
            countByType[type] = (countByType[type] || 0) + 1;

            const store = String(r.maKho || 'Chưa rõ').trim();
            countByStore[store] = (countByStore[store] || 0) + 1;

            if (r.isReplaced && r.oldCode) {
                swappedOrders.push(r);
            }
        });

        const typeSummary = Object.entries(countByType)
            .sort((a, b) => b[1] - a[1])
            .map(([t, c]) => `• ${t}: ${c} mã`)
            .join('\n');

        const topStores = Object.entries(countByStore)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([s, c], idx) => `${idx + 1}. Kho ${s}: ${c} mã`)
            .join('\n');

        // 3. Danh sách chi tiết các đơn THU HỒI / ĐỔI MÃ
        let swapSection = '• Không có đơn đổi/thu hồi nào trong ngày.';
        if (swappedOrders.length > 0) {
            swapSection = swappedOrders.map((r, idx) => {
                return `${idx + 1}. MĐH: ${r.mdh || '-'}\n   - Quản lý: ${r.displayName || 'Quản lý'} (Kho ${r.maKho || '-'})\n   - Đã thu hồi: "${r.oldCode}" ➜ Cấp mới: "${r.couponCode}"\n   - Thu hồi lúc: ${r.oldTime || '--:--'}`;
            }).join('\n');
        }

        // 4. Thống kê tồn kho hiện tại
        const stockCounts = {};
        coupons.forEach(c => {
            if (c && c.status === 'UNUSED' && c.type) {
                const t = String(c.type).trim().toUpperCase();
                stockCounts[t] = (stockCounts[t] || 0) + 1;
            }
        });
        const stockSummary = Object.entries(stockCounts)
            .sort((a, b) => a[1] - b[1])
            .map(([t, c]) => `• ${t}: ${c} mã${c < 10 ? ' 🔴' : (c < 30 ? ' 🟡' : '')}`)
            .join('\n');

        return [
            `👑 BÁO CÁO ĐỐI SOÁT CUỐI NGÀY DÀNH CHO ADMIN`,
            `📅 Ngày báo cáo: ${todayDisplay}`,
            `━━━━━━━━━━━━━━━━━━━━━`,
            `📊 TỔNG QUAN PHÁT MÃ:`,
            `• Tổng mã đã phát hôm nay: ${todaySentReqs.length} mã`,
            `• Tổng số đơn thu hồi / cấp lại: ${swappedOrders.length} đơn`,
            ``,
            `🏷️ CHI TIẾT THEO LOẠI PMH:`,
            typeSummary || '• Chưa phát sinh mã nào.',
            ``,
            `🔄 DANH SÁCH ĐƠN THU HỒI & ĐỔI MÃ:`,
            swapSection,
            ``,
            `🏢 TOP SIÊU THỊ XIN NHIỀU NHẤT:`,
            topStores || '• Chưa có số liệu.',
            ``,
            `📦 TỒN KHO HIỆN TẠI:`,
            stockSummary || '• Kho PMH hiện tại trống.',
            `━━━━━━━━━━━━━━━━━━━━━`,
            `💡 Báo cáo tự động lúc 22:15 hàng ngày. Admin có thể gõ "bcaoadmin" để lấy báo cáo tức thì.`
        ].join('\n');
    }
};

module.exports = couponService;
