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

function isAdmin(userId) {
    if (!userId) return false;
    return CONFIG.ADMIN_IDS.includes(userId);
}

function isAdminApprovalCommand(text) {
    const t = String(text || '').trim().toUpperCase();
    return t === CONFIG.APPROVAL_COMMAND || t === 'OK' || t === 'ALL';
}

/**
 * Xử lý sự kiện Webhook từ LINE
 */
async function handleLineEvent(event) {
    if (!event || event.type !== 'message' || !event.message || event.message.type !== 'text') {
        return;
    }

    const text = String(event.message.text || '').normalize('NFC').trim();
    const userId = event.source ? event.source.userId : '';
    const messageId = String(event.message.id || '').trim();
    const replyToken = event.replyToken;
    const quoteToken = event.message.quoteToken || null;
    const isPrivateChat = event.source && event.source.type === 'user';
    const sourceId = event.source ? (event.source.groupId || event.source.roomId || event.source.userId) : '';

    if (!text || !userId) return;

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

    const lowerText = text.toLowerCase();

    // 1. Lệnh DUYỆT của Admin
    if (isAdminApprovalCommand(text)) {
        if (isAdmin(userId)) {
            const quotedMsgId = event.message.quotedMessageId || null;
            await handleAdminApproval(userId, replyToken, sourceId, text, quotedMsgId, quoteToken);
        }
        return;
    }

    // 2. Lệnh Cú Pháp (cp)
    if (lowerText === 'cp') {
        const syntax = await Firebase.getSyntax();
        if (!syntax) {
            await lineClient.replyText(replyToken, '❌ Chưa có cú pháp nào trên hệ thống Web Quản Trị.', quoteToken, isPrivateChat ? null : userId);
        } else {
            await lineClient.replyText(replyToken, syntax, quoteToken, isPrivateChat ? null : userId);
        }
        return;
    }

    // 3. Lệnh Thống Kê (tk)
    if (lowerText === 'tk') {
        const statsMessage = await couponService.getStatisticsMessage();
        await lineClient.replyText(replyToken, statsMessage, quoteToken, isPrivateChat ? null : userId);
        return;
    }

    // 4. Lệnh Hướng Dẫn (hd)
    if (lowerText === 'hd') {
        if (isAdmin(userId) && isPrivateChat) {
            const guide = [
                '📖 HƯỚNG DẪN DÀNH CHO ADMIN:',
                '------------------------',
                '• "DUYỆT" hoặc "OK": Duyệt cấp mã cho các yêu cầu đang chờ.',
                '• "auto on": Bật tính năng tự động cấp mã tức thì không cần duyệt.',
                '• "auto off": Tắt tự động, chuyển sang duyệt thủ công.',
                '• "tk": Xem thống kê tồn kho các loại PMH.',
                '• "cp": Xem cú pháp đăng ký hiện tại.'
            ].join(NL);
            await lineClient.replyText(replyToken, guide, quoteToken);
        } else {
            const syntax = await Firebase.getSyntax();
            await lineClient.replyText(replyToken, syntax || '💡 Gõ "cp" để lấy mẫu xin PMH.', quoteToken, isPrivateChat ? null : userId);
        }
        return;
    }

    // 5. Lệnh bật/tắt Tự động duyệt (Admin nhắn riêng)
    if (isPrivateChat && isAdmin(userId) && (lowerText === 'auto on' || lowerText === 'auto off')) {
        const isEnable = lowerText === 'auto on';
        await Firebase.updateSettings({ autoApprove: isEnable });

        const msg = isEnable
            ? '🤖 ĐÃ BẬT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!\n------------------------\n💡 Khi có yêu cầu PMH hợp lệ, BOT sẽ tự động trả lời trích dẫn phát mã ngay lập tức.'
            : '📴 ĐÃ TẮT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!\n------------------------\n💡 BOT sẽ ghi nhận đơn ở trạng thái chờ duyệt (Admin duyệt qua lệnh DUYỆT hoặc OK).';
        await lineClient.replyText(replyToken, msg, quoteToken);
        return;
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
    const mentionId = payload.isPrivateChat ? null : payload.userId;

    if (!parsed.ok) {
        await lineClient.replyText(payload.replyToken, parsed.message, payload.quoteToken, mentionId);
        return;
    }

    const data = parsed.data;
    const displayName = await lineClient.getDisplayName(payload.userId, payload.sourceId);

    // Kiểm tra trùng lặp
    const dupCheck = await couponService.checkDuplicateRequest(payload.userId, data.loaiPMH, data.mdh);
    if (dupCheck.action === 'block_same_type') {
        await lineClient.replyText(payload.replyToken, '❌ MĐH này đã được cấp PMH.', payload.quoteToken, mentionId);
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

        await lineClient.replyText(payload.replyToken, `❌ Hết mã PMH loại "${data.loaiPMH}".`, payload.quoteToken, mentionId);
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
        await lineClient.replyText(payload.replyToken, `⏳ Đã nhận yêu cầu PMH ${data.loaiPMH} (MĐH: ${data.mdh || '-'}). Đang chờ Admin duyệt...`, payload.quoteToken, mentionId);
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
