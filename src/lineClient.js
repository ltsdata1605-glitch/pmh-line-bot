const line = require('@line/bot-sdk');
const CONFIG = require('./config');

const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: CONFIG.CHANNEL_ACCESS_TOKEN
});

const lineClient = {
    client,

    /**
     * Trả lời tin nhắn người dùng bằng official @line/bot-sdk
     */
    async replyText(replyToken, text) {
        if (!replyToken || !text) return false;

        const cleanText = String(text).trim();
        try {
            await client.replyMessage({
                replyToken: replyToken,
                messages: [
                    {
                        type: 'text',
                        text: cleanText
                    }
                ]
            });
            console.log('[LINE] Phản hồi tin nhắn thành công qua @line/bot-sdk!');
            return true;
        } catch (error) {
            const errData = error.response ? JSON.stringify(error.response.data) : (error.message || error);
            console.error('[LINE] Lỗi replyText:', errData);
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
     * Đánh dấu tin nhắn đã đọc trên LINE
     */
    async markAsRead(chatId, markAsReadToken) {
        return true;
    }
};

module.exports = lineClient;
