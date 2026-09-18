const axios = require('axios');
const CONFIG = require('./config');

const dbUrl = CONFIG.FIREBASE_DB_URL;

const Firebase = {
    /**
     * Lấy cú pháp từ Firebase
     */
    async getSyntax() {
        try {
            const res = await axios.get(`${dbUrl}/syntax.json`, { timeout: 5000 });
            if (res.data && res.data.text) {
                return String(res.data.text).trim();
            }
            return null;
        } catch (error) {
            console.error('[Firebase] Lỗi getSyntax:', error.message);
            return null;
        }
    },

    /**
     * Cập nhật cú pháp trên Firebase
     */
    async updateSyntax(text, updatedBy = 'LINE_BOT') {
        try {
            await axios.put(`${dbUrl}/syntax.json`, {
                text: String(text).trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: updatedBy
            }, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi updateSyntax:', error.message);
            return false;
        }
    },

    /**
     * Lấy toàn bộ danh sách coupon
     */
    async getCoupons() {
        try {
            const res = await axios.get(`${dbUrl}/coupons.json`, { timeout: 8000 });
            const data = res.data;
            if (!data) return [];
            if (Array.isArray(data)) return data.filter(Boolean);
            if (typeof data === 'object') return Object.values(data).filter(Boolean);
            return [];
        } catch (error) {
            console.error('[Firebase] Lỗi getCoupons:', error.message);
            return [];
        }
    },

    /**
     * Tìm mã coupon chưa sử dụng theo loại PMH
     */
    async findFirstUnusedCoupon(loaiPMH) {
        try {
            const res = await axios.get(`${dbUrl}/coupons.json`, { timeout: 8000 });
            const coupons = res.data;
            if (!coupons) return null;

            const normType = String(loaiPMH || '').trim().toUpperCase();

            // Nếu là dạng mảng (Array)
            if (Array.isArray(coupons)) {
                for (let i = 0; i < coupons.length; i++) {
                    const c = coupons[i];
                    if (c && c.status === 'UNUSED' && String(c.type || '').trim().toUpperCase() === normType) {
                        return { index: i, ...c };
                    }
                }
            } else if (typeof coupons === 'object') {
                for (const [key, c] of Object.entries(coupons)) {
                    if (c && c.status === 'UNUSED' && String(c.type || '').trim().toUpperCase() === normType) {
                        return { key, ...c };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('[Firebase] Lỗi findFirstUnusedCoupon:', error.message);
            return null;
        }
    },

    /**
     * Cập nhật mã coupon đã phát
     */
    async markCouponSent(identifier, info) {
        try {
            const url = `${dbUrl}/coupons/${identifier}.json`;
            const payload = {
                status: 'SENT',
                warehouse: info.warehouse || info.maKho || '',
                orderId: info.orderId || info.mdh || '',
                recipient: info.recipient || info.displayName || '',
                recipientId: info.recipientId || info.userId || '',
                updatedAt: new Date().toISOString()
            };
            await axios.patch(url, payload, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi markCouponSent:', error.message);
            return false;
        }
    },

    /**
     * Trả lại mã coupon (khi hủy duyệt hoặc lỗi)
     */
    async releaseCoupon(identifier) {
        try {
            const url = `${dbUrl}/coupons/${identifier}.json`;
            const payload = {
                status: 'UNUSED',
                warehouse: '',
                orderId: '',
                recipient: '',
                recipientId: '',
                updatedAt: new Date().toISOString()
            };
            await axios.patch(url, payload, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi releaseCoupon:', error.message);
            return false;
        }
    },

    /**
     * Thêm yêu cầu phát mã mới
     */
    async createRequest(requestData) {
        try {
            const res = await axios.post(`${dbUrl}/requests.json`, {
                ...requestData,
                createdAt: new Date().toISOString()
            }, { timeout: 5000 });
            return res.data ? res.data.name : null; // Trả về firebase push key
        } catch (error) {
            console.error('[Firebase] Lỗi createRequest:', error.message);
            return null;
        }
    },

    /**
     * Lấy danh sách yêu cầu phát mã
     */
    async getRequests() {
        try {
            const res = await axios.get(`${dbUrl}/requests.json`, { timeout: 8000 });
            const data = res.data;
            if (!data) return [];
            return Object.entries(data).map(([id, val]) => ({ id, ...val }));
        } catch (error) {
            console.error('[Firebase] Lỗi getRequests:', error.message);
            return [];
        }
    },

    /**
     * Cập nhật trạng thái yêu cầu
     */
    async updateRequest(requestId, updateData) {
        try {
            await axios.patch(`${dbUrl}/requests/${requestId}.json`, {
                ...updateData,
                updatedAt: new Date().toISOString()
            }, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi updateRequest:', error.message);
            return false;
        }
    },

    /**
     * Lấy cài đặt hệ thống (Auto approve, active chat ids...)
     */
    async getSettings() {
        try {
            const res = await axios.get(`${dbUrl}/settings.json`, { timeout: 5000 });
            return res.data || { autoApprove: false, activeChatIds: [] };
        } catch (error) {
            console.error('[Firebase] Lỗi getSettings:', error.message);
            return { autoApprove: false, activeChatIds: [] };
        }
    },

    /**
     * Cập nhật cài đặt hệ thống
     */
    async updateSettings(data) {
        try {
            await axios.patch(`${dbUrl}/settings.json`, data, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi updateSettings:', error.message);
            return false;
        }
    },

    /**
     * Lấy danh sách Admin từ Firebase
     */
    async getAdmins() {
        try {
            const res = await axios.get(`${dbUrl}/admins.json`, { timeout: 5000 });
            const data = res.data;
            if (!data) return [];
            if (Array.isArray(data)) return data.filter(Boolean);
            return Object.entries(data).map(([id, val]) => ({ id, ...val }));
        } catch (error) {
            console.error('[Firebase] Lỗi getAdmins:', error.message);
            return [];
        }
    },

    /**
     * Lưu hoặc cập nhật thông tin Admin
     */
    async saveAdmin(adminData) {
        try {
            if (adminData.id) {
                const id = adminData.id;
                delete adminData.id;
                await axios.patch(`${dbUrl}/admins/${id}.json`, {
                    ...adminData,
                    updatedAt: new Date().toISOString()
                }, { timeout: 5000 });
                return id;
            } else {
                const res = await axios.post(`${dbUrl}/admins.json`, {
                    ...adminData,
                    active: adminData.active !== undefined ? adminData.active : true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }, { timeout: 5000 });
                return res.data ? res.data.name : null;
            }
        } catch (error) {
            console.error('[Firebase] Lỗi saveAdmin:', error.message);
            return null;
        }
    },

    /**
     * Xóa Admin khỏi Firebase
     */
    async deleteAdmin(adminId) {
        try {
            await axios.delete(`${dbUrl}/admins/${adminId}.json`, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi deleteAdmin:', error.message);
            return false;
        }
    },

    /**
     * Ghi log hệ thống lên Firebase
     */
    async logSystem(tag, message) {
        try {
            await axios.post(`${dbUrl}/logs.json`, {
                tag,
                message,
                timestamp: new Date().toISOString()
            }, { timeout: 3000 });
        } catch (e) {
            // Không ngắt luồng nếu ghi log lỗi
        }
    }
};

module.exports = Firebase;
