/*******************************************************
 * LINE BOT PHÁT MÃ COUPON QUA GOOGLE SHEETS
 * BẢN FIX TRIỆT ĐỂ LỖI KHÔNG GHI SHEET - GHI LOG CHI TIẾT
 *******************************************************/

/**********************
 * 1. CẤU HÌNH CHÍNH
 **********************/
const CONFIG = {
    // LINE Channel Access Token của Sơn
    CHANNEL_ACCESS_TOKEN: 'PV0zYFfao3csbp9pgnhaoPfl20UdgD34o41ybR4omINqt/u4j/LIpQkJXBGvF+KxRXv4yd7SU6//WJ/gdIUZGhy8MbAPAF6nSklA2PJwyPGsDew30Vu17P655KoEigJx4KpH10kgnRBsIK1db2OXJwdB04t89/1O/w1cDnyilFU=',

    // ID Google Sheet chuẩn 100% của Sơn
    SPREADSHEET_ID: '1XdnwrBdnHIXQuq-0Vq8YzpA_dBT_qoUETemCf8-UC9M',

    // Tên hai tab tương ứng trong Sheet của Sơn
    SHEET_COUPON: 'Coupon',
    SHEET_REQUEST: 'YeuCauPhatMa',
    SHEET_SYNTAX: 'Cú pháp',

    // ID LINE Admin có quyền gõ lệnh DUYỆT
    ADMIN_IDS: [
        'U272dcb226f96e4e17e561b19ba8ab679' // ID của Sơn
    ],

    // Câu lệnh phê duyệt
    APPROVAL_COMMAND: 'DUYỆT',

    WEBHOOK_SECRET: '',

    // Cấu hình Firebase Realtime Database tự động (Không cần cấu hình Script Properties thủ công)
    FIREBASE_DB_URL: 'https://bot-l-e1587-default-rtdb.asia-southeast1.firebasedatabase.app',

    // Trạng thái cấu hình cho kho mã Coupon chính
    COUPON_STATUS_UNUSED: 'Chưa gửi',
    COUPON_STATUS_SENT: 'Đã gửi',

    // Trạng thái cấu hình cho hàng đợi yêu cầu duyệt đơn
    REQUEST_STATUS_PENDING: 'Chờ duyệt đơn',
    REQUEST_STATUS_SENT: 'Đã phát mã',
    REQUEST_STATUS_OUT_OF_STOCK: 'Hết mã',
    REQUEST_STATUS_ERROR: 'Lỗi',

    // Ngưỡng cảnh báo sắp hết mã
    LOW_STOCK_THRESHOLD: 20
};

const NL = String.fromCharCode(10);

/**********************
 * 2. MAP TOẠ ĐỘ CỘT TRONG SHEET
 **********************/
const COL_COUPON = {
    MA_PHIEU: 1,       // Cột A
    LOAI_PHIEU: 2,     // Cột B
    TRANG_THAI: 3,     // Cột C
    MA_KHO: 4,         // Cột D
    MDH: 5,            // Cột E
    NGUOI_NHAN: 6,     // Cột F
    ID_NGUOI_NHAN: 7   // Cột G
};

const COL_REQUEST = {
    ID_TIN_NHAN: 1,       // Cột A
    ID_NGUOI_GUI: 2,      // Cột B
    TEN_QUAN_LY: 3,       // Cột C
    LOAI_PMH: 4,          // Cột D
    MA_KHO: 5,            // Cột E
    MDH: 6,               // Cột F
    TRANG_THAI: 7,        // Cột G
    THOI_GIAN_GUI: 8,     // Cột H
    MA_PHIEU_DA_PHAT: 9,  // Cột I
    GHI_CHU: 10,          // Cột J
    QUOTE_TOKEN: 11,      // Cột K
    CHAT_ID: 12           // Cột L
};

/**********************
 * 3. ĐIỂM TIẾP NHẬN WEBHOOK LINE
 **********************/
function doPost(e) {
    var bodyText = '';
    try {
        if (!isValidWebhookRequest_(e)) {
            logSystem_('UNAUTHORIZED', JSON.stringify(e));
            return textOutput_('Unauthorized');
        }

        bodyText = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
        logSystem_('WEBHOOK_RAW', bodyText);

        const body = JSON.parse(bodyText);
        const events = body.events || [];

        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            try {
                if (event && event.type === 'postback') {
                    handlePostbackEvent_(event);
                } else {
                    handleLineEvent_(event);
                }
            } catch (eventErr) {
                logSystem_('EVENT_ERROR', 'Lỗi khi xử lý event: ' + eventErr.message + '\nStack: ' + eventErr.stack + '\nEvent: ' + JSON.stringify(event));

                // Cố gắng phản hồi lỗi cho người dùng qua replyToken nếu có
                if (event && event.replyToken) {
                    try {
                        replyText_(event.replyToken, '❌ Lỗi hệ thống: ' + eventErr.message);
                    } catch (replyErr) {
                        logSystem_('REPLY_ERROR_FALLBACK', replyErr.message);
                    }
                }
            }
        }

        return textOutput_('OK');
    } catch (err) {
        console.error('doPost error:', err);
        logSystem_('DOPOST_CRITICAL_ERROR', err.message + '\nStack: ' + err.stack + '\nRaw body: ' + bodyText);
        return textOutput_('ERROR: ' + err.message);
    }
}

function doGet() {
    try {
        const props = PropertiesService.getScriptProperties();
        const autoEnabled = props.getProperty('AUTO_APPROVE_ENABLED') === 'true';
        const chatIdsText = props.getProperty('ACTIVE_CHAT_IDS');
        const chatIds = chatIdsText ? JSON.parse(chatIdsText) : [];

        const ss = getSpreadsheet_();
        const sheetNames = ss.getSheets().map(s => s.getName());

        let syntaxCheck = { exists: false, error: null, content: null };
        try {
            const syntaxSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_SYNTAX);
            if (syntaxSheet) {
                syntaxCheck.exists = true;
                syntaxCheck.content = String(syntaxSheet.getRange('A1').getValue() || '').trim();
            }
        } catch (e) {
            syntaxCheck.error = e.toString();
        }

        let adminCheck = { exists: false, error: null, rowCount: 0 };
        try {
            const adminSheet = getSheetByNameNormalized_(ss, 'Admin');
            if (adminSheet) {
                adminCheck.exists = true;
                adminCheck.rowCount = adminSheet.getLastRow();
            }
        } catch (e) {
            adminCheck.error = e.toString();
        }

        const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);
        const lastRow = requestSheet.getLastRow();

        let pendingCount = 0;
        let oldestTime = null;
        let samplePending = [];

        if (lastRow >= 2) {
            const values = requestSheet.getRange(2, 1, lastRow - 1, requestSheet.getLastColumn()).getValues();
            for (let i = 0; i < values.length; i++) {
                const status = String(values[i][COL_REQUEST.TRANG_THAI - 1] || '').trim();
                if (isPendingStatus_(status)) {
                    pendingCount++;
                    if (samplePending.length < 5) {
                        samplePending.push({
                            row: i + 2,
                            displayName: values[i][COL_REQUEST.TEN_QUAN_LY - 1],
                            loaiPMH: values[i][COL_REQUEST.LOAI_PMH - 1],
                            status: status
                        });
                    }
                    const timeVal = values[i][COL_REQUEST.THOI_GIAN_GUI - 1];
                    if (timeVal) {
                        let parsedDate = null;
                        if (timeVal instanceof Date) {
                            parsedDate = timeVal;
                        } else {
                            const numericTime = Date.parse(timeVal);
                            if (!isNaN(numericTime)) {
                                parsedDate = new Date(numericTime);
                            }
                        }
                        if (parsedDate) {
                            if (!oldestTime || parsedDate < oldestTime) {
                                oldestTime = parsedDate;
                            }
                        }
                    }
                }
            }
        }

        const now = new Date().getTime();
        const durationMs = oldestTime ? now - oldestTime.getTime() : 0;
        const durationMin = Math.round(durationMs / 60000 * 10) / 10;

        const lastPushStatusText = props.getProperty('LAST_PUSH_STATUS');
        const lastPushStatus = lastPushStatusText ? JSON.parse(lastPushStatusText) : null;

        const diag = {
            status: "OK",
            botName: "LINE Coupon PMH Bot",
            version: "Diagnostic Version (Latest)",
            timestamp: new Date().toISOString(),
            scriptTimeZone: Session.getScriptTimeZone(),
            sheetNames: sheetNames,
            syntaxCheck: syntaxCheck,
            adminCheck: adminCheck,
            settings: {
                AUTO_APPROVE_ENABLED: autoEnabled,
                ACTIVE_CHAT_IDS: chatIds
            },
            dataSummary: {
                lastRow: lastRow,
                pendingCount: pendingCount,
                oldestWaitMinutes: oldestTime ? durationMin : null,
                samplePendingRequests: samplePending
            },
            lastPushResult: lastPushStatus
        };
        return ContentService.createTextOutput(JSON.stringify(diag, null, 2))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        console.error('doGet error:', err);
        return ContentService.createTextOutput(JSON.stringify({
            status: "ERROR",
            error: err.toString(),
            stack: err.stack
        }, null, 2)).setMimeType(ContentService.MimeType.JSON);
    }
}

/**********************
 * 4. PHÂN LUỒNG XỬ LÝ SỰ KIỆN LINE
 **********************/
function handleLineEvent_(event) {
    if (!event) return;
    if (event.type !== 'message') return;
    if (!event.message) return;
    if (event.message.type !== 'text') return;

    const text = String(event.message.text || '').normalize('NFC').trim();
    const userId = getUserIdFromEvent_(event);
    const messageId = String(event.message.id || '').trim();
    const replyToken = event.replyToken;
    const quoteToken = event.message.quoteToken || null;

    if (!text || !userId) return;

    const isPrivateChat = event.source && event.source.type === 'user';
    const isCommandOrForm = isPrivateChat ||
        isAdminApprovalCommand_(text) ||
        text.toLowerCase() === 'hd' ||
        text.toLowerCase() === 'cp' ||
        text.toLowerCase() === 'tk' ||
        looksLikeCouponForm_(text);

    // Bỏ qua hoàn toàn tin nhắn thường trong nhóm chat để tiết kiệm hạn mức UrlFetch, Cache và ghi Sheet
    if (!isCommandOrForm) {
        return;
    }

    // Tự động lưu Group ID hoặc Chat ID để phục vụ gửi thống kê tự động
    const sourceId = getSourceIdFromEvent_(event);
    if (sourceId) {
        saveActiveChatId_(sourceId);
    }

    // Tự động đánh dấu đã xem (Read) trên LINE
    const markAsReadToken = event.message.markAsReadToken;
    if (markAsReadToken && sourceId) {
        markMessageAsRead_(sourceId, markAsReadToken);
    }

    // ===== CHỐNG TRÙNG TOÀN CỤC CHO MỌI LOẠI TIN NHẮN (bao gồm cả lệnh DUYỆT) =====
    // LINE tự retry webhook nếu Apps Script xử lý quá 20 giây.
    // Nếu không chặn ở đây, lệnh DUYỆT bị retry sẽ duyệt luôn các đơn mới vào sau.
    var cache = CacheService.getScriptCache();
    var cacheKey = 'processed_msg_' + messageId;
    if (cache.get(cacheKey)) {
        console.log('CHẶN RETRY: Tin nhắn ID ' + messageId + ' đã xử lý rồi, bỏ qua.');
        logSystem_('BLOCKED_RETRY', 'Tin nhắn ID ' + messageId + ' bị chặn trùng lặp.');
        return;
    }
    // Đánh dấu đã xử lý, cache 10 phút (đủ lâu để LINE hết retry)
    cache.put(cacheKey, '1', 600);
    logSystem_('PROCESSING_MSG', 'Bắt đầu xử lý tin nhắn ID ' + messageId + ', Text: "' + text + '"');

    // 1. Kiểm tra lệnh DUYỆT của Admin
    if (isAdminApprovalCommand_(text)) {
        const sourceId = getSourceIdFromEvent_(event);
        const quotedMsgId = event.message.quotedMessageId || null;
        handleAdminApproval_(userId, replyToken, sourceId, text, quotedMsgId, quoteToken);
        return;
    }

    // 1.4 Kiểm tra đăng ký Admin qua tin nhắn riêng
    if (isPrivateChat && text.toLowerCase() === 'admin') {
        handleAdminRegistrationRequest_(userId, replyToken);
        return;
    }

    // 1.43 Kiểm tra lệnh xem mẫu thông báo của Admin (chỉ nhắn riêng)
    if (isPrivateChat && text.toLowerCase() === 'mb') {
        if (isAdmin_(userId)) {
            handleAdminNotificationTemplatesRequest_(replyToken);
            return;
        }
    }

    // 1.44 Kiểm tra lệnh cài đặt trigger của Admin (chỉ nhắn riêng)
    if (isPrivateChat && text.toLowerCase() === 'setup') {
        if (isAdmin_(userId)) {
            try {
                setupStatisticsTriggers();
                const props = PropertiesService.getScriptProperties();
                const chatIdsText = props.getProperty('ACTIVE_CHAT_IDS');
                const chatIds = chatIdsText ? JSON.parse(chatIdsText) : [];
                const activeGroups = chatIds.filter(id => !id.startsWith('U'));
                props.setProperty('ACTIVE_CHAT_IDS', JSON.stringify(activeGroups));
                const autoApproveText = props.getProperty('AUTO_APPROVE_ENABLED') === 'true' ? 'ĐANG BẬT 🟢' : 'ĐANG TẮT 🔴';

                const msg = "⚙️ ĐÃ CẤU HÌNH LẠI TRIGGER THÀNH CÔNG!" + NL +
                    "------------------------" + NL +
                    "⏰ Đã tạo các Trigger chạy tự động:" + NL +
                    "- Gửi thống kê (tk) + Cú pháp (cp): 6h sáng VN" + NL +
                    "- Gửi thống kê (tk): 15h chiều VN" + NL +
                    "- Quét tự động duyệt: mỗi 5 phút" + NL +
                    "- Tự động dọn dẹp: 2h sáng hàng ngày" + NL + NL +
                    "🤖 Tự động duyệt đơn: " + autoApproveText + NL + NL +
                    "👥 Nhóm nhận báo cáo đã lưu:" + NL +
                    (activeGroups.length > 0 ? activeGroups.map(id => "- " + id).join(NL) : "⚠️ Chưa lưu nhóm nào! (Hãy nhắn tin bất kỳ trong nhóm chat có Bot để đăng ký nhóm)");
                replyText_(replyToken, msg);
            } catch (e) {
                replyText_(replyToken, "❌ Lỗi cấu hình Trigger: " + e.message);
            }
            return;
        }
    }

    // 1.445 Kiểm tra lệnh bật/tắt Tự động gửi PMH của Admin (chỉ nhắn riêng)
    const lowerText = String(text || '').trim().toLowerCase();
    if (isPrivateChat && (lowerText === 'auto on' || lowerText === 'auto off')) {
        if (isAdmin_(userId)) {
            const isEnable = lowerText === 'auto on';
            const props = PropertiesService.getScriptProperties();
            props.setProperty('AUTO_APPROVE_ENABLED', isEnable ? 'true' : 'false');

            if (isEnable) {
                try {
                    approvePendingRequests_(null, 'ALL', 'BOT_AUTO', null);
                } catch (pendingErr) {
                    console.error('Lỗi khi duyệt các đơn tồn đọng khi bật auto:', pendingErr);
                }
            }

            const msg = isEnable
                ? "🤖 ĐÃ BẬT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!" + NL +
                "------------------------" + NL +
                "💡 Khi có yêu cầu PMH hợp lệ, BOT sẽ tự động trả lời trích dẫn phát mã ngay lập tức thay vì chờ Admin phản hồi ok."
                : "📴 ĐÃ TẮT TÍNH NĂNG TỰ ĐỘNG GỬI PMH!" + NL +
                "------------------------" + NL +
                "💡 BOT sẽ ghi nhận đơn ở trạng thái chờ duyệt (Admin duyệt thủ công qua lệnh ok/all).";
            replyText_(replyToken, msg, quoteToken);
            return;
        }
    }

    // 1.4455 Kiểm tra lệnh dọn dẹp dữ liệu thủ công (chỉ nhắn riêng)
    if (isPrivateChat && (text.toLowerCase() === 'dọn' || text.toLowerCase() === 'don')) {
        if (isAdmin_(userId)) {
            try {
                autoArchiveData_();
                const ss = getSpreadsheet_();
                const reqSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_REQUEST);
                const couSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_COUPON);
                const reqRows = reqSheet ? Math.max(0, reqSheet.getLastRow() - 1) : 0;
                const couRows = couSheet ? Math.max(0, couSheet.getLastRow() - 1) : 0;

                const msg = "🧹 ĐÃ DỌN DẸP DỮ LIỆU THÀNH CÔNG!" + NL +
                    "------------------------" + NL +
                    "📊 Kết quả sau khi dọn:" + NL +
                    "• YeuCauPhatMa: còn " + reqRows + " dòng" + NL +
                    "• Coupon: còn " + couRows + " dòng" + NL + NL +
                    "💡 Dữ liệu cũ đã được chuyển sang tab:" + NL +
                    "• YeuCauPhatMa_LichSu" + NL +
                    "• Coupon_LichSu" + NL + NL +
                    "⚙️ Ngưỡng tự dọn: khi vượt 50 dòng";
                replyText_(replyToken, msg);
            } catch (err) {
                console.error('Lỗi khi dọn dẹp thủ công:', err);
                replyText_(replyToken, '❌ Lỗi khi dọn dẹp: ' + err.message);
            }
            return;
        }
    }

    // 1.4456 Kiểm tra lệnh chẩn đoán tự động duyệt (chỉ nhắn riêng)
    if (isPrivateChat && (text.toLowerCase() === 'test auto' || text.toLowerCase() === 'test')) {
        if (isAdmin_(userId)) {
            try {
                const props = PropertiesService.getScriptProperties();
                const autoEnabled = props.getProperty('AUTO_APPROVE_ENABLED') === 'true';
                const chatIdsText = props.getProperty('ACTIVE_CHAT_IDS');
                const chatIds = chatIdsText ? JSON.parse(chatIdsText) : [];

                const ss = getSpreadsheet_();
                const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);
                const couponSheet = getSheet_(ss, CONFIG.SHEET_COUPON);

                const requestHeaders = requestSheet.getLastColumn() > 0 ? requestSheet.getRange(1, 1, 1, requestSheet.getLastColumn()).getValues()[0] : [];
                const couponHeaders = couponSheet.getLastColumn() > 0 ? couponSheet.getRange(1, 1, 1, couponSheet.getLastColumn()).getValues()[0] : [];

                const lastRow = requestSheet.getLastRow();
                let pendingCount = 0;
                let oldestTime = null;
                let samplePending = [];
                let sampleNonPending = [];

                if (lastRow >= 2) {
                    const values = requestSheet.getRange(2, 1, lastRow - 1, requestSheet.getLastColumn()).getValues();
                    for (let i = 0; i < values.length; i++) {
                        const status = String(values[i][COL_REQUEST.TRANG_THAI - 1] || '').trim();
                        const isPending = isPendingStatus_(status);
                        const rowNum = i + 2;

                        if (isPending) {
                            pendingCount++;
                            if (samplePending.length < 3) {
                                samplePending.push('Dòng ' + rowNum + ': Status="' + status + '"');
                            }
                            const timeVal = values[i][COL_REQUEST.THOI_GIAN_GUI - 1];
                            if (timeVal) {
                                let parsedDate = null;
                                if (timeVal instanceof Date) {
                                    parsedDate = timeVal;
                                } else {
                                    const numericTime = Date.parse(timeVal);
                                    if (!isNaN(numericTime)) {
                                        parsedDate = new Date(numericTime);
                                    }
                                }
                                if (parsedDate) {
                                    if (!oldestTime || parsedDate < oldestTime) {
                                        oldestTime = parsedDate;
                                    }
                                }
                            }
                        } else {
                            if (sampleNonPending.length < 3 && status) {
                                sampleNonPending.push('Dòng ' + rowNum + ': Status="' + status + '"');
                            }
                        }
                    }
                }

                const now = new Date().getTime();
                const durationMs = oldestTime ? now - oldestTime.getTime() : 0;
                const durationMin = Math.round(durationMs / 60000 * 10) / 10;

                let diagMsg = "🔍 KẾT QUẢ CHẨN ĐOÁN HỆ THỐNG 🔍" + NL +
                    "------------------------" + NL +
                    "🤖 Tự động duyệt (AUTO_APPROVE_ENABLED): " + (autoEnabled ? "BẬT 🟢" : "TẮT 🔴") + NL +
                    "📂 Tổng số dòng YeuCauPhatMa: " + lastRow + NL +
                    "⏳ Số đơn chờ duyệt: " + pendingCount + NL +
                    "⏰ Thời gian chờ cũ nhất: " + (oldestTime ? durationMin + " phút" : "Không có") + NL +
                    "👥 Nhóm nhận báo cáo (ACTIVE_CHAT_IDS): " + (chatIds.length > 0 ? chatIds.join(', ') : "⚠️ Trống") + NL +
                    "------------------------" + NL +
                    "📋 Tiêu đề cột YeuCauPhatMa:" + NL +
                    requestHeaders.map((h, idx) => (idx + 1) + ". " + h).join(NL) + NL +
                    "------------------------" + NL;

                if (samplePending.length > 0) {
                    diagMsg += "📝 Đơn chờ duyệt mẫu:" + NL + samplePending.join(NL) + NL;
                } else {
                    diagMsg += "⚠️ Không tìm thấy đơn chờ duyệt nào!" + NL;
                }

                if (sampleNonPending.length > 0) {
                    diagMsg += "📝 Đơn khác mẫu:" + NL + sampleNonPending.join(NL) + NL;
                }

                diagMsg += "------------------------" + NL +
                    "⚡ Đang thử chạy duyệt tự động bằng code...";

                replyText_(replyToken, diagMsg);

                // Thực thi trực tiếp
                const result = approvePendingRequests_(null, 'ALL', 'BOT_AUTO', null);

                pushText_(userId, "⚡ KẾT QUẢ DUYỆT TỰ ĐỘNG THỬ NGHIỆM:" + NL + "------------------------" + NL + result);

            } catch (err) {
                console.error('Lỗi khi chẩn đoán:', err);
                replyText_(replyToken, '❌ Lỗi chẩn đoán: ' + err.message + NL + err.stack);
            }
            return;
        }
    }

    // 1.446 Hỗ trợ lọc danh sách phát mã của Quản lý (chỉ nhắn riêng)
    if (isPrivateChat && text.includes('➜ PMH')) {
        const displayName = getUserDisplayNameFromHistory_(userId);
        if (displayName) {
            const blocks = text.split(/━━━━━━|------|——————/);
            const matchedBlocks = [];
            const lowerDisplayName = displayName.toLowerCase().trim();

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i].trim();
                if (!block) continue;

                // Bỏ qua dòng tiêu đề và dòng hướng dẫn lọc
                if (block.includes('Admin đã duyệt phát mã') ||
                    block.includes('BOT đã tự động duyệt') ||
                    block.includes('Hãy chuyển tiếp tin nhắn này') ||
                    block.includes('lọc nhanh PMH')) {
                    continue;
                }

                const lines = block.split(/\r?\n/);
                if (lines.length > 0) {
                    const firstLine = lines[0].trim().toLowerCase();
                    if (firstLine.includes(lowerDisplayName) || lowerDisplayName.includes(firstLine)) {
                        matchedBlocks.push(block);
                    }
                }
            }

            if (matchedBlocks.length > 0) {
                const replyMsg = matchedBlocks.join(NL + '━━━━━━' + NL);
                replyText_(replyToken, replyMsg);
                return;
            } else {
                replyText_(replyToken, '❌ Không tìm thấy mã PMH nào liên quan đến tên Line của bạn ("' + displayName + '") trong danh sách trên.');
                return;
            }
        }
    }

    // 1.45 Kiểm tra lệnh hướng dẫn (hd)
    if (text.toLowerCase() === 'hd') {
        if (isPrivateChat) {
            if (isAdmin_(userId)) {
                handleAdminGuideRequest_(replyToken);
            } else {
                handleSyntaxRequest_(replyToken, quoteToken);
            }
        } else {
            handleSyntaxRequest_(replyToken, quoteToken, userId);
        }
        return;
    }

    // 1.5 Kiểm tra lệnh lấy cú pháp từ Sheet
    if (text.toLowerCase() === 'cp') {
        handleSyntaxRequest_(replyToken, quoteToken, isPrivateChat ? null : userId);
        return;
    }

    // 1.6 Kiểm tra lệnh xem thống kê
    if (text.toLowerCase() === 'tk') {
        const statsMessage = getCouponStatistics_();
        replyText_(replyToken, statsMessage, quoteToken, isPrivateChat ? null : userId);
        return;
    }

    // 2. Kiểm tra xem có đúng là Form PMH không
    if (!looksLikeCouponForm_(text)) return;

    const ss = getSpreadsheet_();
    const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);

    // BỘ LỌC CHỐNG TRÙNG BỔ SUNG: Kiểm tra trong Sheet (phòng trường hợp cache hết hạn)
    const lastRow = requestSheet.getLastRow();
    if (lastRow > 1) {
        const startRow = Math.max(2, lastRow - 50);
        const numRows = lastRow - startRow + 1;
        const existingIds = requestSheet.getRange(startRow, 1, numRows, 1).getValues();
        for (let i = 0; i < existingIds.length; i++) {
            if (existingIds[i][0].toString() === messageId) {
                console.log('Hủy xử lý gói tin trùng lặp ID: ' + messageId);
                return;
            }
        }
    }

    // Lấy tên hiển thị LINE thực tế của người dùng (kết bạn hay chưa đều lấy được thông qua group/room member API)
    const displayName = getLineDisplayName_(userId, sourceId);

    // Tiếp nhận xử lý Form của Quản lý
    handleManagerCouponRequest_({
        text: text,
        userId: userId,
        displayName: displayName,
        messageId: messageId,
        replyToken: replyToken,
        quoteToken: quoteToken,
        requestSheet: requestSheet,
        ss: ss,
        isPrivateChat: isPrivateChat,
        sourceId: sourceId
    });
}

/**********************
 * 5. XỬ LÝ BIỂU MẪU ĐĂNG KÝ CỦA QUẢN LÝ
 **********************/
function handleManagerCouponRequest_(payload) {
    const parsed = parseCouponForm_(payload.text);
    const mentionId = payload.isPrivateChat ? null : payload.userId;

    // Nếu bóc tách Regex thất bại (Sai cấu trúc nhãn chữ)
    if (!parsed.ok) {
        replyText_(payload.replyToken, parsed.message, payload.quoteToken, mentionId);
        return;
    }

    const data = parsed.data;
    const validation = validateCouponRequestData_(data);

    // Nếu dữ liệu vi phạm điều kiện Logic
    if (!validation.ok) {
        replyText_(payload.replyToken, '❌ ' + validation.message, payload.quoteToken, mentionId);
        return;
    }

    const couponSheet = getSheet_(payload.ss, CONFIG.SHEET_COUPON);

    // Kiểm tra tính tồn tại của Loại PMH trong Kho chính
    if (!couponTypeExists_(couponSheet, data.loaiPMH)) {
        replyText_(payload.replyToken, '❌ Loại PMH "' + data.loaiPMH + '" không có trong kho.', payload.quoteToken, mentionId);
        return;
    }

    // SỬ DỤNG LOCK TRÁNH TRANH CHẤP MÃ PHIẾU (Tăng timeout lên 30s để xử lý cao điểm gửi đồng thời)
    const lock = LockService.getScriptLock();
    const gotLock = lock.tryLock(30000); // Đợi tối đa 30 giây
    if (!gotLock) {
        replyText_(payload.replyToken, '❌ Hệ thống bận, vui lòng thử lại sau.', payload.quoteToken, mentionId);
        return;
    }

    let shouldCheckLowStock = false;
    let dupCheckAction = null;

    try {
        const dupCheck = checkDuplicateRequest_(payload.requestSheet, couponSheet, {
            userId: payload.userId,
            loaiPMH: data.loaiPMH,
            maKho: data.maKho,
            mdh: data.mdh
        });
        dupCheckAction = dupCheck.action;

        if (dupCheck.action === 'block_same_type') {
            replyText_(payload.replyToken, '❌ MĐH này đã được cấp PMH.', payload.quoteToken, mentionId);
            return;
        }

        // Tìm mã coupon chưa sử dụng ngay lập tức
        const coupon = findFirstUnusedCoupon_(couponSheet, data.loaiPMH);

        if (!coupon) {
            // Ghi yêu cầu vào sheet với trạng thái Hết mã
            appendRequest_(payload.requestSheet, {
                messageId: payload.messageId,
                userId: payload.userId,
                displayName: payload.displayName,
                loaiPMH: data.loaiPMH,
                maKho: data.maKho,
                mdh: data.mdh,
                status: CONFIG.REQUEST_STATUS_OUT_OF_STOCK,
                couponCode: '',
                ghiChu: 'Đã hết PMH tại thời điểm gửi form',
                quoteToken: payload.quoteToken,
                chatId: payload.sourceId
            });

            // Báo hết mã ngay cho người dùng
            replyText_(payload.replyToken, '❌ Hết mã PMH loại "' + data.loaiPMH + '".', payload.quoteToken, mentionId);
            return;
        }

        // Giữ chỗ mã phiếu
        couponSheet.getRange(coupon.row, 3, 1, 5).setValues([[
            CONFIG.COUPON_STATUS_SENT,
            data.maKho,
            data.mdh,
            payload.displayName,
            payload.userId
        ]]);

        // Kiểm tra cấu hình Tự động gửi PMH
        const props = PropertiesService.getScriptProperties();
        const isAutoApproveEnabled = props.getProperty('AUTO_APPROVE_ENABLED') === 'true';

        if (isAutoApproveEnabled) {
            // Ghi vào YeuCauPhatMa với trạng thái ĐÃ PHÁT MÃ
            appendRequest_(payload.requestSheet, {
                messageId: payload.messageId,
                userId: payload.userId,
                displayName: payload.displayName,
                loaiPMH: data.loaiPMH,
                maKho: data.maKho,
                mdh: data.mdh,
                status: CONFIG.REQUEST_STATUS_SENT,
                couponCode: coupon.code,
                ghiChu: 'BOT tự động gửi',
                quoteToken: payload.quoteToken,
                chatId: payload.sourceId
            });

            payload._autoApproveCoupon = coupon;
            payload._autoApproveLoaiPMH = data.loaiPMH;
        } else {
            // Ghi vào YeuCauPhatMa với trạng thái CHỜ DUYỆT nhưng ĐÃ GÁN MÃ
            appendRequest_(payload.requestSheet, {
                messageId: payload.messageId,
                userId: payload.userId,
                displayName: payload.displayName,
                loaiPMH: data.loaiPMH,
                maKho: data.maKho,
                mdh: data.mdh,
                status: CONFIG.REQUEST_STATUS_PENDING,
                couponCode: coupon.code,
                ghiChu: 'Đã gán mã, chờ admin duyệt gửi',
                quoteToken: payload.quoteToken,
                chatId: payload.sourceId
            });
        }

        shouldCheckLowStock = true;

    } catch (err) {
        console.error('Lỗi khi xử lý lưu đơn:', err);
        replyText_(payload.replyToken, '❌ Lỗi hệ thống: ' + err.message, payload.quoteToken, mentionId);
    } finally {
        lock.releaseLock();
    }

    // CÁC TÁC VỤ PHỤ CHẠY SAU KHI ĐÃ NHẢ LOCK ĐỂ GIẢI PHÓNG HÀNG ĐỢI NHANH NHẤT CHO CÁC ĐƠN KHÁC:
    // Nếu chế độ tự động gửi bật: trả lời trích dẫn phát mã ngay lập tức cho người dùng
    if (payload._autoApproveCoupon) {
        const sendMsg = payload.displayName + NL + '➜ PMH ' + payload._autoApproveLoaiPMH + ' : ' + payload._autoApproveCoupon.code;
        replyText_(payload.replyToken, sendMsg, payload.quoteToken);
    }

    if (dupCheckAction === 'allow_with_change_notice') {
        replyText_(payload.replyToken, '❌ Đã đổi sang loại PMH mới: ' + data.loaiPMH, payload.quoteToken, mentionId);
    }

    if (shouldCheckLowStock) {
        try {
            checkAndSendLowStockAlert_(couponSheet, data.loaiPMH);
        } catch (alertErr) {
            console.error('Lỗi checkAndSendLowStockAlert_:', alertErr);
        }
    }
}

/**********************
 * 6. BÓC TÁCH FORM THEO REGEX LINH HOẠT CHUẨN XÁC
 **********************/
function shouldIgnoreLine_(line) {
    const t = String(line || '').toLowerCase().trim();
    if (!t) return true;
    if (t.startsWith('@')) return true;

    // Divider lines (e.g., ----, ====, ~~~)
    if (/^[\-\=\*_~#\s]+$/.test(t)) {
        return true;
    }

    // Metadata/header keywords to ignore
    const ignoreKeywords = [
        'form', 'mẫu', 'mau',
        'ví dụ', 'vi du',
        'yêu cầu', 'yeu cau',
        'hướng dẫn', 'huong dan',
        'đăng ký', 'dang ky',
        'lấy pmh', 'lay pmh',
        'phát pmh', 'phat pmh'
    ];

    for (let i = 0; i < ignoreKeywords.length; i++) {
        if (t.includes(ignoreKeywords[i])) {
            return true;
        }
    }

    return false;
}

function isKeyLine_(line) {
    const t = String(line || '').toLowerCase().trim();
    const hasLoai = t.includes('loại pmh') || t.includes('loai pmh') || t.includes('cú pháp') || t.includes('cu phap');
    const hasKho = t.includes('mã kho') || t.includes('ma kho') || t.includes('kho');
    const hasMdh = t.includes('mđh') || t.includes('mdh') || t.includes('đơn') || t.includes('don') || t.includes('đh') || t.includes('dh');
    return hasLoai || hasKho || hasMdh;
}

function parseCouponForm_(text) {
    const rawLines = String(text || '').normalize('NFC').split(/[\n\r]+/);
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!shouldIgnoreLine_(line)) {
            lines.push(line);
        }
    }

    let loaiPMH = '';
    let maKho = '';
    let mdh = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        const lineLower = line.toLowerCase();

        const isLoai = lineLower.includes('loại pmh') ||
            lineLower.includes('loai pmh') ||
            lineLower.includes('cú pháp') ||
            lineLower.includes('cu phap');

        const isKho = !isLoai && (
            lineLower.includes('mã kho') ||
            lineLower.includes('ma kho') ||
            lineLower.includes('kho')
        );

        const isMdh = !isLoai && !isKho && (
            lineLower.includes('mđh') ||
            lineLower.includes('mdh') ||
            lineLower.includes('đh') ||
            lineLower.includes('dh') ||
            lineLower.includes('đơn hàng') ||
            lineLower.includes('don hang') ||
            lineLower.includes('đơn') ||
            lineLower.includes('don') ||
            lineLower.includes('mã đơn') ||
            lineLower.includes('ma don')
        );

        if (isLoai && !loaiPMH) {
            loaiPMH = extractValueFromLineOrNext_(lines, i);
        } else if (isKho && !maKho) {
            maKho = extractValueFromLineOrNext_(lines, i);
        } else if (isMdh && !mdh) {
            mdh = extractValueFromLineOrNext_(lines, i);
        }
    }

    const missing = [];
    if (!loaiPMH) missing.push('Loại PMH/Cú pháp');

    if (missing.length > 0) {
        return {
            ok: false,
            message: '❌ Sai cú pháp: Thiếu "Loại PMH".'
        };
    }

    return {
        ok: true,
        data: {
            loaiPMH: String(loaiPMH).toUpperCase(),
            maKho: String(maKho || ''),
            mdh: String(mdh || '').toUpperCase()
        }
    };
}

function extractValueFromLineOrNext_(lines, index) {
    let line = lines[index].trim();

    if (line.indexOf(':') !== -1) {
        const parts = line.split(':');
        const val = parts.slice(1).join(':').trim();
        if (val) return val;

        if (index + 1 < lines.length) {
            const nextLine = lines[index + 1].trim();
            if (!isKeyLine_(nextLine)) {
                return nextLine;
            }
        }
        return '';
    }

    const cleanLabel = line.toLowerCase()
        .replace(/loại|loai|pmh|cú pháp|cu phap|mã|ma|kho|áp dụng|ap dung|mđh|mdh|đơn hàng|don hang|đơn|don|đh|dh/g, '')
        .replace(/[\s\t\.\-\:]+/g, '')
        .trim();

    if (cleanLabel.length > 0) {
        return cleanLabel;
    } else {
        if (index + 1 < lines.length) {
            const nextLine = lines[index + 1].trim();
            if (!isKeyLine_(nextLine)) {
                return nextLine;
            }
        }
    }
    return '';
}

function validateCouponRequestData_(data) {
    return { ok: true };
}

function checkDuplicateRequest_(sheet, couponSheet, data) {
    return { action: 'allow' };
}

function appendRequest_(sheet, data) {
    sheet.appendRow([
        data.messageId,
        data.userId,
        data.displayName,
        data.loaiPMH,
        data.maKho,
        data.mdh,
        data.status || CONFIG.REQUEST_STATUS_PENDING,
        new Date(),
        data.couponCode || '',
        data.ghiChu || '',
        data.quoteToken || '',
        data.chatId || ''
    ]);
}

/**********************
 * 7. LỆNH DUYỆT PHÁT MÃ CỦA ADMIN
 **********************/
function handleAdminApproval_(userId, replyToken, sourceId, commandText, quotedMessageId, quoteToken) {
    if (!isAdmin_(userId)) return;

    const lock = LockService.getScriptLock();
    const gotLock = lock.tryLock(30000);

    if (!gotLock) {
        replyText_(replyToken, '❌ Hệ thống bận xử lý lượt duyệt trước. Vui lòng thử lại sau.', quoteToken);
        return;
    }

    try {
        let resultMessage;
        if (quotedMessageId) {
            resultMessage = approveQuotedRequest_(sourceId, quotedMessageId);
        } else {
            resultMessage = approvePendingRequests_(sourceId, commandText, userId, replyToken);
        }
        if (resultMessage) {
            replyText_(replyToken, resultMessage, quoteToken);
        }
    } catch (err) {
        console.error('handleAdminApproval error:', err);
        replyText_(replyToken, '❌ Lỗi duyệt mã: ' + err.message, quoteToken);
    } finally {
        lock.releaseLock();
    }
}

function approveQuotedRequest_(sourceId, quotedMessageId) {
    const ss = getSpreadsheet_();
    const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);
    const lastRow = requestSheet.getLastRow();

    let foundRow = -1;
    let rowData = null;

    if (lastRow > 1) {
        const values = requestSheet.getRange(2, 1, lastRow - 1, requestSheet.getLastColumn()).getValues();
        for (let i = 0; i < values.length; i++) {
            if (String(values[i][COL_REQUEST.ID_TIN_NHAN - 1]).trim() === quotedMessageId) {
                foundRow = i + 2;
                rowData = values[i];
                break;
            }
        }
    }

    if (foundRow === -1) {
        return '❌ Không tìm thấy yêu cầu tương ứng với tin nhắn trích dẫn này trong Sheet.';
    }

    const userId = String(rowData[COL_REQUEST.ID_NGUOI_GUI - 1] || '').trim();
    const displayName = String(rowData[COL_REQUEST.TEN_QUAN_LY - 1] || '').trim();
    const loaiPMH = String(rowData[COL_REQUEST.LOAI_PMH - 1] || '').trim().toUpperCase();
    const maKho = String(rowData[COL_REQUEST.MA_KHO - 1] || '').trim();
    const mdh = String(rowData[COL_REQUEST.MDH - 1] || '').trim().toUpperCase();
    let couponCode = String(rowData[COL_REQUEST.MA_PHIEU_DA_PHAT - 1] || '').trim();

    const couponSheet = getSheet_(ss, CONFIG.SHEET_COUPON);

    // Nếu chưa có mã coupon, thực hiện tìm và gán mã mới
    if (!couponCode) {
        const coupon = findFirstUnusedCoupon_(couponSheet, loaiPMH);
        if (!coupon) {
            return '❌ Hết mã PMH loại "' + loaiPMH + '".';
        }
        couponCode = coupon.code;

        // Giữ chỗ mã phiếu
        couponSheet.getRange(coupon.row, 3, 1, 5).setValues([[
            CONFIG.COUPON_STATUS_SENT,
            maKho,
            mdh,
            displayName,
            userId
        ]]);

        // Cập nhật mã vào dòng yêu cầu
        requestSheet.getRange(foundRow, COL_REQUEST.MA_PHIEU_DA_PHAT).setValue(couponCode);
    }

    // Cập nhật trạng thái thành ĐÃ PHÁT MÃ
    requestSheet.getRange(foundRow, COL_REQUEST.TRANG_THAI).setValue(CONFIG.REQUEST_STATUS_SENT);
    requestSheet.getRange(foundRow, COL_REQUEST.GHI_CHU).setValue('Admin duyệt trích dẫn trực tiếp');

    return displayName + NL + '➜ PMH ' + loaiPMH + ' : ' + couponCode;
}

function approvePendingRequests_(sourceId, commandText, adminUserId, replyToken) {
    console.log('=== approvePendingRequests_ BẮT ĐẦU === sourceId: ' + sourceId + ', adminUserId: ' + adminUserId);
    const ss = getSpreadsheet_();
    const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);

    const requestLastRow = requestSheet.getLastRow();
    console.log('Sheet YeuCauPhatMa lastRow: ' + requestLastRow);
    if (requestLastRow < 2) return 'Hiện tại không có yêu cầu nào đang nằm trong danh sách chờ duyệt.';

    const requestLastColumn = Math.max(requestSheet.getLastColumn(), 12);
    const requestValues = requestSheet.getRange(2, 1, requestLastRow - 1, requestLastColumn).getValues();
    console.log('Tổng số hàng dữ liệu đọc được: ' + requestValues.length);

    // Gom nhóm đơn theo chatId (Column L, index 11)
    const groupedByChat = {};
    let processedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < requestValues.length; i++) {
        const row = requestValues[i];
        const sheetRow = i + 2;

        const userId = String(row[COL_REQUEST.ID_NGUOI_GUI - 1] || '').trim();
        const displayName = String(row[COL_REQUEST.TEN_QUAN_LY - 1] || '').trim();
        const loaiPMH = String(row[COL_REQUEST.LOAI_PMH - 1] || '').trim().toUpperCase();
        const mdh = String(row[COL_REQUEST.MDH - 1] || '').trim().toUpperCase();
        const status = String(row[COL_REQUEST.TRANG_THAI - 1] || '').trim();
        const couponCode = String(row[COL_REQUEST.MA_PHIEU_DA_PHAT - 1] || '').trim();

        let chatId = row.length >= 12 ? String(row[11] || '').trim() : '';
        if (!chatId) {
            // Dự phòng cho dữ liệu cũ không có cột L
            chatId = userId;
        }

        if (!isPendingStatus_(status)) {
            if (status) skippedCount++;
            continue;
        }

        processedCount++;

        if (!groupedByChat[chatId]) {
            groupedByChat[chatId] = [];
        }
        groupedByChat[chatId].push({
            sheetRow: sheetRow,
            userId: userId,
            displayName: displayName,
            loaiPMH: loaiPMH,
            mdh: mdh,
            couponCode: couponCode
        });
    }

    console.log('Kết quả quét: pendingCount=' + processedCount + ', skippedCount=' + skippedCount + ', totalChats=' + Object.keys(groupedByChat).length);

    if (processedCount === 0) return 'Hiện tại không có yêu cầu nào đang nằm trong danh sách chờ duyệt.';

    // Cập nhật trạng thái các hàng trong Sheet YeuCauPhatMa — BATCH UPDATE
    const note = adminUserId === 'BOT_AUTO' ? 'BOT tự động duyệt' : 'Admin đã duyệt';
    for (const chatId in groupedByChat) {
        const requests = groupedByChat[chatId];
        for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const arrayIndex = req.sheetRow - 2;
            requestValues[arrayIndex][COL_REQUEST.TRANG_THAI - 1] = CONFIG.REQUEST_STATUS_SENT;
            requestValues[arrayIndex][COL_REQUEST.GHI_CHU - 1] = note;
        }
    }
    requestSheet.getRange(2, 1, requestLastRow - 1, requestLastColumn).setValues(requestValues);
    SpreadsheetApp.flush();
    console.log('Đã cập nhật trạng thái ' + processedCount + ' hàng trên Sheet.');
    logSystem_('APPROVE_PENDING', 'Đã duyệt ' + processedCount + ' hàng trên sheet.');

    let replyTokenUsed = false;

    // Gửi tin nhắn cho từng nhóm/chat
    for (const chatId in groupedByChat) {
        const requests = groupedByChat[chatId];
        const entries = [];
        for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const entryText = req.displayName + NL + '➜ PMH ' + req.loaiPMH + ' : ' + req.couponCode;
            entries.push(entryText);
        }

        const replyMessages = splitTextEntriesIntoMessages_(entries, 4000);
        if (replyMessages.length > 0) {
            let headerText = '👮 Admin đã duyệt phát mã:' + NL + '━━━━━━' + NL;
            if (adminUserId === 'BOT_AUTO') {
                headerText = '🤖 BOT đã tự động duyệt phát mã:' + NL + '━━━━━━' + NL;
            }
            replyMessages[0].text = headerText + replyMessages[0].text;
        }

        if (replyMessages.length > 0 && requests.length > 1) {
            const lastIdx = replyMessages.length - 1;
            replyMessages[lastIdx].text = replyMessages[lastIdx].text + NL + '━━━━━━' + NL + '💡 Hãy chuyển tiếp tin nhắn này cho BOT để lọc nhanh PMH của bạn!';
        }

        // Gửi đi
        for (let m = 0; m < replyMessages.length; m++) {
            const msgText = replyMessages[m].text;

            // Nếu đây là chat gốc nơi Admin gõ lệnh duyệt, và chúng ta có replyToken, và là tin nhắn đầu tiên
            if (sourceId && sourceId === chatId && replyToken && !replyTokenUsed && m === 0) {
                replyText_(replyToken, msgText);
                replyTokenUsed = true;
                logSystem_('APPROVE_REPLY', 'Đã gửi reply cho chat: ' + chatId);
            } else {
                pushText_(chatId, msgText);
                logSystem_('APPROVE_PUSH', 'Đã gửi push cho chat: ' + chatId);
            }
        }
    }

    const summaryText = '✅ Đã duyệt thành công ' + processedCount + ' đơn hàng và gửi tới các nhóm tương ứng.';

    // Nếu chưa dùng replyToken, trả về summaryText để handleAdminApproval_ reply trực tiếp cho Admin
    if (replyToken && !replyTokenUsed) {
        return summaryText;
    }

    return null;
}

/**********************
 * 8. LOGIC KHO MÃ PHIẾU COUPON
 **********************/
function couponTypeExists_(sheet, loaiPMH) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    const values = sheet.getRange(2, COL_COUPON.LOAI_PHIEU, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
        if (String(values[i][0] || '').trim().toUpperCase() === loaiPMH) return true;
    }
    return false;
}

function hasUnusedCoupon_(sheet, loaiPMH) {
    return !!findFirstUnusedCoupon_(sheet, loaiPMH);
}

function findFirstUnusedCoupon_(sheet, loaiPMH) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    // Chỉ đọc 3 cột đầu (A, B, C) thay vì tất cả các cột để tối ưu hóa tốc độ
    const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const code = String(row[COL_COUPON.MA_PHIEU - 1] || '').trim();
        const type = String(row[COL_COUPON.LOAI_PHIEU - 1] || '').trim().toUpperCase();
        const status = String(row[COL_COUPON.TRANG_THAI - 1] || '').trim();

        if (code && type === loaiPMH && (status === '' || status === CONFIG.COUPON_STATUS_UNUSED)) {
            return { row: i + 2, code: code };
        }
    }
    return null;
}

/**********************
 * 9. ĐẨY DỮ LIỆU ĐẾN LINE API
 **********************/
function replyText_(replyToken, text, quoteToken, mentionUserId) {
    if (!replyToken || !text) return;
    const url = 'https://api.line.me/v2/bot/message/reply';

    let messages;
    if (Array.isArray(text)) {
        messages = text;
    } else {
        let messageObj;
        if (typeof text === 'object') {
            messageObj = text;
        } else if (mentionUserId) {
            messageObj = {
                type: 'textV2',
                text: '{m1}' + NL + truncateLineText_(text),
                substitution: {
                    'm1': {
                        type: 'mention',
                        mentionee: {
                            type: 'user',
                            userId: mentionUserId
                        }
                    }
                }
            };
        } else {
            messageObj = {
                type: 'text',
                text: truncateLineText_(text)
            };
        }

        if (quoteToken) {
            messageObj.quoteToken = quoteToken;
        }
        messages = [messageObj];
    }

    // LINE Reply API limits to maximum 5 messages per response
    if (messages.length > 5) {
        messages = messages.slice(0, 5);
    }

    const payload = {
        replyToken: replyToken,
        messages: messages
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() !== 200) {
            const respText = response.getContentText();
            console.error('Lỗi khi gửi tin nhắn LINE:', respText);
            logSystem_('LINE_REPLY_ERROR', 'ReplyToken: ' + replyToken + '\nResponse: ' + respText + '\nPayload: ' + JSON.stringify(payload));
        }
    } catch (e) {
        console.error('Lỗi ngoại lệ khi gửi reply tin nhắn LINE:', e);
        logSystem_('LINE_REPLY_EXCEPTION', 'Error: ' + e.message + '\nStack: ' + e.stack);
    }
}

function truncateLineText_(text) {
    const maxLength = 4300;
    text = String(text || '');
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + NL + NL + '...Đơn hàng gộp quá dài, vui lòng xem tiếp trên file Sheet.';
}

/**********************
 * HÀM PHỤ TRỢ ĐỊNH DẠNG CHUỒI
 **********************/
function looksLikeCouponForm_(text) {
    const t = String(text || '').toLowerCase().trim();

    // Kiểm tra sự xuất hiện của Loại PMH hoặc Cú pháp
    const hasColonLoai = /l[oọ][aạ\u0323]*i[ \t]*pmh(?:[ \t]+(?:áp|ap|yêu|yeu)[ \t]*(?:dụng|dung|cầu|cau))?[ \t]*:|c[uú][ \t]*ph[aá]p(?:[ \t]+(?:áp|ap|yêu|yeu)[ \t]*(?:dụng|dung|cầu|cau))?[ \t]*:/i.test(t);

    return hasColonLoai;
}

function isValidWebhookRequest_(e) {
    if (!CONFIG.WEBHOOK_SECRET) return true;
    return e && e.parameter && e.parameter.token === CONFIG.WEBHOOK_SECRET;
}

function getSpreadsheet_() {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheetByNameNormalized_(ss, sheetName) {
    if (!ss || !sheetName) return null;
    const sheets = ss.getSheets();
    const normalizedTarget = String(sheetName).normalize('NFC').trim().toLowerCase();
    for (let i = 0; i < sheets.length; i++) {
        const name = String(sheets[i].getName()).normalize('NFC').trim().toLowerCase();
        if (name === normalizedTarget) {
            return sheets[i];
        }
    }
    return null;
}

function getSheet_(ss, sheetName) {
    const sheet = getSheetByNameNormalized_(ss, sheetName);
    if (!sheet) throw new Error('Không tìm thấy Sheet: ' + sheetName);
    return sheet;
}

function textOutput_(text) {
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}

function getUserIdFromEvent_(event) {
    return event && event.source ? String(event.source.userId || '').trim() : '';
}

function isAdmin_(userId) {
    if (!userId) return false;
    if (CONFIG.ADMIN_IDS && CONFIG.ADMIN_IDS.indexOf(userId) !== -1) {
        return true;
    }

    try {
        const ss = getSpreadsheet_();
        const adminSheet = getSheetByNameNormalized_(ss, 'Admin');
        if (!adminSheet) return false;

        const lastRow = adminSheet.getLastRow();
        if (lastRow < 2) return false;

        const values = adminSheet.getRange(2, 1, lastRow - 1, 3).getValues();
        for (let i = 0; i < values.length; i++) {
            const row = values[i];
            const savedUserId = String(row[1] || '').trim();
            const status = String(row[2] || '').trim().toLowerCase();

            if (savedUserId === userId && status === 'duyệt') {
                return true;
            }
        }
    } catch (e) {
        console.error('Lỗi khi kiểm tra quyền admin:', e);
    }
    return false;
}

function getAdminNameByUserId_(userId) {
    if (!userId) return 'Admin';
    try {
        const ss = getSpreadsheet_();
        const adminSheet = getSheetByNameNormalized_(ss, 'Admin');
        if (adminSheet) {
            const lastRow = adminSheet.getLastRow();
            if (lastRow >= 2) {
                const values = adminSheet.getRange(2, 1, lastRow - 1, 3).getValues();
                for (let i = 0; i < values.length; i++) {
                    const row = values[i];
                    const savedUserId = String(row[1] || '').trim();
                    if (savedUserId === userId) {
                        return String(row[0] || '').trim() || 'Admin';
                    }
                }
            }
        }
    } catch (e) {
        console.error('Lỗi khi lấy tên Admin từ sheet:', e);
    }
    return 'Admin';
}

function getOrCreateAdminSheet_(ss) {
    let sheet = getSheetByNameNormalized_(ss, 'Admin');
    if (!sheet) {
        sheet = ss.insertSheet('Admin');
        sheet.appendRow(['Tên Line', 'ID Line', 'Trạng thái']);
        sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
    return sheet;
}

function handleAdminRegistrationRequest_(userId, replyToken) {
    try {
        const ss = getSpreadsheet_();
        const adminSheet = getOrCreateAdminSheet_(ss);
        const lastRow = adminSheet.getLastRow();

        let isRegistered = false;
        let existingRow = -1;
        let existingStatus = '';

        if (lastRow > 1) {
            const values = adminSheet.getRange(2, 2, lastRow - 1, 2).getValues();
            for (let i = 0; i < values.length; i++) {
                if (String(values[i][0] || '').trim() === userId) {
                    isRegistered = true;
                    existingRow = i + 2;
                    existingStatus = String(values[i][1] || '').trim();
                    break;
                }
            }
        }

        const lineName = getLineDisplayName_(userId);

        if (isRegistered) {
            if (existingStatus.toLowerCase() === 'duyệt') {
                replyText_(replyToken, 'Chào ' + lineName + ', bạn đã có quyền Admin trong danh sách (Trạng thái: Duyệt).');
            } else {
                adminSheet.getRange(existingRow, 3).setValue('Duyệt');
                replyText_(replyToken, 'Chào ' + lineName + ', yêu cầu làm Admin của bạn đã được cập nhật lại thành công. Trạng thái hiện tại: Duyệt.');
            }
        } else {
            adminSheet.appendRow([lineName, userId, 'Duyệt']);
            replyText_(replyToken, 'Chào ' + lineName + ', thông tin của bạn đã được thêm vào danh sách Admin. Trạng thái mặc định: Duyệt.');
        }
    } catch (err) {
        console.error('Lỗi khi đăng ký admin:', err);
        replyText_(replyToken, 'Có lỗi xảy ra khi thực hiện đăng ký Admin: ' + err.message);
    }
}

function handleAdminGuideRequest_(replyToken) {
    const guide =
        '📖 HƯỚNG DẪN DÀNH CHO ADMIN' + NL +
        '━━━━━━' + NL +
        'Chào Admin, đây là các cú pháp bạn có thể thực hiện khi tương tác với BOT:' + NL + NL +
        '1. TRÊN NHÓM CHAT (GROUP CHAT):' + NL +
        '• ok hoặc duyệt hoặc all:' + NL +
        '  👉 Duyệt toàn bộ đơn hàng đang chờ phát mã.' + NL +
        '  👉 Gửi tin nhắn gộp danh sách mã đã phát trực tiếp lên nhóm chat.' + NL + NL +
        '2. NHẮN RIÊNG 1-1 VỚI BOT:' + NL +
        '• setup:' + NL +
        '  👉 Cài đặt lại trigger chạy tự động (6h, 15h, quét 5p, dọn dẹp 2h sáng).' + NL +
        '• auto on / auto off:' + NL +
        '  👉 Bật hoặc Tắt tính năng tự động gửi PMH (trả lời trích dẫn phát mã ngay thay vì chờ Admin phản hồi ok).' + NL +
        '• admin:' + NL +
        '  👉 Đăng ký tài khoản của bạn vào danh sách Admin (mặc định trạng thái: Duyệt).' + NL +
        '• mb:' + NL +
        '  👉 Xem tổng hợp toàn bộ các mẫu tin nhắn phản hồi của BOT.' + NL +
        '• tk:' + NL +
        '  👉 Xem thống kê số lượng PMH còn lại trong kho.' + NL +
        '• cp:' + NL +
        '  👉 Xem cú pháp form mẫu chuẩn để quản lý sao chép.' + NL +
        '• dọn (hoặc don):' + NL +
        '  👉 Dọn dẹp dữ liệu cũ đã xử lý trên Sheet (chuyển sang tab lịch sử khi vượt 50 dòng).' + NL +
        '• hd:' + NL +
        '  👉 Xem lại hướng dẫn này.' + NL + NL +
        'Chúc Admin làm việc hiệu quả! 🚀';

    replyText_(replyToken, guide);
}

function handleAdminNotificationTemplatesRequest_(replyToken) {
    const templates =
        '📝 TỔNG HỢP MẪU THÔNG BÁO CỦA BOT' + NL +
        '━━━━━━' + NL +
        'Dưới đây là các mẫu tin nhắn phản hồi của BOT:' + NL + NL +
        '1. PHẢN HỒI KHI QUẢN LÝ GỬI FORM LỖI (Tag Quản lý ở đầu):' + NL +
        '• Thiếu trường: "❌ Ôi bạn ơi, form thiếu trước hụt sau..."' + NL +
        '• Lệch Mã đơn & Mã kho: "❌ MĐH và Mã kho đang \'hờn dỗi\'..."' + NL +
        '• Mã kho chứa chữ: "❌ Mã Kho gì mà lạ lùng thế..."' + NL +
        '• Loại PMH không tồn tại: "❌ Ủa Loại PMH \'[LOẠI]\' này ở đâu ra..."' + NL +
        '• Hết mã PMH: "❌ Nhanh tay quá nhưng rất tiếc..."' + NL +
        '• Trùng đơn đã phát: "❌ MĐH này đã được cấp PMH rồi nha..."' + NL +
        '• Đổi Loại PMH: "❌ Phát hiện yêu cầu đổi \'đồ chơi\' mới..."' + NL + NL +
        '2. KHI ADMIN DUYỆT (LỆNH ok/duyệt hoặc all):' + NL +
        '• Trả lời trích dẫn tag tên trên nhóm:' + NL +
        '  "@[Tên]' + NL +
        '  Loại PMH: ...' + NL +
        '  MĐH: ...' + NL +
        '  Mã phiếu: ..."';

    replyText_(replyToken, templates);
}

function isAdminApprovalCommand_(text) {
    const t = String(text || '').trim().toUpperCase();
    return t === CONFIG.APPROVAL_COMMAND || t === 'OK' || t === 'ALL';
}

function isOnlyDigits_(text) {
    text = String(text || '').trim();
    if (!text) return false;
    for (let i = 0; i < text.length; i++) {
        const c = text.charAt(i);
        if (c < '0' || c > '9') return false;
    }
    return true;
}

function startsWith_(text, prefix) {
    return String(text || '').indexOf(String(prefix || '')) === 0;
}

/**********************
 * HÀM XỬ LÝ LỆNH LẤY CÚ PHÁP
 **********************/
function getSyntaxText_() {
    // 1. Đọc siêu tốc từ Firebase Realtime Database (~80ms)
    if (CONFIG.FIREBASE_DB_URL) {
        try {
            const url = CONFIG.FIREBASE_DB_URL.replace(/\/$/, '') + '/syntax.json';
            const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            if (res.getResponseCode() === 200) {
                const data = JSON.parse(res.getContentText());
                if (data && data.text) {
                    return String(data.text).trim();
                }
            }
        } catch (e) {
            console.error('Lỗi khi lấy cú pháp từ Firebase, fallback Sheet:', e);
        }
    }

    // 2. Fallback về Google Sheet nếu Firebase trống hoặc gặp lỗi
    try {
        const ss = getSpreadsheet_();
        const sheet = getSheet_(ss, CONFIG.SHEET_SYNTAX);
        return String(sheet.getRange('A1').getValue() || '').trim();
    } catch (e) {
        console.error('Lỗi khi lấy cú pháp từ Sheet:', e);
    }
    return null;
}

function handleSyntaxRequest_(replyToken, quoteToken, mentionUserId) {
    try {
        const syntaxText = getSyntaxText_();
        if (!syntaxText) {
            replyText_(replyToken, '❌ Cú pháp trống (ô A1 Sheet Cú pháp).', quoteToken, mentionUserId);
            return;
        }
        replyText_(replyToken, syntaxText, quoteToken, mentionUserId);
    } catch (err) {
        console.error('handleSyntaxRequest_ error:', err);
        replyText_(replyToken, '❌ Lỗi lấy cú pháp: ' + err.message, quoteToken, mentionUserId);
    }
}

/**********************
 * HÀM THỐNG KÊ VÀ LẬP LỊCH GỬI TỰ ĐỘNG
 **********************/
function getSourceIdFromEvent_(event) {
    if (!event || !event.source) return null;
    if (event.source.type === 'group') return event.source.groupId;
    if (event.source.type === 'room') return event.source.roomId;
    if (event.source.type === 'user') return event.source.userId;
    return null;
}

function saveActiveChatId_(chatId) {
    if (!chatId || chatId.startsWith('U')) return;
    try {
        const props = PropertiesService.getScriptProperties();
        let chatIds = props.getProperty('ACTIVE_CHAT_IDS');
        let list = chatIds ? JSON.parse(chatIds) : [];
        if (list.indexOf(chatId) === -1) {
            list.push(chatId);
            props.setProperty('ACTIVE_CHAT_IDS', JSON.stringify(list));
            console.log('Đã lưu nhóm/chat mới vào danh sách chủ động gửi tin nhắn: ' + chatId);
        }
    } catch (e) {
        console.error('Lỗi khi lưu chatId:', e);
    }
}

function extractPMHMappingFromSyntax_(syntaxText) {
    const mapping = [];
    if (!syntaxText) return mapping;

    const lines = syntaxText.split(/[\n\r]+/);
    // Cho phép ký tự đặc biệt bất kỳ ở đầu dòng trước tên hiển thị
    const regex = /^[^:\w]*([^:]+?)\s*:\s*(\S+)\s*$/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(regex);
        if (match) {
            const displayName = match[1].trim();
            const typeCode = match[2].trim();

            const lowerName = displayName.toLowerCase();
            if (lowerName.includes('loại') || lowerName.includes('cú pháp') || lowerName.includes('mã kho') || lowerName.includes('mđh') || lowerName.includes('form mẫu')) {
                continue;
            }

            mapping.push({
                displayName: displayName,
                typeCode: typeCode
            });
        }
    }
    return mapping;
}

function getCouponStatistics_() {
    const ss = getSpreadsheet_();
    const couponSheet = getSheet_(ss, CONFIG.SHEET_COUPON);
    const lastRow = couponSheet.getLastRow();
    if (lastRow < 2) return 'Kho PMH hiện tại trống.';

    // Chỉ đọc 3 cột đầu (A, B, C) thay vì tất cả các cột để tối ưu hóa tốc độ
    const range = couponSheet.getRange(2, 1, lastRow - 1, 3);
    const values = range.getValues();

    // Đếm số lượng mã chưa sử dụng theo Loại PMH
    const counts = {};
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const code = String(row[COL_COUPON.MA_PHIEU - 1] || '').trim();
        const type = String(row[COL_COUPON.LOAI_PHIEU - 1] || '').trim().toUpperCase();
        const status = String(row[COL_COUPON.TRANG_THAI - 1] || '').trim();

        if (!code || !type) continue;
        if (counts[type] === undefined) {
            counts[type] = 0;
        }
        if (status === '' || status === CONFIG.COUPON_STATUS_UNUSED) {
            counts[type]++;
        }
    }

    let syntaxText = '';
    try {
        const syntaxSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_SYNTAX);
        if (syntaxSheet) {
            syntaxText = String(syntaxSheet.getRange('A1').getValue() || '').trim();
        }
    } catch (e) {
        console.error('Lỗi khi đọc Sheet Cú pháp:', e);
    }

    const lines = [
        '📊 THỐNG KÊ PMH CÒN LẠI:',
        '------------------------'
    ];

    if (syntaxText) {
        const rawLines = syntaxText.split(/\r?\n/);
        let startIndex = -1;

        // Tìm dòng đầu tiên bắt đầu chứa danh mục (bắt đầu bằng ⬢)
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

                // Dừng khi gặp footer hoặc chữ ký người dùng hoặc phân cách khác
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
                        lines.push('- ' + displayName + ': ' + count);
                    } else {
                        // Giữ nguyên dòng nếu là văn bản khác (nhưng vẫn trong vùng thống kê)
                        lines.push(line);
                    }
                }
            }
            return lines.join(NL);
        }
    }

    // Fallback nếu không bóc tách được từ Sheet Cú pháp
    const sortedKeys = Object.keys(counts).sort();
    for (let i = 0; i < sortedKeys.length; i++) {
        const key = sortedKeys[i];
        lines.push('⬢ ' + key + ': ' + (counts[key] !== undefined ? counts[key] : 0));
    }
    return lines.join(NL);
}

function pushText_(toId, text) {
    if (!toId || !text) return false;
    const url = 'https://api.line.me/v2/bot/message/push';
    const payload = {
        to: toId,
        messages: [{ type: 'text', text: text }]
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        const respCode = response.getResponseCode();
        const respText = response.getContentText();

        try {
            const props = PropertiesService.getScriptProperties();
            props.setProperty('LAST_PUSH_STATUS', JSON.stringify({
                timestamp: new Date().toISOString(),
                to: toId,
                code: respCode,
                body: respText
            }));
        } catch (pe) {
            console.error('Lỗi khi lưu LAST_PUSH_STATUS:', pe);
        }

        if (respCode === 200) {
            return true;
        } else {
            console.error('Lỗi khi push tin nhắn LINE tới ' + toId + ':', respText);
            logSystem_('LINE_PUSH_ERROR', 'To: ' + toId + '\nResponse: ' + respText + '\nPayload: ' + JSON.stringify(payload));
            return false;
        }
    } catch (e) {
        console.error('Lỗi ngoại lệ khi push tin nhắn tới ' + toId + ':', e);
        logSystem_('LINE_PUSH_EXCEPTION', 'To: ' + toId + '\nError: ' + e.message + '\nStack: ' + e.stack);
        try {
            PropertiesService.getScriptProperties().setProperty('LAST_PUSH_STATUS', JSON.stringify({
                timestamp: new Date().toISOString(),
                to: toId,
                error: e.toString()
            }));
        } catch (pe) { }
        return false;
    }
}

function sendDailyStatisticsTrigger() {
    sendDailyStatistics_();
}

function sendDailyStatistics_() {
    try {
        const statsMessage = getCouponStatistics_();
        if (!statsMessage) return;

        // Kiểm tra xem có phải khung giờ sáng (5h - 7h VN) không để gửi kèm cú pháp (cp)
        const vnHour = Number(Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "H"));
        let syntaxMessage = null;
        if (vnHour >= 5 && vnHour <= 7) {
            syntaxMessage = getSyntaxText_();
        }

        const props = PropertiesService.getScriptProperties();
        const chatIdsText = props.getProperty('ACTIVE_CHAT_IDS');
        const chatIds = JSON.parse(chatIdsText);
        for (let i = 0; i < chatIds.length; i++) {
            const chatId = chatIds[i];
            // Chỉ gửi cho nhóm/phòng chat (bắt đầu bằng C hoặc R), loại bỏ tin nhắn riêng (bắt đầu bằng U) cho cá nhân/admin
            if (chatId.startsWith('U')) {
                continue;
            }

            // Gửi thống kê trước
            pushText_(chatId, statsMessage);

            // Nếu là khung giờ sáng và lấy được cú pháp, gửi tiếp cú pháp sau 1 giây
            if (syntaxMessage) {
                Utilities.sleep(1000);
                pushText_(chatId, syntaxMessage);
            }
        }
        console.log('Đã gửi thống kê thành công tới các nhóm: ' + chatIdsText);
    } catch (err) {
        console.error('Lỗi trong sendDailyStatistics_:', err);
    }
}

function setupStatisticsTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (let i = 0; i < triggers.length; i++) {
        const funcName = triggers[i].getHandlerFunction();
        if (funcName === 'sendDailyStatisticsTrigger_' || funcName === 'sendDailyStatisticsTrigger' ||
            funcName === 'checkAndRemindAdminTrigger_' || funcName === 'checkAndRemindAdminTrigger' ||
            funcName === 'checkAndAutoApproveTrigger_' || funcName === 'checkAndAutoApproveTrigger' ||
            funcName === 'autoArchiveDataTrigger_' || funcName === 'autoArchiveDataTrigger') {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }

    const hours = [6, 15];
    const scriptTZ = Session.getScriptTimeZone();
    console.log('Múi giờ của Apps Script hiện tại: ' + scriptTZ);

    for (let i = 0; i < hours.length; i++) {
        const adjustedHour = getScriptHourForVNHour_(hours[i]);
        ScriptApp.newTrigger('sendDailyStatisticsTrigger')
            .timeBased()
            .everyDays(1)
            .atHour(adjustedHour)
            .create();
        console.log('Đã tạo trigger cho ' + hours[i] + 'h VN (Giờ Apps Script tương ứng: ' + adjustedHour + 'h)');
    }
    console.log('Đã khởi tạo thành công 2 trigger gửi thống kê theo múi giờ chuẩn VN.');

    // Khởi tạo trigger quét tự động duyệt chạy mỗi 5 phút
    ScriptApp.newTrigger('checkAndAutoApproveTrigger')
        .timeBased()
        .everyMinutes(5)
        .create();
    console.log('Đã khởi tạo trigger quét tự động duyệt chạy mỗi 5 phút.');

    // Khởi tạo trigger tự động dọn dẹp lưu trữ dữ liệu chạy lúc 2h sáng hàng ngày
    ScriptApp.newTrigger('autoArchiveDataTrigger')
        .timeBased()
        .everyDays(1)
        .atHour(2)
        .create();
    console.log('Đã khởi tạo trigger tự động dọn dẹp lưu trữ chạy lúc 2h sáng hàng ngày.');
}

function getScriptHourForVNHour_(vnHour) {
    const scriptTZ = Session.getScriptTimeZone();

    const getTZOffsetHours = function (tz) {
        const offsetStr = Utilities.formatDate(new Date(), tz, "Z"); // ví dụ: "+0700" hoặc "-0500"
        const isNegative = offsetStr.indexOf('-') === 0;
        const h = parseInt(offsetStr.substring(1, 3), 10) || 0;
        const m = parseInt(offsetStr.substring(3, 5), 10) || 0;
        const total = h + m / 60;
        return isNegative ? -total : total;
    };

    const vnOffset = 7;
    const scriptOffset = getTZOffsetHours(scriptTZ);
    const offsetHours = vnOffset - scriptOffset;

    let targetHour = vnHour - offsetHours;
    if (targetHour < 0) {
        targetHour += 24;
    }
    return Math.round(targetHour) % 24;
}


function releaseCoupon_(couponSheet, couponCode) {
    if (!couponCode) return;
    const lastRow = couponSheet.getLastRow();
    if (lastRow < 2) return;
    const values = couponSheet.getRange(2, COL_COUPON.MA_PHIEU, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
        if (String(values[i][0] || '').trim() === couponCode) {
            const row = i + 2;
            // Giải phóng nguyên hàng từ cột C đến G bằng 1 API call duy nhất
            couponSheet.getRange(row, 3, 1, 5).setValues([[
                CONFIG.COUPON_STATUS_UNUSED,
                '',
                '',
                '',
                ''
            ]]);
            console.log('Đã giải phóng mã PMH: ' + couponCode);
            break;
        }
    }
}

function getLineDisplayName_(userId, sourceId) {
    if (!userId) return 'Quản lý';
    const cache = CacheService.getScriptCache();
    const cacheKey = 'user_name_' + userId;
    const cachedName = cache.get(cacheKey);
    if (cachedName) {
        return cachedName;
    }

    const headers = { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN };
    const urls = [];

    // 1. Nếu tin nhắn từ Group chat
    if (sourceId && sourceId.startsWith('C')) {
        urls.push('https://api.line.me/v2/bot/group/' + sourceId + '/member/' + userId);
    }
    // 2. Nếu tin nhắn từ Room chat
    if (sourceId && sourceId.startsWith('R')) {
        urls.push('https://api.line.me/v2/bot/room/' + sourceId + '/member/' + userId);
    }
    // 3. API Profile cá nhân chung
    urls.push('https://api.line.me/v2/bot/profile/' + userId);

    for (let i = 0; i < urls.length; i++) {
        try {
            const response = UrlFetchApp.fetch(urls[i], {
                method: 'get',
                headers: headers,
                muteHttpExceptions: true
            });
            if (response.getResponseCode() === 200) {
                const data = JSON.parse(response.getContentText());
                const displayName = data.displayName;
                if (displayName) {
                    cache.put(cacheKey, displayName, 21600); // cache 6 tiếng
                    return displayName;
                }
            }
        } catch (e) {
            console.error('Lỗi khi gọi API lấy profile: ' + urls[i], e);
        }
    }
    // Nếu tất cả các cách lấy tên đều thất bại (ví dụ: User chưa kết bạn với Bot),
    // lưu tên mặc định "Quản lý" vào cache trong 1 giờ để tránh spam gọi API liên tục
    cache.put(cacheKey, 'Quản lý', 3600);
    return 'Quản lý';
}

function getUserDisplayNameFromHistory_(userId) {
    if (!userId) return '';
    try {
        const ss = getSpreadsheet_();

        // 1. Kiểm tra trong tab Admin trước
        const adminSheet = ss.getSheetByName('Admin');
        if (adminSheet) {
            const lastRow = adminSheet.getLastRow();
            if (lastRow >= 2) {
                const values = adminSheet.getRange(2, 1, lastRow - 1, 2).getValues();
                for (let i = 0; i < values.length; i++) {
                    if (String(values[i][1] || '').trim() === userId) {
                        return String(values[i][0] || '').trim();
                    }
                }
            }
        }

        // 2. Kiểm tra trong tab YeuCauPhatMa (quét 200 dòng gần nhất)
        const requestSheet = ss.getSheetByName(CONFIG.SHEET_REQUEST);
        if (requestSheet) {
            const lastRow = requestSheet.getLastRow();
            if (lastRow >= 2) {
                const startRow = Math.max(2, lastRow - 200);
                const numRows = lastRow - startRow + 1;
                const values = requestSheet.getRange(startRow, 1, numRows, 3).getValues();
                for (let i = values.length - 1; i >= 0; i--) {
                    if (String(values[i][COL_REQUEST.ID_NGUOI_GUI - 1] || '').trim() === userId) {
                        return String(values[i][COL_REQUEST.TEN_QUAN_LY - 1] || '').trim();
                    }
                }
            }
        }
    } catch (e) {
        console.error('Lỗi khi tìm tên hiển thị từ lịch sử:', e);
    }

    // 3. Fallback dùng API Profile của LINE
    return getLineDisplayName_(userId);
}

function pushMentionText_(toId, text, mentionUserId, quoteToken) {
    if (!toId || !text) return false;
    const url = 'https://api.line.me/v2/bot/message/push';

    const messageObj = {
        type: 'textV2',
        text: text,
        substitution: {
            'm1': {
                type: 'mention',
                mentionee: {
                    type: 'user',
                    userId: mentionUserId
                }
            }
        }
    };
    if (quoteToken) {
        messageObj.quoteToken = quoteToken;
    }

    const payload = {
        to: toId,
        messages: [messageObj]
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        const respCode = response.getResponseCode();
        if (respCode !== 200) {
            const respText = response.getContentText();
            console.error('Error pushMentionText_:', respText);
            logSystem_('LINE_PUSH_MENTION_ERROR', 'To: ' + toId + '\nResponse: ' + respText + '\nPayload: ' + JSON.stringify(payload));
        }
        return respCode === 200;
    } catch (e) {
        console.error('Lỗi khi push tin nhắn mention:', e);
        logSystem_('LINE_PUSH_MENTION_EXCEPTION', 'To: ' + toId + '\nError: ' + e.message + '\nStack: ' + e.stack);
        return false;
    }
}

function splitTextEntriesIntoMessages_(entries, maxCharLimit) {
    const messages = [];
    let currentTextParts = [];

    for (let i = 0; i < entries.length; i++) {
        const entryText = entries[i];
        const currentText = currentTextParts.join(NL + '━━━━━━' + NL);

        if (currentTextParts.length > 0 && currentText.length + 8 + entryText.length > maxCharLimit) {
            messages.push({
                type: 'text',
                text: currentText
            });
            currentTextParts = [];
        }
        currentTextParts.push(entryText);
    }

    if (currentTextParts.length > 0) {
        messages.push({
            type: 'text',
            text: currentTextParts.join(NL + '━━━━━━' + NL)
        });
    }

    return messages;
}


/**
 * Hàm tự động duyệt NGAY LẬP TỨC khi nhận yêu cầu mới
 * Được gọi sau khi lưu đơn vào sheet (sau khi giải phóng lock form)
 * Điều kiện: AUTO_APPROVE_ENABLED === 'true' VÀ pendingCount >= 5
 */
function tryImmediateAutoApprove_() {
    const props = PropertiesService.getScriptProperties();
    const autoEnabled = props.getProperty('AUTO_APPROVE_ENABLED') === 'true';
    if (!autoEnabled) return;

    const ss = getSpreadsheet_();
    const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);
    const lastRow = requestSheet.getLastRow();
    if (lastRow < 2) return;

    // Đếm nhanh số đơn pending
    const values = requestSheet.getRange(2, COL_REQUEST.TRANG_THAI, lastRow - 1, 1).getValues();
    let pendingCount = 0;
    for (let i = 0; i < values.length; i++) {
        if (isPendingStatus_(String(values[i][0] || '').trim())) {
            pendingCount++;
        }
    }

    console.log('[IMMEDIATE AUTO] pendingCount: ' + pendingCount);

    // Chỉ auto-approve khi >= 5 đơn chờ
    if (pendingCount < 5) return;

    const lock = LockService.getScriptLock();
    const gotLock = lock.tryLock(10000); // Đợi tối đa 10s
    if (!gotLock) {
        console.log('[IMMEDIATE AUTO] Không lấy được lock, bỏ qua (sẽ để trigger 5p xử lý).');
        return;
    }

    try {
        console.log('[IMMEDIATE AUTO] Bắt đầu auto-approve ngay với ' + pendingCount + ' đơn...');
        const result = approvePendingRequests_(null, 'ALL', 'BOT_AUTO', null);
        console.log('[IMMEDIATE AUTO] Kết quả: ' + (typeof result === 'string' ? result : JSON.stringify(result)));
    } catch (err) {
        console.error('[IMMEDIATE AUTO] Lỗi:', err);
    } finally {
        lock.releaseLock();
    }
}

function isPendingStatus_(statusStr) {
    if (!statusStr) return false;
    const s = String(statusStr).trim().toLowerCase();
    return s === 'chờ duyệt đơn' || s === 'chờ duyệt' || s.startsWith('chờ');
}

function isSentStatus_(statusStr) {
    if (!statusStr) return false;
    const s = String(statusStr).trim().toLowerCase();
    return s === 'đã phát mã' || s === 'đã gửi' || s === 'đã phát';
}

function checkAndAutoApproveTrigger() {
    checkAndAutoApprove_();
}

function checkAndRemindAdminTrigger() {
    checkAndAutoApprove_();
}

function checkAndAutoApprove_() {
    try {
        console.log('=== checkAndAutoApprove_ BẮT ĐẦU CHẠY === ' + new Date().toString());
        const props = PropertiesService.getScriptProperties();
        const autoEnabled = props.getProperty('AUTO_APPROVE_ENABLED') === 'true';

        // Nếu chế độ tự động duyệt đang tắt, không làm gì cả
        if (!autoEnabled) {
            console.log('Chế độ tự động duyệt đang TẮT. Bỏ qua.');
            return;
        }

        const ss = getSpreadsheet_();
        const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);
        const lastRow = requestSheet.getLastRow();
        console.log('Sheet YeuCauPhatMa lastRow: ' + lastRow);
        if (lastRow < 2) {
            console.log('Sheet trống (lastRow < 2). Kết thúc.');
            return;
        }

        // Chỉ đọc cột Trạng thái và Thời gian gửi để tối ưu hóa
        const values = requestSheet.getRange(2, 1, lastRow - 1, requestSheet.getLastColumn()).getValues();
        let pendingCount = 0;
        let oldestTime = null;

        for (let i = 0; i < values.length; i++) {
            const row = values[i];
            const status = String(row[COL_REQUEST.TRANG_THAI - 1] || '').trim();

            if (isPendingStatus_(status)) {
                pendingCount++;
                const timeVal = row[COL_REQUEST.THOI_GIAN_GUI - 1];
                if (timeVal) {
                    let parsedDate = null;
                    if (timeVal instanceof Date) {
                        parsedDate = timeVal;
                    } else {
                        const numericTime = Date.parse(timeVal);
                        if (!isNaN(numericTime)) {
                            parsedDate = new Date(numericTime);
                        }
                    }
                    if (parsedDate) {
                        if (!oldestTime || parsedDate < oldestTime) {
                            oldestTime = parsedDate;
                        }
                    }
                }
            }
        }

        console.log('Số đơn chờ duyệt (pendingCount): ' + pendingCount);
        if (pendingCount === 0) {
            console.log('Không có đơn chờ duyệt. Kết thúc.');
            return;
        }

        const now = new Date().getTime();
        const durationMs = oldestTime ? now - oldestTime.getTime() : 0;
        const durationMin = Math.round(durationMs / 60000 * 10) / 10;
        console.log('Đơn cũ nhất chờ: ' + durationMin + ' phút (oldestTime: ' + (oldestTime ? oldestTime.toString() : 'null') + ')');

        // Điều kiện tự động duyệt: Nếu tính năng tự động đang BẬT và có đơn chờ duyệt
        const shouldTrigger = autoEnabled && pendingCount > 0;
        console.log('shouldTrigger: ' + shouldTrigger + ' (autoEnabled: ' + autoEnabled + ', pendingCount: ' + pendingCount + ')');

        if (shouldTrigger) {
            // Tự động duyệt phát mã dưới quyền khóa đồng bộ tránh tranh chấp
            const lock = LockService.getScriptLock();
            const gotLock = lock.tryLock(30000);
            console.log('Lấy khóa đồng bộ (gotLock): ' + gotLock);
            if (gotLock) {
                try {
                    console.log('Bắt đầu gọi approvePendingRequests_(null, "ALL", "BOT_AUTO")...');
                    const result = approvePendingRequests_(null, 'ALL', 'BOT_AUTO', null);
                    console.log('BOT AUTO APPROVE RESULT: ' + (typeof result === 'string' ? result : JSON.stringify(result)));
                } catch (err) {
                    console.error('Lỗi khi BOT tự động duyệt đơn:', err);
                } finally {
                    lock.releaseLock();
                }
            } else {
                console.error('KHÔNG LẤY ĐƯỢC KHÓA ĐỒNG BỘ sau 30s! Bỏ qua lượt duyệt tự động này.');
            }
        } else {
            console.log('Chưa đủ điều kiện tự động duyệt (pendingCount < 5 VÀ thời gian chờ < 5 phút). Kết thúc.');
        }
        console.log('=== checkAndAutoApprove_ KẾT THÚC ===');
    } catch (e) {
        console.error('Lỗi trong checkAndAutoApprove_:', e);
    }
}

function handlePostbackEvent_(event) {
    try {
        const userId = event.source.userId;
        if (!isAdmin_(userId)) {
            replyText_(event.replyToken, '❌ Bạn không có quyền thực hiện.');
            return;
        }

        const postbackData = event.postback.data || '';
        const params = {};
        const pairs = postbackData.split('&');
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i].split('=');
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }

        const action = params.action;

        // Chống click trùng lặp (Anti double-click)
        const cache = CacheService.getScriptCache();
        const lockKey = 'pb_lock_' + action + '_' + userId;
        if (cache.get(lockKey)) {
            console.log('Chặn click đúp postback: ' + lockKey);
            return;
        }
        cache.put(lockKey, '1', 10); // Khóa trong 10 giây

        const ss = getSpreadsheet_();
        const requestSheet = getSheet_(ss, CONFIG.SHEET_REQUEST);

        if (action === 'approve_bulk_ok' || action === 'approve_bulk_all') {
            const command = action === 'approve_bulk_all' ? 'ALL' : 'OK';
            const sourceId = getSourceIdFromEvent_(event);
            const result = approvePendingRequests_(sourceId, command, userId, event.replyToken);
            if (result) {
                replyText_(event.replyToken, result);
            }
        }
    } catch (e) {
        console.error('Lỗi postback:', e);
    }
}

function checkAndSendLowStockAlert_(couponSheet, loaiPMHJustIssued) {
    try {
        const lastRow = couponSheet.getLastRow();
        if (lastRow < 2) return;

        const values = couponSheet.getRange(2, 1, lastRow - 1, 3).getValues();
        const counts = {};
        for (let i = 0; i < values.length; i++) {
            const row = values[i];
            const code = String(row[COL_COUPON.MA_PHIEU - 1] || '').trim();
            const type = String(row[COL_COUPON.LOAI_PHIEU - 1] || '').trim().toUpperCase();
            const status = String(row[COL_COUPON.TRANG_THAI - 1] || '').trim();

            if (!code || !type) continue;
            if (counts[type] === undefined) {
                counts[type] = 0;
            }
            if (status === '' || status === CONFIG.COUPON_STATUS_UNUSED) {
                counts[type]++;
            }
        }

        const lowStockItems = [];
        const keys = Object.keys(counts);
        let justIssuedIsLow = false;

        for (let i = 0; i < keys.length; i++) {
            const type = keys[i];
            const count = counts[type];
            if (count < CONFIG.LOW_STOCK_THRESHOLD) {
                lowStockItems.push({ type: type, count: count });
                if (type === loaiPMHJustIssued) {
                    justIssuedIsLow = true;
                }
            }
        }

        // Chỉ gửi cảnh báo nếu loại PMH vừa được phát có số lượng còn lại dưới ngưỡng
        if (!justIssuedIsLow) return;

        const ss = couponSheet.getParent();
        const pmhMapping = {};
        try {
            const syntaxSheet = ss.getSheetByName(CONFIG.SHEET_SYNTAX);
            if (syntaxSheet) {
                const syntaxText = String(syntaxSheet.getRange('A1').getValue() || '').trim();
                const mapping = extractPMHMappingFromSyntax_(syntaxText);
                for (let i = 0; i < mapping.length; i++) {
                    pmhMapping[mapping[i].typeCode.toUpperCase()] = mapping[i].displayName;
                }
            }
        } catch (err) {
            console.error('Lỗi tìm tên hiển thị khi cảnh báo hết mã:', err);
        }

        // Tạo nội dung tin nhắn cảnh báo gộp
        const msg =
            '⚠️ CẢNH BÁO: KHO SẮP HẾT MÃ PMH ⚠️' + NL +
            '━━━━━━' + NL +
            lowStockItems.map(item => {
                const dispName = pmhMapping[item.type] || item.type;
                return '• ' + dispName + ' (' + item.type + '): còn ' + item.count + ' mã!';
            }).join(NL) + NL + NL +
            '👉 Quản lý vui lòng xin phiếu hoặc kiểm tra tồn trước khi tư vấn!';

        const props = PropertiesService.getScriptProperties();
        const chatIdsText = props.getProperty('ACTIVE_CHAT_IDS');
        if (!chatIdsText) return;

        const chatIds = JSON.parse(chatIdsText);
        for (let i = 0; i < chatIds.length; i++) {
            const chatId = chatIds[i];
            if (chatId.startsWith('U')) continue; // Chỉ gửi lên nhóm chat
            pushText_(chatId, msg);
        }
        console.log('Đã gửi tin cảnh báo sắp hết mã gộp lên các nhóm.');
    } catch (e) {
        console.error('Lỗi khi kiểm tra và gửi cảnh báo hết mã gộp:', e);
    }
}

function autoArchiveDataTrigger() {
    autoArchiveData_();
}

function autoArchiveData_() {
    const KEEP_ROWS = 50; // Ngưỡng: chỉ dọn khi vượt quá số dòng này

    const lock = LockService.getScriptLock();
    const gotLock = lock.tryLock(60000); // Đợi tối đa 1 phút
    if (!gotLock) return;

    try {
        const ss = getSpreadsheet_();

        // 1. DỌN DẸP TAB COUPON — chỉ dọn khi tổng dòng > KEEP_ROWS
        const couponSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_COUPON);
        if (couponSheet) {
            const lastRow = couponSheet.getLastRow();
            const dataRows = lastRow - 1; // Trừ header
            console.log('[DỌN DẸP] Coupon: ' + dataRows + ' dòng dữ liệu (ngưỡng: ' + KEEP_ROWS + ')');

            if (dataRows > KEEP_ROWS) {
                let archiveSheet = getSheetByNameNormalized_(ss, 'Coupon_LichSu');
                if (!archiveSheet) {
                    archiveSheet = ss.insertSheet('Coupon_LichSu');
                    archiveSheet.appendRow(['Mã Phiếu', 'Loại Phiếu', 'Trạng Thái', 'Mã Kho', 'MĐH', 'Người Nhận', 'ID Người Nhận']);
                    archiveSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
                }

                const values = couponSheet.getRange(2, 1, dataRows, 7).getValues();
                const rowsToKeep = [];
                const rowsToArchive = [];

                for (let i = 0; i < values.length; i++) {
                    const status = String(values[i][COL_COUPON.TRANG_THAI - 1] || '').trim();
                    if (status === CONFIG.COUPON_STATUS_SENT) {
                        rowsToArchive.push(values[i]);
                    } else {
                        rowsToKeep.push(values[i]);
                    }
                }

                // Chỉ thực sự dọn nếu sau khi lọc, số dòng giữ lại <= KEEP_ROWS
                if (rowsToArchive.length > 0 && rowsToKeep.length <= KEEP_ROWS) {
                    const archiveLastRow = archiveSheet.getLastRow();
                    archiveSheet.getRange(archiveLastRow + 1, 1, rowsToArchive.length, 7).setValues(rowsToArchive);

                    couponSheet.getRange(2, 1, dataRows, 7).clearContent();
                    if (rowsToKeep.length > 0) {
                        couponSheet.getRange(2, 1, rowsToKeep.length, 7).setValues(rowsToKeep);
                    }
                    // Xóa hàng thừa bên dưới
                    if (dataRows > rowsToKeep.length && rowsToKeep.length + 1 < lastRow) {
                        couponSheet.deleteRows(rowsToKeep.length + 2, dataRows - rowsToKeep.length);
                    }
                    console.log('[DỌN DẸP] Đã lưu trữ ' + rowsToArchive.length + ' mã Coupon đã gửi. Còn giữ lại: ' + rowsToKeep.length + ' dòng.');
                } else {
                    console.log('[DỌN DẸP] Coupon: Không cần dọn (archive=' + rowsToArchive.length + ', keep=' + rowsToKeep.length + ')');
                }
            }
        }

        // 2. DỌN DẸP TAB YEUCAUPHATMA — chỉ dọn khi tổng dòng > KEEP_ROWS
        const requestSheet = getSheetByNameNormalized_(ss, CONFIG.SHEET_REQUEST);
        if (requestSheet) {
            const lastRow = requestSheet.getLastRow();
            const dataRows = lastRow - 1;
            console.log('[DỌN DẸP] YeuCauPhatMa: ' + dataRows + ' dòng dữ liệu (ngưỡng: ' + KEEP_ROWS + ')');

            if (dataRows > KEEP_ROWS) {
                let archiveSheet = getSheetByNameNormalized_(ss, 'YeuCauPhatMa_LichSu');
                if (!archiveSheet) {
                    archiveSheet = ss.insertSheet('YeuCauPhatMa_LichSu');
                    archiveSheet.appendRow(['ID Tin Nhắn', 'ID Người Gửi', 'Tên Quản Lý', 'Loại PMH', 'Mã Kho', 'MĐH', 'Trạng Thái', 'Thời Gian Gửi', 'Mã Phiếu Đã Phát', 'Ghi Chú', 'Quote Token']);
                    archiveSheet.getRange(1, 1, 1, 11).setFontWeight('bold');
                }

                const colCount = requestSheet.getLastColumn() || 11;
                const values = requestSheet.getRange(2, 1, dataRows, colCount).getValues();
                const rowsToKeep = [];
                const rowsToArchive = [];

                for (let i = 0; i < values.length; i++) {
                    const status = String(values[i][COL_REQUEST.TRANG_THAI - 1] || '').trim();
                    if (isSentStatus_(status) || status.startsWith('Hủy') || status.toLowerCase().startsWith('lỗi') || status.toLowerCase().startsWith('hết')) {
                        rowsToArchive.push(values[i].slice(0, 11)); // Chỉ lưu 11 cột chuẩn
                    } else {
                        rowsToKeep.push(values[i]);
                    }
                }

                if (rowsToArchive.length > 0) {
                    const archiveLastRow = archiveSheet.getLastRow();
                    archiveSheet.getRange(archiveLastRow + 1, 1, rowsToArchive.length, 11).setValues(rowsToArchive);

                    requestSheet.getRange(2, 1, dataRows, colCount).clearContent();
                    if (rowsToKeep.length > 0) {
                        requestSheet.getRange(2, 1, rowsToKeep.length, colCount).setValues(rowsToKeep);
                    }
                    // Xóa hàng thừa bên dưới
                    if (dataRows > rowsToKeep.length && rowsToKeep.length + 1 < lastRow) {
                        requestSheet.deleteRows(rowsToKeep.length + 2, dataRows - rowsToKeep.length);
                    }
                    console.log('[DỌN DẸP] Đã lưu trữ ' + rowsToArchive.length + ' yêu cầu đã xử lý. Còn giữ lại: ' + rowsToKeep.length + ' dòng.');
                } else {
                    console.log('[DỌN DẸP] YeuCauPhatMa: Không có dòng nào cần dọn.');
                }
            }
        }
    } catch (e) {
        console.error('Lỗi khi thực hiện tự động dọn dẹp lưu trữ dữ liệu:', e);
    } finally {
        lock.releaseLock();
    }
}

function logSystem_(tag, message) {
    try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        let sheet = getSheetByNameNormalized_(ss, 'SystemLog');
        if (!sheet) {
            sheet = ss.insertSheet('SystemLog');
            sheet.appendRow(['Thời gian', 'Tag', 'Nội dung']);
            sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
        }

        // Giới hạn số dòng của SystemLog để tránh tràn sheet (max 500 dòng)
        const lastRow = sheet.getLastRow();
        if (lastRow > 500) {
            sheet.deleteRows(2, 200); // Xóa bớt 200 dòng cũ
        }

        sheet.appendRow([new Date(), tag, message]);
    } catch (e) {
        console.error('Lỗi khi ghi SystemLog:', e);
    }
}

function markMessageAsRead_(chatId, markAsReadToken) {
    if (!chatId || !markAsReadToken) return;
    const url = 'https://api.line.me/v2/bot/chat/markAsRead';
    const payload = {
        chatId: chatId,
        markAsReadToken: markAsReadToken
    };
    const options = {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + CONFIG.CHANNEL_ACCESS_TOKEN },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() !== 200) {
            console.error('Lỗi khi markAsRead:', response.getContentText());
        }
    } catch (e) {
        console.error('Lỗi ngoại lệ khi markAsRead:', e);
    }
}