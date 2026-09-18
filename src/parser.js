/**
 * Module phân tích (parse) nội dung tin nhắn yêu cầu PMH từ Quản lý
 */

function shouldIgnoreLine(line) {
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

function isKeyLine(line) {
    const t = String(line || '').toLowerCase().trim();
    const hasLoai = t.includes('loại pmh') || t.includes('loai pmh') || t.includes('cú pháp') || t.includes('cu phap');
    const hasKho = t.includes('mã kho') || t.includes('ma kho') || t.includes('kho');
    const hasMdh = t.includes('mđh') || t.includes('mdh') || t.includes('đơn') || t.includes('don') || t.includes('đh') || t.includes('dh');
    return hasLoai || hasKho || hasMdh;
}

function extractValueFromLineOrNext(lines, index) {
    let line = lines[index].trim();

    if (line.indexOf(':') !== -1) {
        const parts = line.split(':');
        const val = parts.slice(1).join(':').trim();
        if (val) return val;

        if (index + 1 < lines.length) {
            const nextLine = lines[index + 1].trim();
            if (!isKeyLine(nextLine)) {
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
            if (!isKeyLine(nextLine)) {
                return nextLine;
            }
        }
    }
    return '';
}

function parseCouponForm(text) {
    const rawLines = String(text || '').normalize('NFC').split(/[\n\r]+/);
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!shouldIgnoreLine(line)) {
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
            loaiPMH = extractValueFromLineOrNext(lines, i);
        } else if (isKho && !maKho) {
            maKho = extractValueFromLineOrNext(lines, i);
        } else if (isMdh && !mdh) {
            mdh = extractValueFromLineOrNext(lines, i);
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

function looksLikeCouponForm(text) {
    const t = String(text || '').toLowerCase().trim();
    return /l[oọ][aạ\u0323]*i[ \t]*pmh(?:[ \t]+(?:áp|ap|yêu|yeu)[ \t]*(?:dụng|dung|cầu|cau))?[ \t]*:|c[uú][ \t]*ph[aá]p(?:[ \t]+(?:áp|ap|yêu|yeu)[ \t]*(?:dụng|dung|cầu|cau))?[ \t]*:/i.test(t);
}

module.exports = {
    parseCouponForm,
    looksLikeCouponForm
};
