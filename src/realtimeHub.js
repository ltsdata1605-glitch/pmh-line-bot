/**
 * REALTIME EVENT HUB (Server-Sent Events)
 * Phát sự kiện trực tiếp tới các trình duyệt Web Admin đang mở
 */
const sseClients = new Set();

const realtimeHub = {
    /**
     * Đăng ký kết nối SSE client
     */
    addClient(res) {
        sseClients.add(res);
    },

    /**
     * Hủy kết nối SSE client
     */
    removeClient(res) {
        sseClients.delete(res);
    },

    /**
     * Lấy số lượng client đang kết nối
     */
    getClientCount() {
        return sseClients.size;
    },

    /**
     * Bắn sự kiện realtime tới toàn bộ Web Admin
     * @param {string} eventType - Tên sự kiện: 'coupon_sent', 'request_pending', 'coupon_revoked', 'stock_updated'
     * @param {object} data - Dữ liệu kèm theo
     */
    broadcast(eventType, data = {}) {
        if (sseClients.size === 0) return;

        const payload = JSON.stringify({
            event: eventType,
            data: data,
            timestamp: new Date().toISOString()
        });
        const message = `event: ${eventType}\ndata: ${payload}\n\n`;

        sseClients.forEach(client => {
            try {
                client.write(message);
            } catch (e) {
                sseClients.delete(client);
            }
        });
    }
};

module.exports = realtimeHub;
