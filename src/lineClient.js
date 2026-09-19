const line = require('@line/bot-sdk');
const CONFIG = require('./config');

const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: CONFIG.CHANNEL_ACCESS_TOKEN
});

const lineClient = {
    client,

    /**
     * Bàn phím nút bấm thao tác nhanh (Quick Reply Menu) cho chat 1-1 với BOT
     */
    /**
     * Bàn phím nút bấm thao tác nhanh (Quick Reply Menu) cho chat 1-1 với BOT
     * Gồm 6 phím tương tác 1 chạm: Cú pháp, Tồn kho, Lịch sử, Tra cứu MĐH, Quyền Admin, Web Quản trị
     */
    getQuickReplyMenu(isAdmin = false) {
        const items = [
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '📋 Lấy Form (cp)',
                    text: 'cp'
                }
            },
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '📊 Tồn Kho (tk)',
                    text: 'tk'
                }
            },
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '📜 Lịch Sử (ls)',
                    text: 'ls'
                }
            },
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '🔍 Tra Cứu MĐH',
                    text: 'check '
                }
            }
        ];

        if (isAdmin) {
            items.push(
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '👑 Quyền Admin',
                        text: 'admin'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '🌐 Web Quản Trị',
                        text: 'web'
                    }
                }
            );
        }

        return { items };
    },

    /**
     * Trả lời tin nhắn người dùng bằng official @line/bot-sdk (hỗ trợ trích dẫn quoteToken và quickReply)
     */
    async replyText(replyToken, text, quoteToken = null, quickReply = null) {
        if (!replyToken || !text) return false;

        const cleanText = String(text).trim();
        const messageObj = {
            type: 'text',
            text: cleanText
        };

        if (quoteToken && typeof quoteToken === 'string' && quoteToken.trim()) {
            messageObj.quoteToken = quoteToken.trim();
        }

        if (quickReply) {
            messageObj.quickReply = quickReply;
        }

        try {
            await client.replyMessage({
                replyToken: replyToken,
                messages: [messageObj]
            });
            console.log('[LINE] Phản hồi tin nhắn thành công qua @line/bot-sdk!');
            return true;
        } catch (error) {
            const Firebase = require('./firebase');
            const errData = error?.body || (error.response ? JSON.stringify(error.response.data) : (error.message || error));
            console.error('[LINE] Lỗi replyText:', errData);
            Firebase.logSystem('REPLY_ERROR', { error: errData, token: CONFIG.CHANNEL_ACCESS_TOKEN.slice(0, 10) }).catch(() => {});
            return false;
        }
    },

    /**
     * Trả lời bằng LINE Flex Message Card đồ hoạ đẹp mắt (kèm fallback text tự động)
     */
    async replyFlex(replyToken, altText, flexContents, quoteToken = null, quickReply = null) {
        if (!replyToken || !flexContents) return false;

        const messageObj = {
            type: 'flex',
            altText: String(altText || 'Thông báo mã PMH').slice(0, 400),
            contents: flexContents
        };

        if (quoteToken && typeof quoteToken === 'string' && quoteToken.trim()) {
            messageObj.quoteToken = quoteToken.trim();
        }

        if (quickReply) {
            messageObj.quickReply = quickReply;
        }

        try {
            await client.replyMessage({
                replyToken: replyToken,
                messages: [messageObj]
            });
            console.log('[LINE] Phản hồi Flex Message Card thành công!');
            return true;
        } catch (error) {
            const errData = error?.body || (error.response ? JSON.stringify(error.response.data) : (error.message || error));
            console.error('[LINE] Lỗi replyFlex, tự động fallback về tin nhắn Text:', errData);
            if (altText) {
                return await this.replyText(replyToken, altText, quoteToken, quickReply);
            }
            return false;
        }
    },

    /**
     * Chủ động gửi tin nhắn Flex Message tới User hoặc Group
     */
    async pushFlex(toId, altText, flexContents) {
        if (!toId || !flexContents) return false;

        const messageObj = {
            type: 'flex',
            altText: String(altText || 'Thông báo mã PMH').slice(0, 400),
            contents: flexContents
        };

        try {
            await client.pushMessage({
                to: toId,
                messages: [messageObj]
            });
            return true;
        } catch (error) {
            console.error('[LINE] Lỗi pushFlex, fallback sang pushText:', error.message);
            if (altText) {
                return await this.pushText(toId, altText);
            }
            return false;
        }
    },

    /**
     * Tạo đối tượng giao diện Flex Card cấp mã PMH
     */
    createCouponFlexCard({ displayName, loaiPMH, code, mdh, maKho, stockHint, isReplaced = false, oldCode = '', oldType = '', oldTime = '' }) {
        const isSwap = !!isReplaced;
        const headerColor = isSwap ? '#EA580C' : '#4F46E5';
        const headerTitle = isSwap ? '🔄 ĐỔI MÃ PMH (TRÙNG MĐH)' : '🎁 MÃ PMH CỦA BẠN';

        const bodyContents = [
            {
                type: 'text',
                text: displayName || 'Quản lý',
                weight: 'bold',
                size: 'md',
                color: '#0F172A'
            }
        ];

        if (isSwap && oldCode) {
            bodyContents.push({
                type: 'box',
                layout: 'vertical',
                margin: 'sm',
                backgroundColor: '#FEF2F2',
                cornerRadius: 'md',
                paddingAll: '8px',
                contents: [
                    {
                        type: 'text',
                        text: `⚠️ Mã cũ "${oldCode}" (${oldType || loaiPMH}) cấp lúc ${oldTime || 'trước đó'} đã được THU HỒI về kho.`,
                        size: 'xxs',
                        color: '#B91C1C',
                        wrap: true
                    }
                ]
            });
        }

        bodyContents.push(
            {
                type: 'separator',
                margin: 'md'
            },
            {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                backgroundColor: '#F8FAFC',
                cornerRadius: 'md',
                borderWidth: '1px',
                borderColor: '#CBD5E1',
                paddingAll: '12px',
                alignItems: 'center',
                contents: [
                    {
                        type: 'text',
                        text: `➜ PMH ${loaiPMH}`,
                        weight: 'bold',
                        size: 'xs',
                        color: '#64748B'
                    },
                    {
                        type: 'text',
                        text: String(code || '').trim(),
                        weight: 'bold',
                        size: 'xl',
                        color: '#1E293B',
                        align: 'center',
                        margin: 'xs'
                    }
                ]
            },
            {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'xs',
                contents: [
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'Mã đơn:', color: '#64748B', size: 'xxs', flex: 3 },
                            { type: 'text', text: String(mdh || '-'), color: '#334155', size: 'xs', weight: 'bold', flex: 7 }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            { type: 'text', text: 'Kho hàng:', color: '#64748B', size: 'xxs', flex: 3 },
                            { type: 'text', text: String(maKho || '-'), color: '#334155', size: 'xs', weight: 'bold', flex: 7 }
                        ]
                    }
                ]
            }
        );

        if (stockHint && String(stockHint).trim()) {
            bodyContents.push({
                type: 'text',
                text: String(stockHint).trim(),
                size: 'xxs',
                color: '#D97706',
                wrap: true,
                margin: 'sm'
            });
        }

        return {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: headerColor,
                paddingAll: '10px',
                contents: [
                    {
                        type: 'text',
                        text: headerTitle,
                        color: '#FFFFFF',
                        weight: 'bold',
                        size: 'sm'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '14px',
                contents: bodyContents
            }
        };
    },

    /**
     * Tạo Thẻ Flex Menu 6 ô tương tác 1 chạm (Trải nghiệm người dùng cao cấp)
     */
    createMainMenuFlexCard(isAdmin = false) {
        return {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#312E81',
                paddingAll: '16px',
                contents: [
                    {
                        type: 'text',
                        text: '⚡ MENU TIỆN ÍCH 1 CHẠM',
                        weight: 'bold',
                        color: '#FFFFFF',
                        size: 'md'
                    },
                    {
                        type: 'text',
                        text: 'Hệ thống Quản lý & Cấp mã PMH Siêu tốc',
                        color: '#C7D2FE',
                        size: 'xxs',
                        margin: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '16px',
                contents: [
                    // Hàng 1: Form & Tồn kho
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#EEF2FF',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Lấy Cú Pháp', text: 'cp' },
                                contents: [
                                    { type: 'text', text: '📋', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Lấy Cú Pháp', size: 'xs', weight: 'bold', color: '#4338CA', align: 'center', margin: 'xs' },
                                    { type: 'text', text: 'Mẫu form đăng ký', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#ECFDF5',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Tồn Kho', text: 'tk' },
                                contents: [
                                    { type: 'text', text: '📊', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Tồn Kho PMH', size: 'xs', weight: 'bold', color: '#059669', align: 'center', margin: 'xs' },
                                    { type: 'text', text: 'Kiểm tra số lượng', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            }
                        ]
                    },
                    // Hàng 2: Lịch sử & Tra cứu MĐH
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#FEF3C7',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Lịch Sử', text: 'ls' },
                                contents: [
                                    { type: 'text', text: '📜', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Lịch Sử Hôm Nay', size: 'xs', weight: 'bold', color: '#D97706', align: 'center', margin: 'xs' },
                                    { type: 'text', text: 'Mã đã nhận trong ngày', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#F0FDF4',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Tra Cứu MĐH', text: 'check ' },
                                contents: [
                                    { type: 'text', text: '🔍', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Tra Cứu MĐH', size: 'xs', weight: 'bold', color: '#0D9488', align: 'center', margin: 'xs' },
                                    { type: 'text', text: 'Kiểm tra trạng thái đơn', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            }
                        ]
                    },
                    // Hàng 3: Quyền Admin & Web Quản Trị
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'md',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#FDF2F8',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Admin', text: 'admin' },
                                contents: [
                                    { type: 'text', text: '👑', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Quyền Admin', size: 'xs', weight: 'bold', color: '#DB2777', align: 'center', margin: 'xs' },
                                    { type: 'text', text: isAdmin ? 'Đang kích hoạt 🟢' : 'Chỉ dành cho Admin', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: '#F5F3FF',
                                cornerRadius: 'md',
                                paddingAll: '12px',
                                flex: 1,
                                action: { type: 'message', label: 'Web Quản Trị', text: 'web' },
                                contents: [
                                    { type: 'text', text: '🌐', size: 'lg', align: 'center' },
                                    { type: 'text', text: 'Web Quản Trị', size: 'xs', weight: 'bold', color: '#7C3AED', align: 'center', margin: 'xs' },
                                    { type: 'text', text: isAdmin ? 'Mở Dashboard 🔗' : 'Chỉ dành cho Admin', size: 'xxs', color: '#6B7280', align: 'center' }
                                ]
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '10px',
                contents: [
                    {
                        type: 'text',
                        text: '💡 Chạm trực tiếp vào từng ô hoặc phím bên dưới để thao tác nhanh',
                        size: 'xxs',
                        color: '#94A3B8',
                        align: 'center'
                    }
                ]
            }
        };
    },

    /**
     * Tạo Thẻ Flex Card Tra cứu Đơn Hàng (Chi tiết hành trình & mã PMH)
     */
    createOrderLookupFlexCard({
        mdh,
        maKho,
        displayName,
        loaiPMH,
        currentCode,
        status,
        issuedTime,
        approvedBy,
        isReplaced = false,
        oldCode = '',
        oldType = '',
        oldTime = ''
    }) {
        const isSwapped = !!isReplaced && !!oldCode;
        const isOutOfStock = status === 'Hết mã';
        const isPending = status === 'Chờ duyệt đơn';

        let statusBadgeColor = '#16A34A';
        let statusBadgeBg = '#DCFCE7';
        let statusTitle = '✅ ĐÃ CẤP MÃ';

        if (isSwapped) {
            statusBadgeColor = '#D97706';
            statusBadgeBg = '#FEF3C7';
            statusTitle = '🔄 ĐÃ ĐỔI MÃ MỚI';
        } else if (isOutOfStock) {
            statusBadgeColor = '#DC2626';
            statusBadgeBg = '#FEE2E2';
            statusTitle = '❌ HẾT MÃ';
        } else if (isPending) {
            statusBadgeColor = '#4B5563';
            statusBadgeBg = '#F3F4F6';
            statusTitle = '⏳ ĐANG CHỜ DUYỆT';
        }

        const bodyContents = [
            // Thông tin quản lý & mã kho
            {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                contents: [
                    { type: 'text', text: '👤 Quản lý:', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: String(displayName || 'Quản lý'), size: 'xs', weight: 'bold', color: '#1E293B', flex: 7 }
                ]
            },
            {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                margin: 'xs',
                contents: [
                    { type: 'text', text: '🏢 Siêu thị:', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: `Kho ${maKho || '-'}`, size: 'xs', color: '#334155', weight: 'bold', flex: 7 }
                ]
            },
            {
                type: 'box',
                layout: 'baseline',
                spacing: 'sm',
                margin: 'xs',
                contents: [
                    { type: 'text', text: '🏷️ Loại PMH:', size: 'xs', color: '#64748B', flex: 3 },
                    { type: 'text', text: String(loaiPMH || 'PMH'), size: 'xs', color: '#4338CA', weight: 'bold', flex: 7 }
                ]
            },
            {
                type: 'separator',
                margin: 'md'
            },
            // Thẻ mã PMH hiện tại
            {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#F8FAFC',
                borderWidth: '1px',
                borderColor: '#CBD5E1',
                cornerRadius: 'md',
                paddingAll: '12px',
                margin: 'md',
                alignItems: 'center',
                contents: [
                    {
                        type: 'text',
                        text: 'MÃ PMH CỦA ĐƠN HÀNG:',
                        size: 'xxs',
                        color: '#64748B',
                        weight: 'bold'
                    },
                    {
                        type: 'text',
                        text: String(currentCode || 'CHƯA CẤP MÃ').trim(),
                        size: 'xl',
                        weight: 'bold',
                        color: '#0F172A',
                        margin: 'xs'
                    },
                    {
                        type: 'text',
                        text: `Cấp lúc: ${issuedTime || '--:--'} • Duyệt bởi: ${approvedBy || 'Hệ thống'}`,
                        size: 'xxs',
                        color: '#94A3B8',
                        margin: 'xs'
                    }
                ]
            }
        ];

        // Nếu đã từng bị thu hồi đổi mã mới -> Thêm box lịch sử thu hồi
        if (isSwapped) {
            bodyContents.push({
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#FEF2F2',
                cornerRadius: 'md',
                paddingAll: '10px',
                margin: 'md',
                contents: [
                    {
                        type: 'text',
                        text: '⚠️ LỊCH SỬ THU HỒI & ĐỔI MÃ:',
                        size: 'xxs',
                        weight: 'bold',
                        color: '#B91C1C'
                    },
                    {
                        type: 'text',
                        text: `• Mã ban đầu: "${oldCode}" (${oldType || loaiPMH})`,
                        size: 'xxs',
                        color: '#7F1D1D',
                        margin: 'xs'
                    },
                    {
                        type: 'text',
                        text: `• Đã thu hồi lúc: ${oldTime || 'trước đó'}`,
                        size: 'xxs',
                        color: '#7F1D1D'
                    },
                    {
                        type: 'text',
                        text: `• Mã mới hiện tại: "${currentCode}"`,
                        size: 'xxs',
                        weight: 'bold',
                        color: '#15803D'
                    }
                ]
            });
        }

        return {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#4338CA',
                paddingAll: '14px',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        alignItems: 'center',
                        contents: [
                            {
                                type: 'text',
                                text: '🔍 THÔNG TIN ĐƠN HÀNG',
                                color: '#FFFFFF',
                                weight: 'bold',
                                size: 'sm',
                                flex: 7
                            },
                            {
                                type: 'box',
                                layout: 'vertical',
                                backgroundColor: statusBadgeBg,
                                cornerRadius: 'sm',
                                paddingStart: '6px',
                                paddingEnd: '6px',
                                paddingTop: '2px',
                                paddingBottom: '2px',
                                flex: 4,
                                contents: [
                                    {
                                        type: 'text',
                                        text: statusTitle,
                                        color: statusBadgeColor,
                                        size: 'xxs',
                                        weight: 'bold',
                                        align: 'center'
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: 'text',
                        text: `MĐH: ${mdh || '-'}`,
                        color: '#E0E7FF',
                        size: 'xs',
                        margin: 'xs'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '14px',
                contents: bodyContents
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '8px',
                contents: [
                    {
                        type: 'text',
                        text: '💡 Gõ "ls" để xem tất cả lịch sử nhận mã hôm nay của bạn',
                        size: 'xxs',
                        color: '#94A3B8',
                        align: 'center'
                    }
                ]
            }
        };
    },

    /**
     * Trả lời nhiều tin nhắn cùng lúc (Text + Danh sách Ảnh) qua @line/bot-sdk
     */
    async replyMessages(replyToken, messages) {
        if (!replyToken || !messages || !Array.isArray(messages) || messages.length === 0) {
            return false;
        }

        try {
            await client.replyMessage({
                replyToken: replyToken,
                messages: messages.slice(0, 5) // Giới hạn tối đa 5 tin nhắn theo quy định LINE API
            });
            console.log(`[LINE] Phản hồi thành công ${messages.length} tin nhắn qua @line/bot-sdk!`);
            return true;
        } catch (error) {
            const Firebase = require('./firebase');
            const errData = error?.body || (error.response ? JSON.stringify(error.response.data) : (error.message || error));
            console.error('[LINE] Lỗi replyMessages:', errData);
            Firebase.logSystem('REPLY_MESSAGES_ERROR', { error: errData }).catch(() => {});
            return false;
        }
    },

    /**
     * Gửi chủ động tin nhắn (Push Message) tới User hoặc Group
     */
    async pushText(toId, text) {
        if (!toId || !text) return false;

        const cleanText = String(text).trim();
        try {
            await client.pushMessage({
                to: toId,
                messages: [
                    {
                        type: 'text',
                        text: cleanText
                    }
                ]
            });
            return true;
        } catch (error) {
            const errData = error.response ? JSON.stringify(error.response.data) : (error.message || error);
            console.error('[LINE] Lỗi pushText:', errData);
            return false;
        }
    },

    /**
     * Lấy tên hiển thị (Display Name) của User từ LINE API
     */
    async getDisplayName(userId, groupId = null) {
        if (!userId) return 'Quản lý';

        try {
            if (groupId && groupId.startsWith('C')) {
                const member = await client.getGroupMemberProfile(groupId, userId).catch(() => null);
                if (member && member.displayName) {
                    return member.displayName;
                }
            } else if (groupId && groupId.startsWith('R')) {
                const member = await client.getRoomMemberProfile(groupId, userId).catch(() => null);
                if (member && member.displayName) {
                    return member.displayName;
                }
            }

            const profile = await client.getProfile(userId).catch(() => null);
            if (profile && profile.displayName) {
                return profile.displayName;
            }
        } catch (error) {
            // bỏ qua lỗi
        }

        return 'Quản lý';
    },

    /**
     * Lấy thông tin tóm tắt của nhóm (Tên nhóm, Avatar) từ LINE API
     */
    async getGroupSummary(groupId) {
        if (!groupId || !groupId.startsWith('C')) return null;

        try {
            const summary = await client.getGroupSummary(groupId);
            return summary;
        } catch (error) {
            // Không log error ồn ào nếu bot chưa kịp load cache hoặc là room
            return null;
        }
    },

    /**
     * Đánh dấu tin nhắn đã đọc trên LINE
     */
    async markAsRead(chatId, markAsReadToken) {
        return true;
    }
};

module.exports = lineClient;
