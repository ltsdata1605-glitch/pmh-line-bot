const CONFIG = require('./config');
const Firebase = require('./firebase');
const lineClient = require('./lineClient');
const { parseCouponForm, looksLikeCouponForm } = require('./parser');
const couponService = require('./couponService');

const NL = '\n';

// Bộ nhớ chống trùng tin nhắn (tránh LINE gửi lại webhook khi mạng chậm)
const processedMessages = new Map();

// Dọn dẹp cache mỗi 15 phút
setInterval(() => {
    const now = Date.now();
    for (const [msgId, time] of processedMessages.entries()) {
        if (now - time > 10 * 60 * 1000) {
            processedMessages.delete(msgId);
        }
    }
}, 15 * 60 * 1000);

// Bộ nhớ cache theo dõi nhóm (tránh query liên tục)
const trackedGroups = new Map();

async function trackGroupInfo(groupId) {
    if (!groupId || !groupId.startsWith('C')) return;
    const lastTracked = trackedGroups.get(groupId);
    const now = Date.now();
    if (lastTracked && (now - lastTracked < 30 * 60 * 1000)) {
        return;
    }
    trackedGroups.set(groupId, now);

    try {
        const summary = await lineClient.getGroupSummary(groupId);
        const groupName = summary?.groupName || 'Nhóm LINE';
        const pictureUrl = summary?.pictureUrl || '';
        await Firebase.saveGroup({
            groupId,
            groupName,
            pictureUrl,
            active: true
        });
    } catch (e) {
        await Firebase.saveGroup({
            groupId,
            groupName: 'Nhóm LINE',
            active: true
        });
    }
}

async function isAdmin(userId) {
    if (!userId) return false;
    if (CONFIG.ADMIN_IDS.includes(userId)) return true;
    try {
        const admins = await Firebase.getAdmins();
        return admins.some(a => (a.userId === userId || a.lineId === userId) && a.active !== false);
    } catch (e) {
        return false;
    }
}

function isAdminApprovalCommand(text) {
    const t = String(text || '').trim().toUpperCase();
    return t === CONFIG.APPROVAL_COMMAND || t === 'OK' || t === 'ALL';
}

/**
 * Xử lý sự kiện Webhook từ LINE
 */
async function handleLineEvent(event) {
    if (!event) return;

    // Khi bot được mời vào nhóm (Join event)
    if (event.type === 'join') {
        const groupId = event.source?.groupId;
        if (groupId) {
            trackGroupInfo(groupId).catch(() => {});
        }

        const welcome = [
            '👋 Xin chào mọi người! Em là BOT PMH ICT.',
            '------------------------',
            '💡 Các lệnh thao tác nhanh:',
            '• "cp": Lấy cú pháp đăng ký mã PMH',
            '• "tk": Kiểm tra số lượng tồn kho PMH',
            '• "admin": Khai báo quản trị viên duyệt mã'
        ].join(NL);
        await lineClient.replyText(event.replyToken, welcome);
        return;
    }

    // Khi bot bị xóa hoặc rời nhóm (Leave event)
    if (event.type === 'leave') {
        const groupId = event.source?.groupId;
        if (groupId) {
            await Firebase.saveGroup({ groupId, active: false });
        }
        return;
    }

    if (event.type !== 'message' || !event.message || event.message.type !== 'text') {
        return;
    }

    const text = String(event.message.text || '').normalize('NFC').trim();
    const userId = event.source ? event.source.userId : '';
    const messageId = String(event.message.id || '').trim();
    const replyToken = event.replyToken;
    const quoteToken = event.message.quoteToken || null;
    const isPrivateChat = event.source && event.source.type === 'user';
    const sourceId = event.source ? (event.source.groupId || event.source.roomId || event.source.userId) : '';

    if (!text) return;

    console.log(`[BOT RECV] text: "${text}" | userId: "${userId || 'ẨN'}" | source: ${event.source ? event.source.type : 'N/A'} (ID: ${sourceId})`);

    // Tự động nhận diện và cập nhật thông tin nhóm
    if (event.source?.groupId) {
        trackGroupInfo(event.source.groupId).catch(() => {});
    }

    // Đánh dấu đã xem (mark as read)
    if (event.message.markAsReadToken && sourceId) {
        lineClient.markAsRead(sourceId, event.message.markAsReadToken).catch(() => {});
    }

    // Chống trùng tin nhắn
    if (messageId) {
        if (processedMessages.has(messageId)) {
            console.log(`[BOT] Bỏ qua tin nhắn trùng ID: ${messageId}`);
            return;
        }
        processedMessages.set(messageId, Date.now());
    }

    const lowerText = text.toLowerCase().trim();

    // 1. Lệnh DUYỆT của Admin
    if (isAdminApprovalCommand(text)) {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const quotedMsgId = event.message.quotedMessageId || null;
            await handleAdminApproval(userId, replyToken, sourceId, text, quotedMsgId, quoteToken);
        }
        return;
    }

    // 1.5 Đăng ký / Tra cứu Admin qua tin nhắn riêng (gõ "admin")
    if (isPrivateChat && lowerText === 'admin') {
        const displayName = await lineClient.getDisplayName(userId);
        const admins = await Firebase.getAdmins();
        const existing = admins.find(a => a.userId === userId || a.lineId === userId);

        if (existing) {
            const msg = `👑 Chào ${displayName}!\n` +
                `Thông tin LINE Admin của bạn đã có trên hệ thống:\n` +
                `• Tên Admin: ${existing.name || displayName}\n` +
                `• LINE User ID: ${userId}\n` +
                `• Quyền hạn: Quản trị & Duyệt mã PMH\n` +
                `• Trạng thái: ${existing.active !== false ? 'Đang kích hoạt 🟢' : 'Đang tạm khóa 🔴'}\n` +
                `------------------------\n` +
                `💡 Bạn có thể dùng lệnh "DUYỆT" hoặc "OK" trong nhóm để phát mã PMH cho Quản lý.`;
            await lineClient.replyText(replyToken, msg);
        } else {
            await Firebase.saveAdmin({
                name: displayName,
                userId: userId,
                role: 'ADMIN',
                active: true,
                note: 'Tự động khai báo qua LINE'
            });
            const msg = `🎉 CHÚC MỪNG ${displayName}!\n` +
                `Bạn đã được KHAI BÁO THÀNH CÔNG vào danh sách Admin trên hệ thống:\n` +
                `• Tên Admin: ${displayName}\n` +
                `• LINE User ID: ${userId}\n` +
                `• Quyền hạn: Duyệt mã & Quản lý kho PMH\n` +
                `------------------------\n` +
                `💡 Bạn có thể dùng lệnh "DUYỆT" hoặc "OK" trong nhóm chat để phát mã PMH cho Quản lý.`;
            await lineClient.replyText(replyToken, msg);
        }
        return;
    }

    // 1.6 Lệnh Xem Danh Sách Nhóm (dsnhom)
    if (lowerText === 'dsnhom' || lowerText === 'ds nhóm' || lowerText === 'danh sách nhóm') {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const groups = await Firebase.getGroups();
            const activeGroups = groups.filter(g => g.active !== false);
            if (activeGroups.length === 0) {
                await lineClient.replyText(replyToken, 'ℹ️ Bot chưa ghi nhận nhóm chat nào. Hãy mời Bot vào nhóm và nhắn bất kỳ tin gì để Bot tự lưu nhóm nhé!', quoteToken);
            } else {
                const lines = activeGroups.map((g, idx) => `${idx + 1}. 👥 ${g.groupName || 'Nhóm LINE'}\n   (ID: ${g.groupId})`);
                const msg = `👥 DANH SÁCH NHÓM BOT ĐÃ THAM GIA (${activeGroups.length} nhóm):\n------------------------\n${lines.join('\n')}\n------------------------\n💡 Bot có thể gửi thông báo hẹn giờ đến tất cả nhóm này.`;
                await lineClient.replyText(replyToken, msg, quoteToken);
            }
            return;
        }
    }

    // 1.7 Lệnh Xem Danh Sách Lịch Hẹn (dslich)
    if (lowerText === 'dslich' || lowerText === 'ds lịch' || lowerText === 'danh sách lịch') {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const schedules = await Firebase.getSchedules();
            if (schedules.length === 0) {
                await lineClient.replyText(replyToken, 'ℹ️ Chưa có lịch hẹn thông báo nào. Bạn có thể tạo tại Web Quản Trị hoặc nhắn cú pháp:\nhengio [HH:mm] [Nội dung...]', quoteToken);
            } else {
                const lines = schedules.map((s, idx) => {
                    const statusIcon = s.active !== false ? '🟢' : '⚪';
                    const timeStr = s.scheduleType === 'ONCE' ? `${s.time} (${s.date})` : `${s.time} (${s.scheduleType || 'DAILY'})`;
                    const snippet = s.content && s.content.length > 40 ? s.content.slice(0, 40) + '...' : (s.content || '');
                    return `${idx + 1}. [${statusIcon}] ${s.title || 'Thông báo'}\n   ⏰ ${timeStr}\n   📝 "${snippet}"`;
                });
                const msg = `⏰ DANH SÁCH LỊCH HẸN THÔNG BÁO (${schedules.length} lịch):\n------------------------\n${lines.join('\n')}\n------------------------\n💡 Quản lý bật/tắt hoặc chỉnh sửa tại Web Quản Trị: https://pmh-line-bot.onrender.com`;
                await lineClient.replyText(replyToken, msg, quoteToken);
            }
            return;
        }
    }

    // 1.8 Lệnh Tạo Nhanh Lịch Hẹn Giờ (hengio HH:mm <nội dung>)
    const hengioMatch = text.match(/^hengio\s+(\d{1,2}[:hH]\d{2})\s+([\s\S]+)$/i);
    if (hengioMatch) {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const rawTime = hengioMatch[1].replace(/[hH]/, ':');
            const parts = rawTime.split(':');
            const hh = parts[0].padStart(2, '0');
            const mm = parts[1].padStart(2, '0');
            const formattedTime = `${hh}:${mm}`;
            const content = hengioMatch[2].trim();
            const displayName = await lineClient.getDisplayName(userId);

            const schedId = 'sched_' + Date.now();
            await Firebase.saveSchedule({
                id: schedId,
                title: `Thông báo lúc ${formattedTime}`,
                content: content,
                scheduleType: 'DAILY',
                time: formattedTime,
                target: 'ALL_GROUPS',
                active: true,
                createdBy: displayName || 'Admin LINE'
            });

            const msg = `⏰ ĐÃ THIẾT LẬP LỊCH HẸN THÀNH CÔNG!\n------------------------\n` +
                `• Giờ gửi: ${formattedTime} (Hàng ngày)\n` +
                `• Đối tượng: Tất cả nhóm BOT đang tham gia\n` +
                `• Nội dung: "${content}"\n` +
                `• Trạng thái: Đang bật 🟢\n` +
                `------------------------\n` +
                `💡 Quản lý hoặc tùy chỉnh nâng cao tại Web Quản Trị: https://pmh-line-bot.onrender.com`;
            await lineClient.replyText(replyToken, msg, quoteToken);
            return;
        }
    }

    // 1.9 Lệnh Phát Sóng Tức Thì (thongbao <nội dung>)
    const thongbaoMatch = text.match(/^thongbao\s+([\s\S]+)$/i);
    if (thongbaoMatch) {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const content = thongbaoMatch[1].trim();
            const groups = await Firebase.getGroups();
            const activeGroups = groups.filter(g => g.active !== false);

            if (activeGroups.length === 0) {
                await lineClient.replyText(replyToken, '❌ Bot chưa ghi nhận nhóm nào để gửi thông báo.', quoteToken);
                return;
            }

            await lineClient.replyText(replyToken, `🚀 Đang phát thông báo tới ${activeGroups.length} nhóm chat...`, quoteToken);

            let sentCount = 0;
            const fullMsg = `📢 THÔNG BÁO TỪ QUẢN TRỊ VIÊN:\n------------------------\n${content}`;
            for (const g of activeGroups) {
                const res = await lineClient.pushText(g.groupId, fullMsg);
                if (res) sentCount++;
                await new Promise(r => setTimeout(r, 200));
            }

            await lineClient.pushText(sourceId, `✅ Đã gửi thông báo thành công đến ${sentCount}/${activeGroups.length} nhóm!`);
            return;
        }
    }

    // 1.95 Lệnh Xem Danh Sách Từ Khoá (/tukhoa, từ khóa, tu khoa)
    if (lowerText === '/tukhoa' || lowerText === 'tukhoa' || lowerText === 'từ khóa' || lowerText === 'tu khoa' || lowerText === 'từ khoá') {
        const keywords = await Firebase.getKeywords();
        const activeKws = keywords.filter(k => k.active !== false);

        if (activeKws.length === 0) {
            await lineClient.replyText(replyToken, 'ℹ️ Chưa có từ khoá nào được cấu hình trong thư viện. Admin có thể thêm tại Web Quản Trị: https://pmh-line-bot.onrender.com', quoteToken);
        } else {
            const lines = activeKws.map(k => {
                const preview = (k.reply_text || '').replace(/\s+/g, ' ').trim();
                const snippet = preview.length > 35 ? preview.slice(0, 35) + '...' : preview;
                const hasImg = (k.image_urls && k.image_urls.length > 0) || k.image_url ? ' 🖼️' : '';
                return `• #${k.keyword} — ${snippet}${hasImg}`;
            });
            const msg = `🏷️ DANH SÁCH TỪ KHOÁ TỰ ĐỘNG (${activeKws.length} từ khoá):\n------------------------\n` +
                `Gõ từ khoá để nhận phản hồi tự động:\n\n` +
                lines.join('\n') +
                `\n------------------------\n💡 Gõ "cp" để lấy mẫu xin PMH, "tk" xem tồn kho.`;
            await lineClient.replyText(replyToken, msg, quoteToken);
        }
        return;
    }

    // 2. Lệnh Cú Pháp (cp / cú pháp)
    const isCp = lowerText === 'cp' || lowerText.startsWith('cp ') || lowerText === 'cú pháp' || lowerText === 'cu phap' || lowerText === '.cp' || lowerText === '/cp';
    if (isCp) {
        console.log('[BOT] Đang lấy cú pháp gửi về cho nhóm/user...');
        const syntax = await Firebase.getSyntax();
        if (!syntax) {
            await lineClient.replyText(replyToken, '❌ Chưa có cú pháp nào trên hệ thống Web Quản Trị.', quoteToken);
        } else {
            await lineClient.replyText(replyToken, syntax, quoteToken);
        }
        return;
    }

    // 3. Lệnh Thống Kê (tk / thống kê)
    const isTk = lowerText === 'tk' || lowerText.startsWith('tk ') || lowerText === 'thống kê' || lowerText === 'thong ke' || lowerText === '.tk' || lowerText === '/tk';
    if (isTk) {
        console.log('[BOT] Đang lấy thống kê tồn kho gửi về cho nhóm/user...');
        const statsMessage = await couponService.getStatisticsMessage();
        await lineClient.replyText(replyToken, statsMessage, quoteToken);
        return;
    }

    // 4. Lệnh Hướng Dẫn (hd)
    const isHd = lowerText === 'hd' || lowerText === 'hướng dẫn' || lowerText === 'huong dan' || lowerText === '.hd' || lowerText === '/hd';
    if (isHd) {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission && isPrivateChat) {
            const guide = [
                '📖 HƯỚNG DẪN DÀNH CHO ADMIN:',
                '------------------------',
                '• "DUYỆT" hoặc "OK": Duyệt cấp mã cho các yêu cầu đang chờ.',
                '• "auto on": Bật tự động cấp mã tức thì.',
                '• "auto off": Tắt tự động, chuyển duyệt thủ công.',
                '• "dsnhom": Xem danh sách nhóm bot đã tham gia.',
                '• "dslich": Xem danh sách các lịch thông báo.',
                '• "hengio [HH:mm] [Nội dung]": Đặt lịch thông báo hàng ngày.',
                '• "thongbao [Nội dung]": Phát sóng tức thì tới tất cả nhóm.',
                '• "/tukhoa": Xem danh sách từ khoá tự động.',
                '• "tk": Xem thống kê tồn kho các loại PMH.',
                '• "cp": Xem cú pháp đăng ký hiện tại.'
            ].join(NL);
            await lineClient.replyText(replyToken, guide, quoteToken);
        } else {
            const syntax = await Firebase.getSyntax();
            await lineClient.replyText(replyToken, syntax || '💡 Gõ "cp" để lấy mẫu xin PMH, "/tukhoa" xem danh sách từ khoá.', quoteToken);
        }
        return;
    }

    // 4.5 Kiểm tra phản hồi theo Thư Viện Từ Khoá (Keyword Auto-Reply)
    const keywordMatch = await Firebase.findKeywordReply(text);
    if (keywordMatch) {
        console.log(`[BOT] Khớp từ khoá: "${keywordMatch.keyword}"! Đang gửi phản hồi (Text + Images)...`);
        const messages = [];

        // 1. Tin nhắn văn bản
        if (keywordMatch.reply_text) {
            const textMsg = {
                type: 'text',
                text: keywordMatch.reply_text
            };
            if (quoteToken) {
                textMsg.quoteToken = quoteToken;
            }
            messages.push(textMsg);
        }

        // 2. Tin nhắn hình ảnh (tối đa 4 ảnh, để tổng số message <= 5)
        let rawImages = [];
        if (keywordMatch.image_urls && Array.isArray(keywordMatch.image_urls) && keywordMatch.image_urls.length > 0) {
            rawImages = keywordMatch.image_urls.filter(Boolean);
        } else if (keywordMatch.image_url) {
            rawImages = [keywordMatch.image_url];
        }

        const availableSlots = 5 - messages.length;
        const imagesToPush = rawImages.slice(0, availableSlots);

        for (const imgUrl of imagesToPush) {
            messages.push({
                type: 'image',
                originalContentUrl: imgUrl,
                previewImageUrl: imgUrl
            });
        }

        if (messages.length > 0) {
            await lineClient.replyMessages(replyToken, messages);
            Firebase.logSystem('KEYWORD_TRIGGERED', {
                keyword: keywordMatch.keyword,
                userId: userId,
                sourceId: sourceId,
                imageCount: imagesToPush.length
            }).catch(() => {});
            return;
        }
    }

    // 5. Lệnh bật/tắt Tự động duyệt (Admin nhắn riêng)
    if (isPrivateChat && (lowerText === 'auto on' || lowerText === 'auto off')) {
        const hasAdminPermission = await isAdmin(userId);
        if (hasAdminPermission) {
            const isEnable = lowerText === 'auto on';
            await Firebase.updateSettings({ autoApprove: isEnable });

            const msg = isEnable
                ? '🤖 ĐÃ BẬT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!\n------------------------\n💡 Khi có yêu cầu PMH hợp lệ, BOT sẽ tự động trả lời trích dẫn phát mã ngay lập tức.'
                : '📴 ĐÃ TẮT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!\n------------------------\n💡 BOT sẽ ghi nhận đơn ở trạng thái chờ duyệt (Admin duyệt qua lệnh DUYỆT hoặc OK).';
            await lineClient.replyText(replyToken, msg, quoteToken);
            return;
        }
    }

    // 6. Kiểm tra Form xin mã PMH từ Quản lý
    if (looksLikeCouponForm(text)) {
        await handleCouponRequest({
            text,
            userId,
            messageId,
            replyToken,
            quoteToken,
            sourceId,
            isPrivateChat
        });
        return;
    }
}

/**
 * Xử lý yêu cầu xin mã PMH từ Quản lý
 */
async function handleCouponRequest(payload) {
    const parsed = parseCouponForm(payload.text);

    if (!parsed.ok) {
        await lineClient.replyText(payload.replyToken, parsed.message, payload.quoteToken);
        return;
    }

    const data = parsed.data;
    const displayName = await lineClient.getDisplayName(payload.userId, payload.sourceId);

    // Kiểm tra trùng lặp
    const dupCheck = await couponService.checkDuplicateRequest(payload.userId, data.loaiPMH, data.mdh);
    if (dupCheck.action === 'block_same_type') {
        await lineClient.replyText(payload.replyToken, '❌ MĐH này đã được cấp PMH.', payload.quoteToken);
        return;
    }

    // Tìm mã coupon chưa sử dụng trong Firebase
    const coupon = await Firebase.findFirstUnusedCoupon(data.loaiPMH);

    if (!coupon) {
        // Ghi nhận hết mã
        await Firebase.createRequest({
            messageId: payload.messageId,
            userId: payload.userId,
            displayName: displayName,
            loaiPMH: data.loaiPMH,
            maKho: data.maKho,
            mdh: data.mdh,
            status: CONFIG.REQUEST_STATUS_OUT_OF_STOCK,
            couponCode: '',
            chatId: payload.sourceId
        });

        await lineClient.replyText(payload.replyToken, `❌ Hết mã PMH loại "${data.loaiPMH}".`, payload.quoteToken);
        return;
    }

    // Lấy cài đặt hệ thống xem có bật tự động phát không
    const settings = await Firebase.getSettings();
    const isAutoApprove = !!settings.autoApprove;

    const couponId = coupon.index !== undefined ? coupon.index : coupon.key;

    if (isAutoApprove) {
        // Cập nhật trạng thái phiếu đã phát
        await Firebase.markCouponSent(couponId, {
            warehouse: data.maKho,
            orderId: data.mdh,
            recipient: displayName,
            recipientId: payload.userId
        });

        // Ghi nhận yêu cầu thành công
        await Firebase.createRequest({
            messageId: payload.messageId,
            userId: payload.userId,
            displayName: displayName,
            loaiPMH: data.loaiPMH,
            maKho: data.maKho,
            mdh: data.mdh,
            status: CONFIG.REQUEST_STATUS_SENT,
            couponCode: coupon.code,
            chatId: payload.sourceId,
            approvedBy: 'BOT_AUTO'
        });

        // Trả lời phát mã trích dẫn ngay lập tức
        const sendMsg = `${displayName}${NL}➜ PMH ${data.loaiPMH} : ${coupon.code}`;
        await lineClient.replyText(payload.replyToken, sendMsg, payload.quoteToken);
    } else {
        // Tạm giữ mã hoặc lưu yêu cầu chờ Admin duyệt
        await Firebase.createRequest({
            messageId: payload.messageId,
            userId: payload.userId,
            displayName: displayName,
            loaiPMH: data.loaiPMH,
            maKho: data.maKho,
            mdh: data.mdh,
            status: CONFIG.REQUEST_STATUS_PENDING,
            couponCode: coupon.code,
            couponId: couponId,
            chatId: payload.sourceId
        });

        // Phản hồi đã tiếp nhận và chờ admin duyệt
        await lineClient.replyText(payload.replyToken, `⏳ Đã nhận yêu cầu PMH ${data.loaiPMH} (MĐH: ${data.mdh || '-'}). Đang chờ Admin duyệt...`, payload.quoteToken);
    }
}

/**
 * Xử lý lệnh duyệt của Admin
 */
async function handleAdminApproval(adminUserId, replyToken, sourceId, commandText, quotedMessageId, quoteToken) {
    const requests = await Firebase.getRequests();
    const pendingList = requests.filter(r => r.status === CONFIG.REQUEST_STATUS_PENDING);

    if (pendingList.length === 0) {
        await lineClient.replyText(replyToken, 'Hiện tại không có yêu cầu nào đang nằm trong danh sách chờ duyệt.', quoteToken);
        return;
    }

    // Nếu trích dẫn một tin nhắn cụ thể
    if (quotedMessageId) {
        const targetReq = pendingList.find(r => r.messageId === quotedMessageId);
        if (!targetReq) {
            await lineClient.replyText(replyToken, '❌ Không tìm thấy yêu cầu chờ duyệt tương ứng với tin nhắn trích dẫn này.', quoteToken);
            return;
        }

        let couponCode = targetReq.couponCode;
        if (!couponCode) {
            const coupon = await Firebase.findFirstUnusedCoupon(targetReq.loaiPMH);
            if (!coupon) {
                await lineClient.replyText(replyToken, `❌ Hết mã PMH loại "${targetReq.loaiPMH}".`, quoteToken);
                return;
            }
            couponCode = coupon.code;
            const cId = coupon.index !== undefined ? coupon.index : coupon.key;
            await Firebase.markCouponSent(cId, {
                warehouse: targetReq.maKho,
                orderId: targetReq.mdh,
                recipient: targetReq.displayName,
                recipientId: targetReq.userId
            });
        } else if (targetReq.couponId !== undefined) {
            await Firebase.markCouponSent(targetReq.couponId, {
                warehouse: targetReq.maKho,
                orderId: targetReq.mdh,
                recipient: targetReq.displayName,
                recipientId: targetReq.userId
            });
        }

        await Firebase.updateRequest(targetReq.id, {
            status: CONFIG.REQUEST_STATUS_SENT,
            couponCode: couponCode,
            approvedBy: adminUserId
        });

        const replyMsg = `${targetReq.displayName}${NL}➜ PMH ${targetReq.loaiPMH} : ${couponCode}`;
        await lineClient.replyText(replyToken, replyMsg, quoteToken);
        return;
    }

    // Nếu gõ lệnh duyệt hàng loạt
    let approvedCount = 0;
    const results = [];

    for (const req of pendingList) {
        let couponCode = req.couponCode;
        if (!couponCode) {
            const coupon = await Firebase.findFirstUnusedCoupon(req.loaiPMH);
            if (coupon) {
                couponCode = coupon.code;
                const cId = coupon.index !== undefined ? coupon.index : coupon.key;
                await Firebase.markCouponSent(cId, {
                    warehouse: req.maKho,
                    orderId: req.mdh,
                    recipient: req.displayName,
                    recipientId: req.userId
                });
            }
        } else if (req.couponId !== undefined) {
            await Firebase.markCouponSent(req.couponId, {
                warehouse: req.maKho,
                orderId: req.mdh,
                recipient: req.displayName,
                recipientId: req.userId
            });
        }

        if (couponCode) {
            await Firebase.updateRequest(req.id, {
                status: CONFIG.REQUEST_STATUS_SENT,
                couponCode: couponCode,
                approvedBy: adminUserId
            });
            results.push(`${req.displayName}${NL}➜ PMH ${req.loaiPMH} : ${couponCode}`);
            approvedCount++;
        }
    }

    if (approvedCount > 0) {
        const fullMsg = `✅ ADMIN ĐÃ DUYỆT PHÁT MÃ (${approvedCount} đơn):${NL}━━━━━━━━━━━━━${NL}` + results.join(`${NL}━━━━━━━━━━━━━${NL}`);
        await lineClient.replyText(replyToken, fullMsg, quoteToken);
    } else {
        await lineClient.replyText(replyToken, '❌ Không thể duyệt vì các loại PMH trong danh sách chờ đã hết mã.', quoteToken);
    }
}

module.exports = {
    handleLineEvent
};
