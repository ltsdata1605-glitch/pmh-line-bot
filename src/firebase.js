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
    async findFirstUnusedCoupon(loaiPMH, excludeCodes = []) {
        try {
            const res = await axios.get(`${dbUrl}/coupons.json`, { timeout: 8000 });
            const coupons = res.data;
            if (!coupons) return null;

            const normType = String(loaiPMH || '').trim().toUpperCase();
            const excludeList = (Array.isArray(excludeCodes) ? excludeCodes : [excludeCodes])
                .filter(Boolean)
                .map(c => String(c).trim().toUpperCase());
            const excludeSet = new Set(excludeList);

            // Nếu là dạng mảng (Array)
            if (Array.isArray(coupons)) {
                for (let i = 0; i < coupons.length; i++) {
                    const c = coupons[i];
                    if (c && c.status === 'UNUSED' && String(c.type || '').trim().toUpperCase() === normType) {
                        const code = String(c.code || '').trim().toUpperCase();
                        if (!excludeSet.has(code)) {
                            return { index: i, ...c };
                        }
                    }
                }
            } else if (typeof coupons === 'object') {
                for (const [key, c] of Object.entries(coupons)) {
                    if (c && c.status === 'UNUSED' && String(c.type || '').trim().toUpperCase() === normType) {
                        const code = String(c.code || '').trim().toUpperCase();
                        if (!excludeSet.has(code)) {
                            return { key, ...c };
                        }
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
     * Đếm số lượng mã coupon chưa sử dụng của một loại PMH cụ thể
     */
    async getUnusedCountByType(loaiPMH) {
        try {
            const coupons = await this.getCoupons();
            if (!coupons || coupons.length === 0) return 0;
            const norm = String(loaiPMH || '').trim().toUpperCase();
            let count = 0;
            coupons.forEach(c => {
                if (!c) return;
                const cType = String(c.type || '').trim().toUpperCase();
                if (cType === norm && (c.status === 'UNUSED' || !c.status)) {
                    count++;
                }
            });
            return count;
        } catch (error) {
            console.error('[Firebase] Lỗi getUnusedCountByType:', error.message);
            return 0;
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
    },

    /**
     * ==================== QUẢN LÝ NHÓM LINE (GROUPS) ====================
     */

    /**
     * Lấy danh sách các nhóm BOT đang/đã tham gia
     */
    async getGroups() {
        try {
            const res = await axios.get(`${dbUrl}/groups.json`, { timeout: 5000 });
            const data = res.data;
            if (!data) return [];
            if (Array.isArray(data)) return data.filter(Boolean);
            return Object.entries(data).map(([id, val]) => ({
                id,
                groupId: val.groupId || id,
                ...val
            }));
        } catch (error) {
            console.error('[Firebase] Lỗi getGroups:', error.message);
            return [];
        }
    },

    /**
     * Lưu hoặc cập nhật thông tin nhóm
     */
    async saveGroup(groupData) {
        if (!groupData || !groupData.groupId) return null;
        const groupId = groupData.groupId;
        try {
            const payload = {
                ...groupData,
                lastActiveAt: new Date().toISOString()
            };
            if (!groupData.joinedAt) {
                payload.joinedAt = new Date().toISOString();
            }
            if (payload.active === undefined) {
                payload.active = true;
            }
            await axios.patch(`${dbUrl}/groups/${groupId}.json`, payload, { timeout: 5000 });
            return groupId;
        } catch (error) {
            console.error('[Firebase] Lỗi saveGroup:', error.message);
            return null;
        }
    },

    /**
     * Xóa nhóm khỏi danh sách theo dõi
     */
    async deleteGroup(groupId) {
        try {
            await axios.delete(`${dbUrl}/groups/${groupId}.json`, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi deleteGroup:', error.message);
            return false;
        }
    },

    /**
     * ==================== QUẢN LÝ LỊCH HẸN THÔNG BÁO (SCHEDULES) ====================
     */

    /**
     * Lấy danh sách tất cả các lịch hẹn thông báo
     */
    async getSchedules() {
        try {
            const res = await axios.get(`${dbUrl}/schedules.json`, { timeout: 5000 });
            const data = res.data;
            if (!data) return [];
            if (Array.isArray(data)) return data.filter(Boolean);
            return Object.entries(data).map(([id, val]) => ({
                id,
                ...val
            }));
        } catch (error) {
            console.error('[Firebase] Lỗi getSchedules:', error.message);
            return [];
        }
    },

    /**
     * Lưu lịch hẹn mới hoặc cập nhật toàn bộ lịch hẹn
     */
    async saveSchedule(scheduleData) {
        try {
            const id = scheduleData.id || ('sched_' + Date.now());
            const payload = {
                ...scheduleData,
                id,
                updatedAt: new Date().toISOString()
            };
            if (!scheduleData.createdAt) {
                payload.createdAt = new Date().toISOString();
            }
            if (payload.active === undefined) {
                payload.active = true;
            }
            await axios.put(`${dbUrl}/schedules/${id}.json`, payload, { timeout: 5000 });
            return id;
        } catch (error) {
            console.error('[Firebase] Lỗi saveSchedule:', error.message);
            return null;
        }
    },

    /**
     * Cập nhật một phần dữ liệu lịch hẹn (trạng thái, thời gian chạy...)
     */
    async updateSchedule(scheduleId, data) {
        if (!scheduleId) return false;
        try {
            await axios.patch(`${dbUrl}/schedules/${scheduleId}.json`, {
                ...data,
                updatedAt: new Date().toISOString()
            }, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi updateSchedule:', error.message);
            return false;
        }
    },

    /**
     * Xóa lịch hẹn khỏi Firebase
     */
    async deleteSchedule(scheduleId) {
        if (!scheduleId) return false;
        try {
            await axios.delete(`${dbUrl}/schedules/${scheduleId}.json`, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi deleteSchedule:', error.message);
            return false;
        }
    },

    /**
     * ==================== QUẢN LÝ THƯ VIỆN TỪ KHOÁ (KEYWORDS) ====================
     */

    /**
     * Lấy toàn bộ danh sách từ khoá tự động
     */
    async getKeywords() {
        try {
            const res = await axios.get(`${dbUrl}/keywords.json`, { timeout: 5000 });
            const data = res.data;
            if (!data) return [];
            if (Array.isArray(data)) return data.filter(Boolean);
            return Object.entries(data).map(([id, val]) => ({
                id,
                ...val
            }));
        } catch (error) {
            console.error('[Firebase] Lỗi getKeywords:', error.message);
            return [];
        }
    },

    /**
     * Lưu từ khoá mới hoặc cập nhật từ khoá
     */
    async saveKeyword(keywordData) {
        if (!keywordData) return null;
        try {
            const id = keywordData.id || ('kw_' + Date.now());
            const cleanKeyword = String(keywordData.keyword || '').trim().toLowerCase();
            const payload = {
                ...keywordData,
                id,
                keyword: cleanKeyword,
                reply_text: String(keywordData.reply_text || '').trim(),
                image_urls: Array.isArray(keywordData.image_urls) ? keywordData.image_urls.filter(Boolean) : [],
                matchType: keywordData.matchType || 'EXACT',
                active: keywordData.active !== undefined ? keywordData.active : true,
                updatedAt: new Date().toISOString()
            };

            // Tương thích ngược với image_url đơn
            if (payload.image_urls.length > 0) {
                payload.image_url = payload.image_urls[0];
            } else {
                payload.image_url = '';
            }

            if (!keywordData.createdAt) {
                payload.createdAt = new Date().toISOString();
            }

            await axios.put(`${dbUrl}/keywords/${id}.json`, payload, { timeout: 5000 });
            return id;
        } catch (error) {
            console.error('[Firebase] Lỗi saveKeyword:', error.message);
            return null;
        }
    },

    /**
     * Cập nhật một phần dữ liệu từ khoá
     */
    async updateKeyword(keywordId, data) {
        if (!keywordId) return false;
        try {
            await axios.patch(`${dbUrl}/keywords/${keywordId}.json`, {
                ...data,
                updatedAt: new Date().toISOString()
            }, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi updateKeyword:', error.message);
            return false;
        }
    },

    /**
     * Xóa từ khoá khỏi Firebase
     */
    async deleteKeyword(keywordId) {
        if (!keywordId) return false;
        try {
            await axios.delete(`${dbUrl}/keywords/${keywordId}.json`, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi deleteKeyword:', error.message);
            return false;
        }
    },

    /**
     * Tìm kiếm từ khoá khớp với nội dung tin nhắn của người dùng
     */
    async findKeywordReply(text) {
        if (!text) return null;
        try {
            const keywords = await this.getKeywords();
            if (!keywords || keywords.length === 0) return null;

            const cleanText = String(text).trim().toLowerCase();

            // 1. Ưu tiên tìm khớp chính xác (EXACT match) trước
            for (const kw of keywords) {
                if (kw.active === false) continue;
                const targetKw = String(kw.keyword || '').trim().toLowerCase();
                if (!targetKw) continue;

                if (kw.matchType === 'EXACT' || !kw.matchType) {
                    if (cleanText === targetKw) {
                        return kw;
                    }
                }
            }

            // 2. Tìm khớp có chứa (CONTAINS match)
            for (const kw of keywords) {
                if (kw.active === false) continue;
                const targetKw = String(kw.keyword || '').trim().toLowerCase();
                if (!targetKw) continue;

                if (kw.matchType === 'CONTAINS') {
                    if (cleanText.includes(targetKw)) {
                        return kw;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[Firebase] Lỗi findKeywordReply:', error.message);
            return null;
        }
    },

    /**
     * Thu hồi mã coupon về kho (trạng thái UNUSED)
     */
    async revokeCoupon(couponCode, reason = 'Thu hồi do trùng MĐH') {
        try {
            const res = await axios.get(`${dbUrl}/coupons.json`, { timeout: 8000 });
            const coupons = res.data;
            if (!coupons) return false;

            const cleanCode = String(couponCode || '').trim().toUpperCase();
            let targetKey = null;

            if (Array.isArray(coupons)) {
                const idx = coupons.findIndex(c => c && String(c.code).trim().toUpperCase() === cleanCode);
                if (idx !== -1) targetKey = idx;
            } else if (typeof coupons === 'object') {
                const entry = Object.entries(coupons).find(([k, v]) => v && String(v.code).trim().toUpperCase() === cleanCode);
                if (entry) targetKey = entry[0];
            }

            if (targetKey === null) {
                console.warn(`[Firebase] Không tìm thấy mã coupon "${couponCode}" để thu hồi.`);
                return false;
            }

            const url = `${dbUrl}/coupons/${targetKey}.json`;
            await axios.patch(url, {
                status: 'UNUSED',
                warehouse: '',
                orderId: '',
                recipient: '',
                recipientId: '',
                updatedAt: new Date().toISOString(),
                revokedAt: new Date().toISOString(),
                revokeReason: reason
            }, { timeout: 5000 });

            console.log(`[Firebase] Đã thu hồi mã coupon "${couponCode}" về kho thành công.`);
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi revokeCoupon:', error.message);
            return false;
        }
    },

    /**
     * Ghi nhật ký thao tác quản trị (Audit Logs)
     */
    async logAudit(adminUser, action, description, details = {}) {
        try {
            await axios.post(`${dbUrl}/audit_logs.json`, {
                adminUser: String(adminUser || 'Admin'),
                action: String(action || 'ACTION'),
                description: String(description || ''),
                details: details || {},
                timestamp: new Date().toISOString()
            }, { timeout: 5000 });
            return true;
        } catch (error) {
            console.error('[Firebase] Lỗi logAudit:', error.message);
            return false;
        }
    },

    /**
     * Lấy danh sách nhật ký thao tác quản trị
     */
    async getAuditLogs(limit = 200) {
        try {
            const res = await axios.get(`${dbUrl}/audit_logs.json`, { timeout: 8000 });
            const data = res.data;
            if (!data) return [];
            const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
            list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            return list.slice(0, limit);
        } catch (error) {
            console.error('[Firebase] Lỗi getAuditLogs:', error.message);
            return [];
        }
    }
};

module.exports = Firebase;
