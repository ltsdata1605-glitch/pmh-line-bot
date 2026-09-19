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
    getQuickReplyMenu() {
        return {
            items: [
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '📋 Lấy mẫu form (cp)',
                        text: 'cp'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '📊 Xem tồn kho (tk)',
                        text: 'tk'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '📜 Lịch sử hôm nay (ls)',
                        text: 'ls'
                    }
                },
                {
                    type: 'action',
                    action: {
                        type: 'message',
                        label: '❓ Hướng dẫn (hd)',
                        text: 'hd'
                    }
                }
            ]
        };
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
