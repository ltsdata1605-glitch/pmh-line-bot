const Firebase = require('./firebase');
const CONFIG = require('./config');

const NL = '\n';

const couponService = {
    /**
     * Tạo thông điệp thống kê PMH còn lại trong kho (lệnh tk)
     */
    async getStatisticsMessage() {
        const coupons = await Firebase.getCoupons();
        if (!coupons || coupons.length === 0) {
            return '📊 Kho PMH hiện tại trống.';
        }

        // Đếm số lượng mã chưa sử dụng theo Loại PMH
        const counts = {};
        coupons.forEach(c => {
            if (!c || !c.code || !c.type) return;
            const type = String(c.type).trim().toUpperCase();
            if (counts[type] === undefined) {
                counts[type] = 0;
            }
            if (c.status === 'UNUSED' || !c.status) {
                counts[type]++;
            }
        });

        const syntaxText = await Firebase.getSyntax();

        const lines = [
            '📊 THỐNG KÊ PMH CÒN LẠI:',
            '------------------------'
        ];

        if (syntaxText) {
            const rawLines = syntaxText.split(/\r?\n/);
            let startIndex = -1;

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
                            lines.push(line);
                        }
                    }
                }
            }
        }

        // Nếu không parse được theo cấu trúc syntax, liệt kê toàn bộ các loại
        if (lines.length <= 2) {
            const sortedTypes = Object.keys(counts).sort();
            sortedTypes.forEach(t => {
                lines.push(`- ${t}: ${counts[t]}`);
            });
        }

        lines.push('------------------------');
        lines.push('💡 Gõ "cp" để lấy mẫu đăng ký PMH.');

        return lines.join(NL);
    },

    /**
     * Kiểm tra trùng lặp yêu cầu xin mã
     */
    async checkDuplicateRequest(userId, loaiPMH, mdh) {
        if (!mdh) return { action: 'allow' };

        const requests = await Firebase.getRequests();
        const normMdh = String(mdh).trim().toUpperCase();
        const normType = String(loaiPMH).trim().toUpperCase();

        const duplicate = requests.find(r => {
            return String(r.mdh || '').trim().toUpperCase() === normMdh &&
                (r.status === CONFIG.REQUEST_STATUS_SENT || r.status === CONFIG.REQUEST_STATUS_PENDING);
        });

        if (duplicate) {
            if (String(duplicate.loaiPMH).trim().toUpperCase() === normType) {
                return { action: 'block_same_type', existing: duplicate };
            } else {
                return { action: 'allow_with_change_notice', existing: duplicate };
            }
        }

        return { action: 'allow' };
    }
};

module.exports = couponService;
