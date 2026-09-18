const axios = require('axios');
const CONFIG = require('./config');

const LINE_API_URL = 'https://api.line.me/v2/bot';

const lineClient = {
    /**
     * Trả lời tin nhắn người dùng (có hỗ trợ quoteToken và mention)
     */
    async replyText(replyToken, text, quoteToken = null, mentionUserId = null) {
        if (!replyToken || !text) return;

        const messageObj = {
            type: 'text',
            text: String(text).trim()
        };

        if (quoteToken) {
            messageObj.quoteToken = quoteToken;
        }

        if (mentionUserId) {
            // Nếu muốn mention user
            const mentionText = '@User ';
            messageObj.text = mentionText + messageObj.text;
            messageObj.emojis = undefined;
            messageObj.mention = {
                mentionees: [
                    {
                        index: 0,
                        length: mentionText.length - 1,
                        userId: mentionUserId
                    }
                ]
            };
        }

        const payload = {
            replyToken: replyToken,
            messages: [messageObj]
        };

        try {
            await axios.post(`${LINE_API_URL}/message/reply`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}`
                },
                timeout: 8000
            });
            return true;
        } catch (error) {
            const errData = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('[LINE] Lỗi replyText:', errData);
            return false;
        }
    },

    /**
     * Gửi chủ động tin nhắn (Push Message) tới User hoặc Group
     */
    async pushText(toId, text) {
        if (!toId || !text) return;

        const payload = {
            to: toId,
            messages: [
                {
                    type: 'text',
                    text: String(text).trim()
                }
            ]
        };

        try {
            await axios.post(`${LINE_API_URL}/message/push`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}`
                },
                timeout: 8000
            });
            return true;
        } catch (error) {
            const errData = error.response ? JSON.stringify(error.response.data) : error.message;
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
            let url = `${LINE_API_URL}/profile/${userId}`;
            if (groupId && groupId.startsWith('C')) {
                url = `${LINE_API_URL}/group/${groupId}/member/${userId}`;
            } else if (groupId && groupId.startsWith('R')) {
                url = `${LINE_API_URL}/room/${groupId}/member/${userId}`;
            }

            const res = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}`
                },
                timeout: 5000
            });

            if (res.data && res.data.displayName) {
                return res.data.displayName;
            }
        } catch (error) {
            // Nếu không lấy được từ group member thì thử lấy từ profile thông thường
            if (groupId) {
                try {
                    const fallbackRes = await axios.get(`${LINE_API_URL}/profile/${userId}`, {
                        headers: {
                            'Authorization': `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}`
                        },
                        timeout: 3000
                    });
                    if (fallbackRes.data && fallbackRes.data.displayName) {
                        return fallbackRes.data.displayName;
                    }
                } catch (e) {}
            }
        }

        return 'Quản lý';
    },

    /**
     * Đánh dấu tin nhắn đã đọc trên LINE
     */
    async markAsRead(chatId, markAsReadToken) {
        if (!chatId || !markAsReadToken) return;
        try {
            await axios.post(`${LINE_API_URL}/chat/markAsRead`, {
                chatId: chatId,
                markAsReadToken: markAsReadToken
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.CHANNEL_ACCESS_TOKEN}`
                },
                timeout: 4000
            });
        } catch (e) {}
    }
};

module.exports = lineClient;
