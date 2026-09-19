/**
 * HỆ THỐNG QUẢN LÝ KHO COUPON & CÚ PHÁP PMH - FIREBASE EDITION
 * Core Application Logic, Authentication, Bulk Import & Firebase Sync
 */

// ==================== 1. DỮ LIỆU KHỞI TẠO MẪU ====================
const DEFAULT_ACCOUNTS = {
    '3717': '123456',
    '12233': '123456'
};

// Dữ liệu mẫu khởi tạo trực tiếp từ ảnh Google Sheet của người dùng
const INITIAL_COUPONS = [
    { code: '9UD9GJWNSD', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'I8XDVRT4AK', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'IIUJ242I7E', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: '220WRZLY0H', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'NDYXIKJL0L', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'SM0UMZRG75', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'FX2PQGEY35', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'WAVJM6PKCD', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'RELUJ6PW45', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'K0ED9URLIB', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'J2HXUP5VL9', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'G5IW868EIL', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'X1W2F8VZBN', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'Z3DQQ2SJMP', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: '4WX1838J2D', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: '05HRM53INP', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'RLBKO6A32F', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'UEOPZ7R2I9', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: '77MOAKC94T', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: '4VRFJE6D9M', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'FSB3TXJD87', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'XZRQFV892Y', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'I118B2U7CR', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'V45TI8MNON', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'I8CR18LLRD', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() },
    { code: 'A0PQID3LVP', type: 'ML200', status: 'UNUSED', warehouse: '', orderId: '', recipient: '', recipientId: '', updatedAt: new Date().toISOString() }
];

// Cú pháp chuẩn khởi tạo trực tiếp từ ảnh Sheet Cú pháp
const INITIAL_SYNTAX = 
`📦 FORM MẪU & LOẠI PMH:

📝 FORM LẤY PMH:
Loại PMH: 
Mã Kho Áp Dụng: 
MĐH Áp Dụng: 
-------------------------
📦 LOẠI PMH :

⬢ PMH ICT TRỪ APPLE ( Hạn 30.09 )
- Dưới 5 Triệu: ICT50
- Từ 5 Đến 10 Triệu: ICT100
- Từ 10 Đến 20 Triệu: ICT200
- Từ 20 Đến 30 Triệu: ICT300
- Từ 30 Triệu: ICT500

⬢ PMH ICT MOTOROLA ( 30/09 )
- Giảm 2Tr SP Từ 10 Triệu: MOTO2000

⬢ PMH ICT HONOR ( hạn 30/09 )
- PMH 500K Honor 600 Lite 5G : HONO500

⬢ PMH SAMSUNG S26 FE ( Hạn 30.09 )
- PMH 1 Triệu samsung S26 FE : S26FE

⬢ PMH LAPTOP TRỪ APPLE ( 30/09 )
- PMH 500K DƯỚI 30 TRIỆU : LT500
- PMH 1TR TRÊN 30 TRIỆU : LT1000

⬢ PMH ICT XIAOMI REDMI 17 ( hạn 07.09 )
- PMH 300k XIAOMI REDMI 17 : RM17`;

// ==================== 2. APPLICATION STATE ====================
// Cấu hình Firebase Realtime Database tự động tạo sẵn (Project: bot-l-e1587, Singapore)
const DEFAULT_FIREBASE_CONFIG = {
    databaseUrl: 'https://bot-l-e1587-default-rtdb.asia-southeast1.firebasedatabase.app',
    apiKey: '',
    authSecret: ''
};

let appState = {
    currentUser: null,
    coupons: [],
    syntax: '',
    admins: [],
    schedules: [],
    groups: [],
    settings: { autoApprove: false },
    firebaseConfig: { ...DEFAULT_FIREBASE_CONFIG },
    filter: {
        search: '',
        type: 'ALL',
        status: 'UNUSED'
    },
    bulkParsedData: []
};

// ==================== 3. KHỞI CHẠY ỨNG DỤNG ====================
document.addEventListener('DOMContentLoaded', () => {
    loadLocalState();
    checkAuthSession();
});

function loadLocalState() {
    // 1. Cấu hình Firebase (Tự động kết nối, không cần người dùng cấu hình thủ công)
    const savedFb = localStorage.getItem('pmh_firebase_config');
    let fbConfigLoaded = false;
    if (savedFb) {
        try {
            const parsed = JSON.parse(savedFb);
            if (parsed && parsed.databaseUrl && !parsed.databaseUrl.includes('ten-project') && !parsed.databaseUrl.includes('pmh-coupon-default')) {
                appState.firebaseConfig = parsed;
                fbConfigLoaded = true;
            }
        } catch (e) {
            console.error('Lỗi đọc cấu hình Firebase:', e);
        }
    }
    
    if (!fbConfigLoaded) {
        appState.firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG };
        localStorage.setItem('pmh_firebase_config', JSON.stringify(appState.firebaseConfig));
    }

    const dbUrlInput = document.getElementById('fb-database-url');
    const apiKeyInput = document.getElementById('fb-api-key');
    const authSecInput = document.getElementById('fb-auth-secret');
    if (dbUrlInput) dbUrlInput.value = appState.firebaseConfig.databaseUrl || DEFAULT_FIREBASE_CONFIG.databaseUrl;
    if (apiKeyInput) apiKeyInput.value = appState.firebaseConfig.apiKey || '';
    if (authSecInput) authSecInput.value = appState.firebaseConfig.authSecret || '';

    // 2. Dữ liệu Coupon
    const savedCoupons = localStorage.getItem('pmh_coupons');
    if (savedCoupons) {
        try {
            appState.coupons = JSON.parse(savedCoupons);
        } catch (e) {
            appState.coupons = INITIAL_COUPONS;
        }
    } else {
        appState.coupons = INITIAL_COUPONS;
        saveCouponsToLocal();
    }

    // 3. Dữ liệu Cú pháp
    const savedSyntax = localStorage.getItem('pmh_syntax');
    if (savedSyntax) {
        appState.syntax = savedSyntax;
    } else {
        appState.syntax = INITIAL_SYNTAX;
        saveSyntaxToLocal();
    }

    // Cập nhật giao diện ban đầu
    const syntaxTextarea = document.getElementById('syntax-textarea');
    if (syntaxTextarea) {
        syntaxTextarea.value = appState.syntax;
        updateLinePreview();
    }

    updateFirebaseStatusBadge();
}

function saveCouponsToLocal() {
    localStorage.setItem('pmh_coupons', JSON.stringify(appState.coupons));
}

function saveSyntaxToLocal() {
    localStorage.setItem('pmh_syntax', appState.syntax);
}

// ==================== 4. XÁC THỰC ĐĂNG NHẬP ====================
function checkAuthSession() {
    const savedUser = sessionStorage.getItem('pmh_auth_user') || localStorage.getItem('pmh_auth_user');
    if (savedUser && (savedUser === '3717' || savedUser === '12233')) {
        setLoggedIn(savedUser);
    } else {
        setLoggedOut();
    }
}

function handleLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');

    const username = (usernameInput.value || '').trim();
    const password = (passwordInput.value || '').trim();

    if (DEFAULT_ACCOUNTS[username] && DEFAULT_ACCOUNTS[username] === password) {
        errorBox.classList.add('hidden');
        sessionStorage.setItem('pmh_auth_user', username);
        localStorage.setItem('pmh_auth_user', username);
        setLoggedIn(username);
        showToast(`Xin chào Quản trị viên ${username}!`, 'success');
    } else {
        errorBox.classList.remove('hidden');
        errorText.innerText = 'Mã Quản Trị hoặc Mật Khẩu không đúng! Vui lòng kiểm tra lại.';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function setLoggedIn(userId) {
    appState.currentUser = userId;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('display-user-id').innerText = `Admin ${userId}`;
    
    // Tải dữ liệu và hiển thị lên giao diện
    syncDataFromFirebase(false);
    renderDashboard();
    renderCouponsTable();
    updateTypeDropdowns();
}

function handleLogout() {
    sessionStorage.removeItem('pmh_auth_user');
    localStorage.removeItem('pmh_auth_user');
    appState.currentUser = null;
    setLoggedOut();
    showToast('Đã đăng xuất tài khoản thành công.', 'info');
}

function setLoggedOut() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
    const unInput = document.getElementById('username');
    const pwInput = document.getElementById('password');
    if (unInput) unInput.value = '';
    if (pwInput) pwInput.value = '';
    const errBox = document.getElementById('login-error');
    if (errBox) errBox.classList.add('hidden');
}

function togglePasswordVisibility() {
    const pwInput = document.getElementById('password');
    const eyeIcon = document.getElementById('pw-eye-icon');
    if (pwInput.type === 'password') {
        pwInput.type = 'text';
        eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
        pwInput.type = 'password';
        eyeIcon.className = 'fa-regular fa-eye';
    }
}

// ==================== 5. ĐIỀU HƯỚNG TABS ====================
function switchTab(tabId) {
    // Update nav items
    document.querySelectorAll('.sidebar-menu .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Update Topbar header titles
    const titleEl = document.getElementById('page-title');
    const descEl = document.getElementById('page-desc');

    if (tabId === 'dashboard') {
        titleEl.innerText = 'Tổng Quan Kho Mã';
        descEl.innerText = 'Theo dõi tồn kho coupon và trạng thái dữ liệu theo thời gian thực';
        renderDashboard();
    } else if (tabId === 'coupons') {
        titleEl.innerText = 'Kho Mã Coupon';
        descEl.innerText = 'Quản lý, tìm kiếm, nhập hàng loạt và phân loại coupon theo Loại PMH';
        renderCouponsTable();
    } else if (tabId === 'syntax') {
        titleEl.innerText = 'Quản Lý Cú Pháp Form';
        descEl.innerText = 'Soạn thảo và cập nhật nội dung tin nhắn hướng dẫn/cú pháp form gửi trên LINE';
        updateLinePreview();
    } else if (tabId === 'admins') {
        titleEl.innerText = 'Khai Báo & Quản Lý Admin';
        descEl.innerText = 'Khai báo danh sách các tài khoản LINE có quyền phê duyệt phát mã PMH & cấu hình tự động';
        renderAdminsTable();
    } else if (tabId === 'schedules') {
        titleEl.innerText = 'Hẹn Giờ Thông Báo Nhóm';
        descEl.innerText = 'Cấu hình lịch tự động gửi tin nhắn, báo cáo, thông báo định kỳ đến các nhóm LINE BOT đang tham gia';
        renderSchedulesTable();
        renderGroupsList();
        updateScheduleMetrics();
    }
}

// ==================== 6. DASHBOARD METRICS ====================
function renderDashboard() {
    const total = appState.coupons.length;
    const unused = appState.coupons.filter(c => c.status === 'UNUSED').length;
    const sent = appState.coupons.filter(c => c.status === 'SENT').length;

    // Phân nhóm theo loại PMH
    const typeMap = {};
    appState.coupons.forEach(c => {
        const t = (c.type || 'KHÁC').toUpperCase();
        if (!typeMap[t]) {
            typeMap[t] = { total: 0, unused: 0, sent: 0 };
        }
        typeMap[t].total++;
        if (c.status === 'UNUSED') typeMap[t].unused++;
        if (c.status === 'SENT') typeMap[t].sent++;
    });

    const activeTypesCount = Object.keys(typeMap).length;

    // Cập nhật số liệu các thẻ Stat
    document.getElementById('stat-total-coupons').innerText = total.toLocaleString();
    document.getElementById('stat-unused-coupons').innerText = unused.toLocaleString();
    document.getElementById('stat-sent-coupons').innerText = sent.toLocaleString();
    document.getElementById('stat-types-count').innerText = activeTypesCount;
    document.getElementById('badge-total-unused').innerText = unused;

    const pct = total > 0 ? Math.round((unused / total) * 100) : 0;
    document.getElementById('stat-unused-pct').innerText = `${pct}% tổng kho khả dụng`;

    // Lưu typeMap và render danh sách dạng bảng
    appState.dashboardTypeMap = typeMap;
    renderDashboardStockList();

    // Render danh sách mã phát gần đây
    const recentSent = appState.coupons
        .filter(c => c.status === 'SENT')
        .slice(-6)
        .reverse();

    const recentTbody = document.getElementById('recent-dispatched-tbody');
    recentTbody.innerHTML = '';

    if (recentSent.length === 0) {
        recentTbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">
                    Chưa có mã nào được phát trong phiên hiện tại.
                </td>
            </tr>
        `;
    } else {
        recentSent.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="coupon-code-pill">${c.code}</span></td>
                <td><strong>${c.type}</strong></td>
                <td><span class="status-badge sent"><i class="fa-solid fa-check"></i> Đã phát</span></td>
                <td>${c.warehouse || '<span class="text-muted">-</span>'}</td>
                <td>${c.orderId || '<span class="text-muted">-</span>'}</td>
                <td>${c.recipient || '<span class="text-muted">-</span>'}</td>
                <td><small class="text-muted">${formatDate(c.updatedAt)}</small></td>
            `;
            recentTbody.appendChild(tr);
        });
    }
}

function renderDashboardStockList() {
    const tbody = document.getElementById('stock-by-type-tbody');
    const emptyState = document.getElementById('stock-type-empty-state');
    if (!tbody) return;

    const typeMap = appState.dashboardTypeMap || {};
    const searchVal = (document.getElementById('stock-type-search')?.value || '').trim().toLowerCase();
    const filterVal = document.getElementById('stock-type-filter')?.value || 'ALL';

    tbody.innerHTML = '';

    const allTypeNames = Object.keys(typeMap);
    if (allTypeNames.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').innerText = 'Chưa có loại mã nào trong kho. Vào tab "Kho Mã Coupon" để nạp dữ liệu.';
        }
        return;
    }

    // Lọc theo search và trạng thái
    const filteredTypes = allTypeNames.filter(typeName => {
        if (searchVal && !typeName.toLowerCase().includes(searchVal)) {
            return false;
        }

        const unused = typeMap[typeName].unused;
        if (filterVal === 'LOW' && (unused >= 5 || unused === 0)) return false;
        if (filterVal === 'OUT' && unused > 0) return false;
        if (filterVal === 'OK' && unused < 5) return false;

        return true;
    });

    // Sắp xếp: Ưu tiên loại hết mã (unused === 0), rồi sắp hết (unused < 5), rồi theo số lượng tăng dần
    filteredTypes.sort((a, b) => {
        return typeMap[a].unused - typeMap[b].unused || a.localeCompare(b);
    });

    if (filteredTypes.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').innerText = 'Không tìm thấy loại PMH nào phù hợp với bộ lọc.';
        }
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    filteredTypes.forEach((typeName, index) => {
        const data = typeMap[typeName];
        const isOut = data.unused === 0;
        const isLow = data.unused > 0 && data.unused < 5;
        const fillPct = data.total > 0 ? Math.round((data.unused / data.total) * 100) : 0;

        let statusBadgeHtml = '';
        let unusedBadgeHtml = '';

        if (isOut) {
            statusBadgeHtml = `<span class="status-badge" style="color: #DC2626;"><i class="fa-solid fa-circle-xmark"></i> Hết mã</span>`;
            unusedBadgeHtml = `<strong style="color: #DC2626; font-size: 0.95rem;">0</strong>`;
        } else if (isLow) {
            statusBadgeHtml = `<span class="status-badge" style="color: #D97706;"><i class="fa-solid fa-triangle-exclamation"></i> Sắp hết</span>`;
            unusedBadgeHtml = `<strong style="color: #D97706; font-size: 0.95rem;">${data.unused}</strong>`;
        } else {
            statusBadgeHtml = `<span class="status-badge unused" style="color: #16A34A;"><i class="fa-solid fa-circle-check"></i> Khả dụng</span>`;
            unusedBadgeHtml = `<strong style="color: #16A34A; font-size: 0.95rem;">${data.unused}</strong>`;
        }

        const barColor = isOut ? '#CBD5E1' : isLow ? '#F59E0B' : '#10B981';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-muted" style="font-size: 0.85rem;">${index + 1}</td>
            <td><strong style="font-size: 0.95rem; color: #1E293B;">${typeName}</strong></td>
            <td style="text-align: center;">${unusedBadgeHtml}</td>
            <td style="text-align: center; color: #64748B; font-weight: 600;">${data.sent}</td>
            <td style="text-align: center; font-weight: 700; color: #0F172A;">${data.total}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; height: 7px; background: #E2E8F0; border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${fillPct}%; height: 100%; background: ${barColor}; border-radius: 9999px;"></div>
                    </div>
                    <span style="font-size: 0.8rem; font-weight: 600; color: #475569; min-width: 38px; text-align: right;">${fillPct}%</span>
                </div>
            </td>
            <td style="text-align: center;">${statusBadgeHtml}</td>
            <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" onclick="filterCouponsByType('${typeName}')" title="Xem danh sách mã ${typeName} trong kho" style="padding: 4px 10px; font-size: 0.8rem;">
                    <i class="fa-solid fa-arrow-right"></i> <span>Xem</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterCouponsByType(typeName) {
    appState.filter.type = typeName;
    appState.filter.search = '';
    appState.filter.status = 'ALL';
    
    const typeSelect = document.getElementById('filter-type-select');
    if (typeSelect) typeSelect.value = typeName;
    const searchInput = document.getElementById('coupon-search-input');
    if (searchInput) searchInput.value = '';
    const statusSelect = document.getElementById('filter-status-select');
    if (statusSelect) statusSelect.value = 'ALL';

    switchTab('coupons');
}

// ==================== 7. KHO MÃ COUPON TABLE & FILTERS ====================
function handleCouponFilter() {
    appState.filter.search = (document.getElementById('coupon-search-input').value || '').trim().toLowerCase();
    appState.filter.type = document.getElementById('filter-type-select').value;
    appState.filter.status = document.getElementById('filter-status-select').value;
    renderCouponsTable();
}

function renderCouponsTable() {
    const tbody = document.getElementById('coupons-tbody');
    const emptyState = document.getElementById('coupons-empty-state');
    const filterCountEl = document.getElementById('filter-count-display');
    const totalCountEl = document.getElementById('total-count-display');

    totalCountEl.innerText = appState.coupons.length;

    // Lọc dữ liệu
    const filtered = appState.coupons.filter(c => {
        // Tìm kiếm từ khóa
        if (appState.filter.search) {
            const s = appState.filter.search;
            const matchCode = (c.code || '').toLowerCase().includes(s);
            const matchType = (c.type || '').toLowerCase().includes(s);
            const matchOrder = (c.orderId || '').toLowerCase().includes(s);
            const matchName = (c.recipient || '').toLowerCase().includes(s);
            if (!matchCode && !matchType && !matchOrder && !matchName) return false;
        }

        // Lọc loại PMH
        if (appState.filter.type !== 'ALL' && c.type !== appState.filter.type) {
            return false;
        }

        // Lọc trạng thái
        if (appState.filter.status !== 'ALL' && c.status !== appState.filter.status) {
            return false;
        }

        return true;
    });

    filterCountEl.innerText = filtered.length;
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');

        filtered.forEach((c, index) => {
            const tr = document.createElement('tr');
            const isUnused = c.status === 'UNUSED';

            tr.innerHTML = `
                <td class="text-muted">${index + 1}</td>
                <td><span class="coupon-code-pill">${c.code}</span></td>
                <td><strong style="color: var(--primary-light);">${c.type}</strong></td>
                <td>
                    <span class="status-badge ${isUnused ? 'unused' : 'sent'}">
                        <i class="fa-solid ${isUnused ? 'fa-ticket' : 'fa-paper-plane'}"></i>
                        ${isUnused ? 'Chưa dùng' : 'Đã phát'}
                    </span>
                </td>
                <td>${c.warehouse || '<span class="text-muted">-</span>'}</td>
                <td>${c.orderId || '<span class="text-muted">-</span>'}</td>
                <td>${c.recipient || '<span class="text-muted">-</span>'}</td>
                <td><small class="text-muted">${formatDate(c.updatedAt)}</small></td>
                <td class="text-right">
                    <div class="table-actions">
                        <button class="btn-icon" title="${isUnused ? 'Đánh dấu đã phát' : 'Đánh dấu chưa dùng'}" onclick="toggleCouponStatus('${c.code}')">
                            <i class="fa-solid ${isUnused ? 'fa-check' : 'fa-rotate-left'}"></i>
                        </button>
                        <button class="btn-icon danger" title="Xóa mã này" onclick="deleteSingleCouponPrompt('${c.code}')">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function updateTypeDropdowns() {
    const typeSet = new Set();
    appState.coupons.forEach(c => {
        if (c.type) typeSet.add(c.type.toUpperCase());
    });

    const select = document.getElementById('filter-type-select');
    const currentVal = select.value;
    select.innerHTML = '<option value="ALL">Tất cả Loại PMH</option>';

    const datalist = document.getElementById('existing-types-list');
    if (datalist) datalist.innerHTML = '';

    Array.from(typeSet).sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        select.appendChild(opt);

        if (datalist) {
            const dOpt = document.createElement('option');
            dOpt.value = t;
            datalist.appendChild(dOpt);
        }
    });

    if (typeSet.has(currentVal)) {
        select.value = currentVal;
    }
}

function toggleCouponStatus(code) {
    const coupon = appState.coupons.find(c => c.code === code);
    if (!coupon) return;

    if (coupon.status === 'UNUSED') {
        coupon.status = 'SENT';
        coupon.warehouse = coupon.warehouse || 'MANUAL';
        coupon.recipient = coupon.recipient || `Admin ${appState.currentUser}`;
    } else {
        coupon.status = 'UNUSED';
        coupon.warehouse = '';
        coupon.orderId = '';
        coupon.recipient = '';
        coupon.recipientId = '';
    }

    coupon.updatedAt = new Date().toISOString();
    saveAndSyncCoupons();
    renderCouponsTable();
    renderDashboard();
    showToast(`Đã đổi trạng thái mã ${code}`, 'success');
}

function deleteSingleCouponPrompt(code) {
    if (confirm(`Bạn có chắc chắn muốn xóa mã coupon "${code}" khỏi hệ thống?`)) {
        appState.coupons = appState.coupons.filter(c => c.code !== code);
        saveAndSyncCoupons();
        renderCouponsTable();
        renderDashboard();
        updateTypeDropdowns();
        showToast(`Đã xóa mã ${code}`, 'info');
    }
}

function clearSentCouponsPrompt() {
    const sentCount = appState.coupons.filter(c => c.status === 'SENT').length;
    if (sentCount === 0) {
        showToast('Không có mã đã phát nào để xóa.', 'info');
        return;
    }

    if (confirm(`Bạn có chắc muốn dọn dẹp và XÓA TOÀN BỘ ${sentCount} mã đã phát khỏi hệ thống? (Các mã chưa sử dụng vẫn được giữ nguyên)`)) {
        appState.coupons = appState.coupons.filter(c => c.status === 'UNUSED');
        saveAndSyncCoupons();
        renderCouponsTable();
        renderDashboard();
        updateTypeDropdowns();
        showToast(`Đã dọn dẹp thành công ${sentCount} mã đã phát!`, 'success');
    }
}

// ==================== 8. NHẬP HÀNG LOẠT (FILE EXCEL / CSV & PASTE) ====================
let currentImportTab = 'file';

function switchImportTab(tab) {
    currentImportTab = tab;
    const btnFile = document.getElementById('tab-btn-file');
    const btnPaste = document.getElementById('tab-btn-paste');
    const panelFile = document.getElementById('import-panel-file');
    const panelPaste = document.getElementById('import-panel-paste');

    if (tab === 'file') {
        if (btnFile) btnFile.classList.add('active');
        if (btnPaste) btnPaste.classList.remove('active');
        if (panelFile) panelFile.classList.remove('hidden');
        if (panelPaste) panelPaste.classList.add('hidden');
    } else {
        if (btnFile) btnFile.classList.remove('active');
        if (btnPaste) btnPaste.classList.add('active');
        if (panelFile) panelFile.classList.add('hidden');
        if (panelPaste) panelPaste.classList.remove('hidden');
        const textarea = document.getElementById('bulk-textarea');
        if (textarea) textarea.focus();
    }
}

function triggerFileInput() {
    const fileInput = document.getElementById('bulk-file-input');
    if (fileInput) fileInput.click();
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropzone = document.getElementById('file-dropzone');
    if (dropzone) dropzone.classList.remove('drag-over');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processUploadedFile(e.dataTransfer.files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target && e.target.files && e.target.files.length > 0) {
        processUploadedFile(e.target.files[0]);
    }
}

function removeSelectedFile(e) {
    if (e) e.stopPropagation();
    const fileInput = document.getElementById('bulk-file-input');
    if (fileInput) fileInput.value = '';

    const promptEl = document.getElementById('dropzone-prompt');
    const infoEl = document.getElementById('dropzone-file-info');
    if (promptEl) promptEl.classList.remove('hidden');
    if (infoEl) infoEl.classList.add('hidden');

    if (currentImportTab === 'file') {
        appState.bulkParsedData = [];
        const previewWrapper = document.getElementById('bulk-preview-wrapper');
        const btnConfirm = document.getElementById('btn-confirm-import');
        if (previewWrapper) previewWrapper.classList.add('hidden');
        if (btnConfirm) btnConfirm.disabled = true;
    }
}

function processUploadedFile(file) {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        showToast('Vui lòng chọn file định dạng Excel (.xlsx, .xls) hoặc .csv!', 'error');
        return;
    }

    // Hiển thị thông tin file
    const promptEl = document.getElementById('dropzone-prompt');
    const infoEl = document.getElementById('dropzone-file-info');
    const nameEl = document.getElementById('display-file-name');
    const sizeEl = document.getElementById('display-file-size');

    if (promptEl) promptEl.classList.add('hidden');
    if (infoEl) infoEl.classList.remove('hidden');
    if (nameEl) nameEl.innerText = file.name;
    if (sizeEl) sizeEl.innerText = `${(file.size / 1024).toFixed(1)} KB`;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            if (typeof XLSX === 'undefined') {
                showToast('Đang nạp thư viện đọc Excel, vui lòng thử lại sau 1 giây...', 'warning');
                return;
            }
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!rows || rows.length === 0) {
                showToast('File không có dữ liệu!', 'warning');
                return;
            }

            // Tự động tìm cột chứa Mã Coupon và Loại PMH
            let colCodeIdx = 0;
            let colTypeIdx = 1;
            let startRowIdx = 0;

            const firstRow = rows[0].map(c => String(c).trim().toUpperCase());
            const hasHeader = firstRow.some(c => 
                c.includes('MÃ') || c.includes('MA') || c.includes('CODE') || 
                c.includes('COUPON') || c.includes('LOẠI') || c.includes('LOAI') || c.includes('TYPE')
            );

            if (hasHeader) {
                startRowIdx = 1;
                for (let j = 0; j < firstRow.length; j++) {
                    const h = firstRow[j];
                    if (h.includes('MÃ') || h.includes('MA') || h.includes('COUPON') || h.includes('CODE')) {
                        colCodeIdx = j;
                    } else if (h.includes('LOẠI') || h.includes('LOAI') || h.includes('TYPE') || h.includes('PMH')) {
                        colTypeIdx = j;
                    }
                }
            }

            const parsed = [];
            const existingCodes = new Set(appState.coupons.map(c => c.code));
            let duplicateCount = 0;

            for (let i = startRowIdx; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                const code = String(row[colCodeIdx] || '').trim().toUpperCase();
                const type = String(row[colTypeIdx] || '').trim().toUpperCase();

                if (!code || !type) continue;
                if (code === 'MÃ COUPON' || code === 'MA COUPON' || code === 'CODE' || type === 'LOẠI PMH' || type === 'LOAI PMH') continue;

                const isDup = existingCodes.has(code);
                if (isDup) duplicateCount++;
                parsed.push({ code, type, isDuplicate: isDup });
            }

            appState.bulkParsedData = parsed;
            renderBulkPreview(parsed, duplicateCount);

            if (parsed.length > 0) {
                showToast(`Đã nhận diện ${parsed.length} mã hợp lệ từ file!`, 'success');
            } else {
                showToast('Không tìm thấy dòng mã hợp lệ nào trong file.', 'warning');
            }
        } catch (err) {
            console.error('Lỗi phân tích file Excel:', err);
            showToast('Lỗi đọc file: ' + err.message, 'error');
        }
    };

    reader.readAsArrayBuffer(file);
}

function openBulkImportModal() {
    const modal = document.getElementById('modal-bulk-import');
    const textarea = document.getElementById('bulk-textarea');
    const previewWrapper = document.getElementById('bulk-preview-wrapper');
    const btnConfirm = document.getElementById('btn-confirm-import');

    if (textarea) textarea.value = '';
    removeSelectedFile();
    switchImportTab('file');

    if (previewWrapper) previewWrapper.classList.add('hidden');
    if (btnConfirm) btnConfirm.disabled = true;
    if (modal) modal.classList.remove('hidden');
}

function closeBulkImportModal() {
    document.getElementById('modal-bulk-import').classList.add('hidden');
}

function previewBulkImport() {
    const text = document.getElementById('bulk-textarea').value || '';
    const lines = text.split(/\r?\n/);
    const parsed = [];
    const existingCodes = new Set(appState.coupons.map(c => c.code));
    let duplicateCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (!rawLine) continue;

        // Tách theo Tab (khi copy từ Google Sheet/Excel), hoặc dấu phẩy, hoặc khoảng trắng liên tiếp
        let parts = rawLine.split(/\t/);
        if (parts.length < 2) {
            parts = rawLine.split(/,/);
        }
        if (parts.length < 2) {
            parts = rawLine.split(/\s{2,}/);
        }

        if (parts.length >= 2) {
            const code = parts[0].trim().toUpperCase();
            const type = parts[1].trim().toUpperCase();

            // Bỏ qua dòng tiêu đề nếu người dùng copy cả header
            if (code === 'MÃ COUPON' || code === 'MA COUPON' || code === 'CODE' || type === 'LOẠI PMH' || type === 'LOAI PMH') {
                continue;
            }

            if (code && type) {
                const isDup = existingCodes.has(code);
                if (isDup) duplicateCount++;
                parsed.push({ code, type, isDuplicate: isDup });
            }
        }
    }

    appState.bulkParsedData = parsed;
    renderBulkPreview(parsed, duplicateCount);
}

function renderBulkPreview(parsed, duplicateCount) {
    const previewWrapper = document.getElementById('bulk-preview-wrapper');
    const tbody = document.getElementById('bulk-preview-tbody');
    const countEl = document.getElementById('preview-valid-count');
    const dupEl = document.getElementById('preview-duplicate-warning');
    const btnConfirm = document.getElementById('btn-confirm-import');

    if (parsed && parsed.length > 0) {
        previewWrapper.classList.remove('hidden');
        countEl.innerText = parsed.length;
        dupEl.innerText = duplicateCount > 0 ? `(Có ${duplicateCount} mã đã có trong kho)` : '';
        btnConfirm.disabled = false;

        tbody.innerHTML = '';
        parsed.slice(0, 30).forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-muted">${idx + 1}</td>
                <td><span class="coupon-code-pill">${item.code}</span></td>
                <td><strong>${item.type}</strong></td>
                <td>${item.isDuplicate ? '<span class="status-badge status-warning">Đã có (Cập nhật)</span>' : '<span class="status-badge status-available">Mã mới</span>'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (parsed.length > 30) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="text-muted text-center">... và ${parsed.length - 30} mã khác tiếp theo ...</td>`;
            tbody.appendChild(tr);
        }
    } else {
        previewWrapper.classList.add('hidden');
        btnConfirm.disabled = true;
    }
}

function confirmBulkImport() {
    if (!appState.bulkParsedData || appState.bulkParsedData.length === 0) return;

    let addedCount = 0;
    let updatedCount = 0;
    const now = new Date().toISOString();

    appState.bulkParsedData.forEach(item => {
        const existing = appState.coupons.find(c => c.code === item.code);
        if (existing) {
            existing.type = item.type;
            existing.updatedAt = now;
            updatedCount++;
        } else {
            appState.coupons.push({
                code: item.code,
                type: item.type,
                status: 'UNUSED',
                warehouse: '',
                orderId: '',
                recipient: '',
                recipientId: '',
                updatedAt: now
            });
            addedCount++;
        }
    });

    saveAndSyncCoupons();
    closeBulkImportModal();
    renderCouponsTable();
    renderDashboard();
    updateTypeDropdowns();

    showToast(`Đã nạp thành công! (${addedCount} mã mới, ${updatedCount} cập nhật)`, 'success');
}

// ==================== 9. THÊM 1 MÃ ĐƠN LẺ ====================
function openAddSingleModal() {
    document.getElementById('single-code').value = '';
    document.getElementById('single-type').value = '';
    document.getElementById('modal-add-single').classList.remove('hidden');
    document.getElementById('single-code').focus();
}

function closeAddSingleModal() {
    document.getElementById('modal-add-single').classList.add('hidden');
}

function handleSaveSingleCoupon(event) {
    event.preventDefault();
    const code = (document.getElementById('single-code').value || '').trim().toUpperCase();
    const type = (document.getElementById('single-type').value || '').trim().toUpperCase();

    if (!code || !type) return;

    const existing = appState.coupons.find(c => c.code === code);
    if (existing) {
        if (!confirm(`Mã "${code}" đã có trong kho (${existing.type} - ${existing.status}). Bạn có muốn cập nhật lại thành loại "${type}" không?`)) {
            return;
        }
        existing.type = type;
        existing.updatedAt = new Date().toISOString();
        showToast(`Đã cập nhật mã ${code}`, 'success');
    } else {
        appState.coupons.push({
            code: code,
            type: type,
            status: 'UNUSED',
            warehouse: '',
            orderId: '',
            recipient: '',
            recipientId: '',
            updatedAt: new Date().toISOString()
        });
        showToast(`Đã thêm mã mới ${code}`, 'success');
    }

    saveAndSyncCoupons();
    closeAddSingleModal();
    renderCouponsTable();
    renderDashboard();
    updateTypeDropdowns();
}

// ==================== 10. QUẢN LÝ CÚ PHÁP & XEM TRƯỚC LINE ====================
function updateLinePreview() {
    const textarea = document.getElementById('syntax-textarea');
    const text = textarea ? textarea.value : appState.syntax;
    const charCountEl = document.getElementById('syntax-char-count');
    const previewBubble = document.getElementById('phone-preview-bubble');

    if (charCountEl) charCountEl.innerText = text.length;
    if (previewBubble) {
        previewBubble.innerText = text;
    }
}

function resetSyntaxToDefaultPrompt() {
    if (confirm('Bạn có muốn khôi phục nội dung cú pháp về biểu mẫu gốc mặc định không?')) {
        document.getElementById('syntax-textarea').value = INITIAL_SYNTAX;
        updateLinePreview();
        showToast('Đã khôi phục cú pháp gốc. Nhớ bấm "Lưu Lên Firebase" để lưu lại.', 'info');
    }
}

function copySyntaxText() {
    const textarea = document.getElementById('syntax-textarea');
    textarea.select();
    navigator.clipboard.writeText(textarea.value).then(() => {
        showToast('Đã sao chép nội dung cú pháp vào clipboard!', 'success');
    }).catch(err => {
        showToast('Không thể copy: ' + err.message, 'error');
    });
}

function saveSyntaxToFirebase() {
    const text = (document.getElementById('syntax-textarea').value || '').trim();
    if (!text) {
        showToast('Nội dung cú pháp không được để trống!', 'error');
        return;
    }

    appState.syntax = text;
    saveSyntaxToLocal();

    // Nếu có URL Firebase, đẩy thẳng lên Firebase qua REST API
    if (appState.firebaseConfig.databaseUrl) {
        const url = getFirebaseEndpoint('/syntax.json');
        showSyncing(true);

        fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                updatedAt: new Date().toISOString(),
                updatedBy: `Admin ${appState.currentUser}`
            })
        })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(() => {
            showSyncing(false);
            showToast('Đã lưu cú pháp thành công lên Firebase!', 'success');
        })
        .catch(err => {
            showSyncing(false);
            console.error('Lỗi lưu Firebase:', err);
            showToast('Lưu offline thành công (Lỗi đẩy Firebase: ' + err.message + ')', 'warning');
        });
    } else {
        showToast('Đã lưu cú pháp vào bộ nhớ máy (Chưa cấu hình Firebase URL)', 'info');
    }
}

// ==================== 11. ĐỒNG BỘ VỚI FIREBASE REST API ====================
function getFirebaseEndpoint(path) {
    let base = appState.firebaseConfig.databaseUrl.trim().replace(/\/$/, '');
    let url = base + path;
    if (appState.firebaseConfig.authSecret) {
        url += (url.includes('?') ? '&' : '?') + 'auth=' + encodeURIComponent(appState.firebaseConfig.authSecret);
    }
    return url;
}

function handleSaveFirebaseConfig(event) {
    event.preventDefault();
    const dbUrl = (document.getElementById('fb-database-url').value || '').trim();
    const apiKey = (document.getElementById('fb-api-key').value || '').trim();
    const authSecret = (document.getElementById('fb-auth-secret').value || '').trim();

    appState.firebaseConfig = {
        databaseUrl: dbUrl,
        apiKey: apiKey,
        authSecret: authSecret
    };

    localStorage.setItem('pmh_firebase_config', JSON.stringify(appState.firebaseConfig));
    updateFirebaseStatusBadge();
    showToast('Đã lưu cấu hình Firebase thành công!', 'success');

    // Tự động kiểm tra và đồng bộ dữ liệu
    testFirebaseConnection();
}

function testFirebaseConnection() {
    const dbUrl = (document.getElementById('fb-database-url').value || '').trim();
    const resultBox = document.getElementById('fb-test-result');
    const resultText = document.getElementById('fb-test-result-text');

    if (!dbUrl) {
        resultBox.className = 'alert-box error';
        resultText.innerText = 'Vui lòng nhập Firebase Database URL trước khi kiểm tra!';
        resultBox.classList.remove('hidden');
        return;
    }

    resultBox.className = 'alert-box';
    resultBox.style.background = 'rgba(99, 102, 241, 0.15)';
    resultText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kết nối tới Firebase Realtime Database...';
    resultBox.classList.remove('hidden');

    const testUrl = getFirebaseEndpoint('/test_connection.json');
    const startTime = Date.now();

    fetch(testUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ping: 'pong',
            timestamp: new Date().toISOString(),
            testedBy: `Admin ${appState.currentUser}`
        })
    })
    .then(res => {
        const duration = Date.now() - startTime;
        if (!res.ok) throw new Error(`Lỗi mã phản hồi HTTP ${res.status}`);
        return res.json().then(() => duration);
    })
    .then(duration => {
        resultBox.className = 'alert-box success';
        resultText.innerHTML = `<strong>KẾT NỐI THÀNH CÔNG! ⚡ Tốc độ phản hồi cực nhanh: ${duration}ms</strong> (Đã ghi nhận quyền ghi và đọc Database).`;
        updateFirebaseStatusBadge(true);
        // Đồng bộ dữ liệu hiện có lên Firebase
        syncLocalToFirebase();
    })
    .catch(err => {
        resultBox.className = 'alert-box error';
        resultText.innerHTML = `<strong>Kết nối thất bại:</strong> ${err.message}. Hãy kiểm tra lại URL hoặc Realtime Database Rules (đảm bảo cho phép read/write).`;
        updateFirebaseStatusBadge(false);
    });
}

function syncLocalToFirebase() {
    if (!appState.firebaseConfig.databaseUrl) return;

    // 1. Đẩy Coupons
    const couponsUrl = getFirebaseEndpoint('/coupons.json');
    fetch(couponsUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.coupons)
    }).catch(e => console.error('Lỗi sync coupons:', e));

    // 2. Đẩy Cú pháp
    const syntaxUrl = getFirebaseEndpoint('/syntax.json');
    fetch(syntaxUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: appState.syntax,
            updatedAt: new Date().toISOString()
        })
    }).catch(e => console.error('Lỗi sync syntax:', e));
}

function syncDataFromFirebase(isUserClick = false) {
    if (!appState.firebaseConfig.databaseUrl) {
        if (isUserClick) showToast('Đang ở chế độ Local (Chưa cấu hình Firebase URL)', 'info');
        return;
    }

    showSyncing(true);

    // Lấy dữ liệu từ Firebase
    const couponsUrl = getFirebaseEndpoint('/coupons.json');
    const syntaxUrl = getFirebaseEndpoint('/syntax.json');
    const adminsUrl = getFirebaseEndpoint('/admins.json');
    const settingsUrl = getFirebaseEndpoint('/settings.json');
    const schedulesUrl = getFirebaseEndpoint('/schedules.json');
    const groupsUrl = getFirebaseEndpoint('/groups.json');

    Promise.all([
        fetch(couponsUrl).then(r => r.ok ? r.json() : null),
        fetch(syntaxUrl).then(r => r.ok ? r.json() : null),
        fetch(adminsUrl).then(r => r.ok ? r.json() : null),
        fetch(settingsUrl).then(r => r.ok ? r.json() : null),
        fetch(schedulesUrl).then(r => r.ok ? r.json() : null),
        fetch(groupsUrl).then(r => r.ok ? r.json() : null)
    ])
    .then(([fbCoupons, fbSyntax, fbAdmins, fbSettings, fbSchedules, fbGroups]) => {
        showSyncing(false);

        if (fbCoupons && Array.isArray(fbCoupons)) {
            appState.coupons = fbCoupons;
            saveCouponsToLocal();
            renderCouponsTable();
            renderDashboard();
            updateTypeDropdowns();
        }

        if (fbSyntax && fbSyntax.text) {
            appState.syntax = fbSyntax.text;
            saveSyntaxToLocal();
            const syntaxTextarea = document.getElementById('syntax-textarea');
            if (syntaxTextarea) {
                syntaxTextarea.value = appState.syntax;
                updateLinePreview();
            }
        }

        // Xử lý danh sách Admin
        if (fbAdmins && typeof fbAdmins === 'object') {
            appState.admins = Object.entries(fbAdmins).map(([id, a]) => ({ id, ...a }));
        } else {
            // Khởi tạo admin mặc định của Sơn nếu chưa có
            appState.admins = [
                {
                    id: 'admin_son_default',
                    name: 'Admin Sơn (Chủ tài khoản)',
                    userId: 'U272dcb226f96e4e17e561b19ba8ab679',
                    role: 'ADMIN',
                    active: true,
                    note: 'Khai báo mặc định từ hệ thống'
                }
            ];
            // Lưu lên Firebase
            fetch(getFirebaseEndpoint('/admins/admin_son_default.json'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appState.admins[0])
            }).catch(() => {});
        }
        renderAdminsTable();

        // Xử lý cấu hình phê duyệt
        if (fbSettings && typeof fbSettings === 'object') {
            appState.settings = fbSettings;
            updateApprovalModeUi(!!fbSettings.autoApprove);
        }

        // Xử lý danh sách Lịch Hẹn Thông Báo (Schedules)
        if (fbSchedules && typeof fbSchedules === 'object') {
            if (Array.isArray(fbSchedules)) {
                appState.schedules = fbSchedules.filter(Boolean);
            } else {
                appState.schedules = Object.entries(fbSchedules).map(([id, s]) => ({ id, ...s }));
            }
        } else {
            appState.schedules = [];
        }

        // Xử lý danh sách Nhóm BOT Đang Tham Gia (Groups)
        if (fbGroups && typeof fbGroups === 'object') {
            if (Array.isArray(fbGroups)) {
                appState.groups = fbGroups.filter(Boolean);
            } else {
                appState.groups = Object.entries(fbGroups).map(([id, g]) => ({ id, groupId: g.groupId || id, ...g }));
            }
        } else {
            appState.groups = [];
        }

        renderSchedulesTable();
        renderGroupsList();
        updateScheduleMetrics();

        if (isUserClick) {
            showToast('Đã đồng bộ dữ liệu mới nhất từ Firebase!', 'success');
        }
    })
    .catch(err => {
        showSyncing(false);
        console.error('Lỗi tải từ Firebase:', err);
        if (isUserClick) {
            showToast('Không thể tải từ Firebase: ' + err.message, 'error');
        }
    });
}

function saveAndSyncCoupons() {
    saveCouponsToLocal();
    if (appState.firebaseConfig.databaseUrl) {
        showSyncing(true);
        const couponsUrl = getFirebaseEndpoint('/coupons.json');
        fetch(couponsUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.coupons)
        })
        .then(() => showSyncing(false))
        .catch(err => {
            showSyncing(false);
            console.error('Lỗi sync coupons:', err);
        });
    }
}

function updateFirebaseStatusBadge(isLive) {
    const badge = document.getElementById('badge-firebase-status');
    if (!badge) return;

    if (isLive === true || (appState.firebaseConfig.databaseUrl && isLive !== false)) {
        badge.innerText = 'Online 🟢';
        badge.style.background = 'var(--success-bg)';
        badge.style.color = 'var(--success)';
        badge.style.border = '1px solid var(--success-border)';
    } else {
        badge.innerText = 'Local 🔵';
        badge.style.background = 'rgba(255, 255, 255, 0.08)';
        badge.style.color = 'var(--text-muted)';
        badge.style.border = 'none';
    }
}

function showSyncing(isSyncing) {
    const text = document.getElementById('sync-status-text');
    const dot = document.querySelector('.status-dot');
    if (!text || !dot) return;

    if (isSyncing) {
        text.innerText = 'Đang đồng bộ...';
        dot.style.background = 'var(--warning)';
        dot.style.boxShadow = '0 0 8px var(--warning)';
    } else {
        text.innerText = 'Đã đồng bộ';
        dot.style.background = 'var(--success)';
        dot.style.boxShadow = '0 0 8px var(--success)';
    }
}

// ==================== 12. XUẤT EXCEL & FILE MẪU ====================
function exportCouponsToExcel() {
    if (!appState.coupons || appState.coupons.length === 0) {
        showToast('Kho mã đang trống, không có dữ liệu để xuất!', 'info');
        return;
    }

    if (typeof XLSX === 'undefined') {
        // Fallback về CSV nếu thư viện chưa sẵn sàng
        return exportCouponsToCSV();
    }

    try {
        const header = ['STT', 'Mã Coupon', 'Loại PMH', 'Trạng Thái', 'Mã Kho', 'Mã Đơn Hàng', 'Người Nhận', 'Thời Gian Cập Nhật'];
        const rows = appState.coupons.map((c, idx) => [
            idx + 1,
            c.code || '',
            c.type || '',
            c.status === 'UNUSED' ? 'Chưa sử dụng' : 'Đã phát',
            c.warehouse || '',
            c.orderId || '',
            c.recipient || '',
            c.updatedAt ? new Date(c.updatedAt).toLocaleString('vi-VN') : ''
        ]);

        const wsData = [header, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Căn chỉnh độ rộng cột chuẩn
        ws['!cols'] = [
            { wch: 6 },   // STT
            { wch: 18 },  // Mã Coupon
            { wch: 14 },  // Loại PMH
            { wch: 16 },  // Trạng Thái
            { wch: 12 },  // Mã Kho
            { wch: 16 },  // MĐH
            { wch: 18 },  // Người Nhận
            { wch: 22 }   // Cập Nhật
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Kho Coupon PMH');

        const todayStr = new Date().toISOString().slice(0, 10);
        const fileName = `Kho_Coupon_PMH_${todayStr}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast(`Đã xuất ${appState.coupons.length} mã ra file Excel (${fileName})!`, 'success');
    } catch (err) {
        console.error('Lỗi xuất Excel:', err);
        exportCouponsToCSV();
    }
}

function downloadCouponTemplate() {
    if (typeof XLSX === 'undefined') {
        // Fallback CSV nếu chưa nạp XLSX
        let csv = '\uFEFFMã Coupon,Loại PMH\n';
        csv += '9UD9GJWNSD,ML200\n';
        csv += 'I8XDVRT4AK,ML200\n';
        csv += 'ICT100-AB12,ICT100\n';
        csv += 'ICT200-CD34,ICT200\n';
        csv += 'ICT500-EF56,ICT500\n';
        csv += 'RM17-GH78,RM17\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Mau_Nhap_Coupon.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Đã tải xuống file mẫu Mau_Nhap_Coupon.csv (2 cột)!', 'success');
        return;
    }

    try {
        const headers = ['Mã Coupon', 'Loại PMH'];
        const sampleData = [
            ['9UD9GJWNSD', 'ML200'],
            ['I8XDVRT4AK', 'ML200'],
            ['ICT100-AB12', 'ICT100'],
            ['ICT200-CD34', 'ICT200'],
            ['ICT500-EF56', 'ICT500'],
            ['RM17-GH78', 'RM17']
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        ws['!cols'] = [
            { wch: 22 },
            { wch: 18 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap');
        XLSX.writeFile(wb, 'Mau_Nhap_Coupon.xlsx');
        showToast('Đã tải về file mẫu Mau_Nhap_Coupon.xlsx!', 'success');
    } catch (err) {
        console.error('Lỗi tạo file mẫu Excel:', err);
        showToast('Lỗi tạo file mẫu: ' + err.message, 'error');
    }
}

function exportCouponsToCSV() {
    if (!appState.coupons || appState.coupons.length === 0) {
        showToast('Kho mã đang trống, không có dữ liệu để xuất!', 'info');
        return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'STT,Mã Coupon,Loại PMH,Trạng Thái,Mã Kho,MĐH,Người Nhận,Thời Gian\n';

    appState.coupons.forEach((c, i) => {
        csv += `${i + 1},"${c.code}","${c.type}","${c.status}","${c.warehouse || ''}","${c.orderId || ''}","${c.recipient || ''}","${c.updatedAt || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kho_Coupon_PMH_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống file CSV!', 'success');
}

function copyBotCodeSnippet() {
    const code = document.getElementById('bot-code-snippet').innerText;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Đã sao chép đoạn mã tích hợp cho BOT.JS!', 'success');
    });
}

// ==================== 13. TOAST NOTIFICATIONS & HELPERS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 200ms ease';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    } catch (e) {
        return dateStr;
    }
}

function pad(num) {
    return num < 10 ? '0' + num : num;
}

// ==================== 14. QUẢN LÝ & KHAI BÁO ADMIN ====================
function renderAdminsTable() {
    const tbody = document.getElementById('admins-tbody');
    const badgeCount = document.getElementById('badge-total-admins');
    if (!tbody) return;

    const admins = appState.admins || [];
    if (badgeCount) badgeCount.innerText = admins.length;

    tbody.innerHTML = '';

    if (admins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-muted" style="text-align: center; padding: 24px;">
                    Chưa có tài khoản Admin nào được khai báo. Hãy bấm nút "Thêm Admin LINE" hoặc nhắn tin "admin" riêng cho Bot LINE.
                </td>
            </tr>
        `;
        return;
    }

    admins.forEach((adm, index) => {
        const tr = document.createElement('tr');
        const isActive = adm.active !== false;

        tr.innerHTML = `
            <td class="text-muted">${index + 1}</td>
            <td>
                <strong style="color: #0F172A; font-size: 0.92rem;">${adm.name || 'Admin'}</strong>
            </td>
            <td>
                <span class="coupon-code-pill" style="font-family: monospace; font-weight: 600; color: #4F46E5;">${adm.userId || adm.lineId || '-'}</span>
            </td>
            <td>
                <span style="font-size: 0.84rem; font-weight: 600; color: ${adm.role === 'ADMIN' ? '#4F46E5' : '#0284C7'};">
                    <i class="fa-solid ${adm.role === 'ADMIN' ? 'fa-shield-halved' : 'fa-user-check'}"></i>
                    ${adm.role === 'ADMIN' ? 'Quản Trị Viên' : 'Người Phê Duyệt'}
                </span>
            </td>
            <td>
                <span class="status-badge" style="color: ${isActive ? '#16A34A' : '#DC2626'};">
                    <i class="fa-solid ${isActive ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                    ${isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                </span>
            </td>
            <td class="text-muted" style="font-size: 0.82rem;">
                ${adm.note || '-'}
            </td>
            <td class="text-right">
                <div class="table-actions">
                    <button class="btn-icon" title="${isActive ? 'Tạm khóa quyền duyệt' : 'Mở khóa quyền duyệt'}" onclick="toggleAdminStatus('${adm.id}')">
                        <i class="fa-solid ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn-icon danger" title="Xóa Admin này" onclick="deleteAdminPrompt('${adm.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddAdminModal(editId = null) {
    const modal = document.getElementById('modal-admin');
    const titleEl = document.getElementById('modal-admin-title');
    const idInput = document.getElementById('admin-edit-id');
    const nameInput = document.getElementById('admin-name');
    const userIdInput = document.getElementById('admin-user-id');
    const roleInput = document.getElementById('admin-role');
    const noteInput = document.getElementById('admin-note');

    if (editId) {
        const target = appState.admins.find(a => a.id === editId);
        if (target) {
            titleEl.innerText = 'Chỉnh Sửa Admin LINE';
            idInput.value = target.id;
            nameInput.value = target.name || '';
            userIdInput.value = target.userId || '';
            roleInput.value = target.role || 'ADMIN';
            noteInput.value = target.note || '';
        }
    } else {
        titleEl.innerText = 'Thêm Admin LINE';
        idInput.value = '';
        nameInput.value = '';
        userIdInput.value = '';
        roleInput.value = 'ADMIN';
        noteInput.value = '';
    }

    modal.classList.remove('hidden');
}

function closeAdminModal() {
    const modal = document.getElementById('modal-admin');
    if (modal) modal.classList.add('hidden');
}

function handleSaveAdmin(e) {
    e.preventDefault();

    const id = document.getElementById('admin-edit-id').value;
    const name = document.getElementById('admin-name').value.trim();
    const userId = document.getElementById('admin-user-id').value.trim();
    const role = document.getElementById('admin-role').value;
    const note = document.getElementById('admin-note').value.trim();

    if (!name || !userId) {
        showToast('Vui lòng nhập tên và LINE User ID!', 'warning');
        return;
    }

    const adminId = id || ('adm_' + Date.now());
    const adminObj = {
        name,
        userId,
        role,
        note,
        active: true,
        updatedAt: new Date().toISOString()
    };

    // Cập nhật state cục bộ
    const existingIdx = appState.admins.findIndex(a => a.id === adminId);
    if (existingIdx !== -1) {
        appState.admins[existingIdx] = { ...appState.admins[existingIdx], ...adminObj };
    } else {
        appState.admins.push({ id: adminId, ...adminObj });
    }

    renderAdminsTable();
    closeAdminModal();
    showToast('Đang lưu thông tin Admin lên Firebase...', 'info');

    // Đẩy lên Firebase
    const url = getFirebaseEndpoint(`/admins/${adminId}.json`);
    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminObj)
    })
    .then(r => r.json())
    .then(() => {
        showToast(`Đã lưu Admin ${name} thành công! Có hiệu lực ngay lập tức.`, 'success');
    })
    .catch(err => {
        console.error('Lỗi lưu admin:', err);
        showToast('Lỗi khi lưu lên Firebase!', 'error');
    });
}

function toggleAdminStatus(adminId) {
    const target = appState.admins.find(a => a.id === adminId);
    if (!target) return;

    target.active = !(target.active !== false);
    renderAdminsTable();

    const url = getFirebaseEndpoint(`/admins/${adminId}.json`);
    fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: target.active, updatedAt: new Date().toISOString() })
    })
    .then(() => {
        showToast(`Đã ${target.active ? 'kích hoạt' : 'tạm khóa'} Admin ${target.name}!`, 'success');
    })
    .catch(err => console.error(err));
}

function deleteAdminPrompt(adminId) {
    const target = appState.admins.find(a => a.id === adminId);
    if (!target) return;

    if (confirm(`Bạn có chắc chắn muốn xóa quyền Admin của "${target.name}" (${target.userId}) không?`)) {
        appState.admins = appState.admins.filter(a => a.id !== adminId);
        renderAdminsTable();

        const url = getFirebaseEndpoint(`/admins/${adminId}.json`);
        fetch(url, { method: 'DELETE' })
        .then(() => {
            showToast(`Đã xóa Admin ${target.name} khỏi hệ thống!`, 'success');
        })
        .catch(err => console.error(err));
    }
}

function handleApprovalModeChange(mode) {
    const isAuto = mode === 'auto';
    updateApprovalModeUi(isAuto);

    appState.settings = appState.settings || {};
    appState.settings.autoApprove = isAuto;

    const url = getFirebaseEndpoint('/settings.json');
    fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApprove: isAuto, updatedAt: new Date().toISOString() })
    })
    .then(() => {
        showToast(`Đã chuyển sang chế độ: ${isAuto ? 'Tự động phát mã tức thì ⚡' : 'Duyệt thủ công qua lệnh DUYỆT 🛡️'}!`, 'success');
    })
    .catch(err => console.error(err));
}

function updateApprovalModeUi(autoApprove) {
    const manualRadio = document.getElementById('mode-manual');
    const autoRadio = document.getElementById('mode-auto');
    const manualLabel = document.getElementById('label-mode-manual');
    const autoLabel = document.getElementById('label-mode-auto');

    if (manualRadio && autoRadio) {
        manualRadio.checked = !autoApprove;
        autoRadio.checked = autoApprove;
    }

    if (manualLabel && autoLabel) {
        if (autoApprove) {
            autoLabel.style.borderColor = '#4F46E5';
            autoLabel.style.background = '#EEF2FF';
            manualLabel.style.borderColor = '#E2E8F0';
            manualLabel.style.background = 'transparent';
        } else {
            manualLabel.style.borderColor = '#16A34A';
            manualLabel.style.background = '#F0FDF4';
            autoLabel.style.borderColor = '#E2E8F0';
            autoLabel.style.background = 'transparent';
        }
    }
}

// ==================== 15. QUẢN LÝ LỊCH HẸN THÔNG BÁO & NHÓM LINE ====================
function renderSchedulesTable() {
    const tbody = document.getElementById('schedules-tbody');
    const badgeCount = document.getElementById('badge-total-schedules');
    if (!tbody) return;

    const schedules = appState.schedules || [];
    const activeCount = schedules.filter(s => s.active !== false).length;
    if (badgeCount) badgeCount.innerText = activeCount;

    tbody.innerHTML = '';

    if (schedules.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-muted" style="text-align: center; padding: 32px 16px;">
                    <div style="font-size: 1.1rem; margin-bottom: 6px; color: #0F172A; font-weight: 600;">⏰ Chưa có lịch hẹn thông báo nào</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">Bạn có thể tạo lịch gửi thông báo tự động hàng ngày hoặc gửi một lần tới các nhóm LINE BOT đang tham gia.</div>
                    <button class="btn btn-primary btn-sm" onclick="openAddScheduleModal()">
                        <i class="fa-solid fa-plus"></i> Tạo Lịch Hẹn Đầu Tiên
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    schedules.forEach((sched, index) => {
        const tr = document.createElement('tr');
        const isActive = sched.active !== false;

        // Chu kỳ
        let typeBadge = '<span class="status-badge" style="color: #4F46E5; background: #EEF2FF; border: 1px solid #C7D2FE;"><i class="fa-solid fa-repeat"></i> Hàng ngày</span>';
        if (sched.scheduleType === 'WEEKDAYS') {
            typeBadge = '<span class="status-badge" style="color: #0284C7; background: #E0F2FE; border: 1px solid #BAE6FD;"><i class="fa-solid fa-business-time"></i> Thứ 2 - Thứ 6</span>';
        } else if (sched.scheduleType === 'ONCE') {
            typeBadge = `<span class="status-badge" style="color: #D97706; background: #FEF3C7; border: 1px solid #FDE68A;"><i class="fa-solid fa-calendar-day"></i> Một lần (${sched.date || 'Hôm nay'})</span>`;
        }

        // Nhóm nhận tin
        let targetText = '<span style="color: #059669; font-weight: 500;"><i class="fa-solid fa-users"></i> Tất cả nhóm</span>';
        if (Array.isArray(sched.target)) {
            targetText = `<span style="color: #4F46E5; font-weight: 500;"><i class="fa-solid fa-layer-group"></i> ${sched.target.length} nhóm đã chọn</span>`;
        }

        // Trạng thái chạy cuối
        let lastRunText = 'Chưa chạy';
        if (sched.lastRunAt) {
            lastRunText = formatDate(sched.lastRunAt);
            if (sched.lastStatus === 'SUCCESS') {
                lastRunText += ' <span style="color: #16A34A;">(Thành công)</span>';
            } else if (sched.lastStatus) {
                lastRunText += ` <span style="color: #DC2626;">(${sched.lastStatus})</span>`;
            }
        }

        const cleanContent = escapeHtml(sched.content || '');
        const snippet = cleanContent.length > 55 ? cleanContent.slice(0, 55) + '...' : cleanContent;

        tr.innerHTML = `
            <td class="text-muted">${index + 1}</td>
            <td>
                <strong style="color: #0F172A; font-size: 0.92rem;">${escapeHtml(sched.title || 'Thông báo')}</strong>
                ${sched.createdBy ? `<div style="font-size: 0.76rem; color: #64748B;">Tạo bởi: ${escapeHtml(sched.createdBy)}</div>` : ''}
            </td>
            <td>
                <div style="font-size: 0.85rem; color: #334155; max-width: 280px; white-space: pre-wrap; line-height: 1.3;" title="${cleanContent}">${snippet}</div>
            </td>
            <td>
                <div style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; font-family: monospace;">
                    <i class="fa-regular fa-clock" style="color: #4F46E5;"></i> ${sched.time || '--:--'}
                </div>
                ${typeBadge}
            </td>
            <td>${targetText}</td>
            <td>
                <span class="status-badge" style="color: ${isActive ? '#16A34A' : '#64748B'}; background: ${isActive ? '#F0FDF4' : '#F1F5F9'}; border: 1px solid ${isActive ? '#BBF7D0' : '#E2E8F0'};">
                    <i class="fa-solid ${isActive ? 'fa-circle-check' : 'fa-circle-pause'}"></i>
                    ${isActive ? 'Đang bật' : 'Tạm tắt'}
                </span>
            </td>
            <td style="font-size: 0.82rem; color: #64748B;">
                ${lastRunText}
            </td>
            <td class="text-right">
                <div class="table-actions">
                    <button class="btn-icon" title="Gửi thử ngay tới nhóm" onclick="triggerScheduleNow('${sched.id}')" style="color: #D97706;">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                    <button class="btn-icon" title="${isActive ? 'Tạm tắt lịch hẹn' : 'Kích hoạt lịch hẹn'}" onclick="toggleScheduleStatus('${sched.id}')" style="color: ${isActive ? '#16A34A' : '#64748B'};">
                        <i class="fa-solid ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button class="btn-icon" title="Chỉnh sửa lịch hẹn" onclick="openAddScheduleModal('${sched.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon danger" title="Xóa lịch hẹn này" onclick="deleteSchedulePrompt('${sched.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderGroupsList() {
    const tbody = document.getElementById('groups-tbody');
    if (!tbody) return;

    const groups = appState.groups || [];
    tbody.innerHTML = '';

    if (groups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-muted" style="text-align: center; padding: 24px;">
                    Chưa ghi nhận nhóm nào. Khi BOT được mời vào nhóm LINE hoặc có tin nhắn trong nhóm, BOT sẽ tự động lưu thông tin nhóm tại đây.
                </td>
            </tr>
        `;
        return;
    }

    groups.forEach((grp, idx) => {
        const tr = document.createElement('tr');
        const isActive = grp.active !== false;

        tr.innerHTML = `
            <td class="text-muted">${idx + 1}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${grp.pictureUrl ? `<img src="${grp.pictureUrl}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">` : '<i class="fa-solid fa-users" style="color: #4F46E5;"></i>'}
                    <strong style="color: #0F172A; font-size: 0.88rem;">${escapeHtml(grp.groupName || 'Nhóm LINE')}</strong>
                </div>
            </td>
            <td>
                <span class="coupon-code-pill" style="font-family: monospace; font-size: 0.78rem;">${grp.groupId || grp.id}</span>
            </td>
            <td>
                <span class="status-badge" style="color: ${isActive ? '#16A34A' : '#DC2626'}; font-size: 0.78rem;">
                    <i class="fa-solid ${isActive ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                    ${isActive ? 'Đang kết nối' : 'Đã rời'}
                </span>
            </td>
            <td style="font-size: 0.8rem; color: #64748B;">
                ${grp.lastActiveAt ? formatDate(grp.lastActiveAt) : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateScheduleMetrics() {
    const groups = appState.groups || [];
    const schedules = appState.schedules || [];

    const activeGroupsCount = groups.filter(g => g.active !== false).length;
    const activeSchedulesCount = schedules.filter(s => s.active !== false).length;

    const elTotalGroups = document.getElementById('stat-total-groups');
    const elActiveSchedules = document.getElementById('stat-active-schedules');
    const elTotalSchedulesSub = document.getElementById('stat-total-schedules-sub');
    const elLastTime = document.getElementById('stat-last-broadcast-time');
    const elLastTitle = document.getElementById('stat-last-broadcast-title');

    if (elTotalGroups) elTotalGroups.innerText = activeGroupsCount;
    if (elActiveSchedules) elActiveSchedules.innerText = activeSchedulesCount;
    if (elTotalSchedulesSub) elTotalSchedulesSub.innerText = schedules.length;

    // Tìm lịch chạy gần nhất
    const ranSchedules = schedules.filter(s => s.lastRunAt).sort((a, b) => new Date(b.lastRunAt) - new Date(a.lastRunAt));
    if (ranSchedules.length > 0 && elLastTime && elLastTitle) {
        const latest = ranSchedules[0];
        elLastTime.innerText = formatDate(latest.lastRunAt);
        elLastTitle.innerText = `"${latest.title || 'Thông báo'}" (${latest.lastSentCount || 0} nhóm)`;
    } else if (elLastTime && elLastTitle) {
        elLastTime.innerText = 'Chưa phát';
        elLastTitle.innerText = '-';
    }
}

function openAddScheduleModal(editId = null) {
    const modal = document.getElementById('modal-schedule');
    const titleEl = document.getElementById('modal-schedule-title');
    const idInput = document.getElementById('schedule-edit-id');
    const titleInput = document.getElementById('schedule-title');
    const contentInput = document.getElementById('schedule-content');
    const typeInput = document.getElementById('schedule-type');
    const timeInput = document.getElementById('schedule-time');
    const dateInput = document.getElementById('schedule-date');
    const activeInput = document.getElementById('schedule-active');

    // Populate group checkboxes
    populateGroupCheckboxes('custom-groups-checkboxes', []);

    if (editId) {
        const target = appState.schedules.find(s => s.id === editId);
        if (target) {
            titleEl.innerText = 'Chỉnh Sửa Lịch Hẹn Thông Báo';
            idInput.value = target.id;
            titleInput.value = target.title || '';
            contentInput.value = target.content || '';
            typeInput.value = target.scheduleType || 'DAILY';
            timeInput.value = target.time || '08:00';
            dateInput.value = target.date || '';
            activeInput.checked = target.active !== false;

            if (Array.isArray(target.target)) {
                document.getElementById('target-type-custom').checked = true;
                toggleCustomGroupSelection(true);
                populateGroupCheckboxes('custom-groups-checkboxes', target.target);
            } else {
                document.getElementById('target-type-all').checked = true;
                toggleCustomGroupSelection(false);
            }
        }
    } else {
        titleEl.innerText = 'Tạo Lịch Hẹn Giờ Thông Báo';
        idInput.value = '';
        titleInput.value = '';
        contentInput.value = '';
        typeInput.value = 'DAILY';
        timeInput.value = '08:00';
        dateInput.value = new Date().toISOString().slice(0, 10);
        activeInput.checked = true;

        document.getElementById('target-type-all').checked = true;
        toggleCustomGroupSelection(false);
    }

    handleScheduleTypeChange();
    modal.classList.remove('hidden');
}

function closeScheduleModal() {
    const modal = document.getElementById('modal-schedule');
    if (modal) modal.classList.add('hidden');
}

function handleScheduleTypeChange() {
    const type = document.getElementById('schedule-type').value;
    const dateGroup = document.getElementById('group-schedule-date');
    if (dateGroup) {
        if (type === 'ONCE') {
            dateGroup.classList.remove('hidden');
        } else {
            dateGroup.classList.add('hidden');
        }
    }
}

function toggleCustomGroupSelection(isCustom) {
    const container = document.getElementById('custom-groups-container');
    if (container) {
        if (isCustom) container.classList.remove('hidden');
        else container.classList.add('hidden');
    }
}

function populateGroupCheckboxes(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groups = (appState.groups || []).filter(g => g.active !== false);
    if (groups.length === 0) {
        container.innerHTML = '<div style="font-size: 0.82rem; color: var(--text-muted); padding: 4px;">Chưa có nhóm nào được kết nối. Khi bot vào nhóm sẽ tự hiện ở đây.</div>';
        return;
    }

    container.innerHTML = groups.map(g => `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; padding: 3px 0;">
            <input type="checkbox" value="${g.groupId}" ${selectedIds.includes(g.groupId) ? 'checked' : ''} style="accent-color: #4F46E5;">
            <span><strong>${escapeHtml(g.groupName || 'Nhóm')}</strong> <span style="color:#64748B; font-family:monospace; font-size:0.75rem;">(${g.groupId})</span></span>
        </label>
    `).join('');
}

function handleSaveSchedule(e) {
    e.preventDefault();

    const id = document.getElementById('schedule-edit-id').value;
    const title = document.getElementById('schedule-title').value.trim();
    const content = document.getElementById('schedule-content').value.trim();
    const scheduleType = document.getElementById('schedule-type').value;
    const time = document.getElementById('schedule-time').value.trim();
    const date = document.getElementById('schedule-date').value;
    const active = document.getElementById('schedule-active').checked;
    const isCustomTarget = document.getElementById('target-type-custom').checked;

    let target = 'ALL_GROUPS';
    if (isCustomTarget) {
        const checkedBoxes = document.querySelectorAll('#custom-groups-checkboxes input[type="checkbox"]:checked');
        const selected = Array.from(checkedBoxes).map(cb => cb.value);
        if (selected.length === 0) {
            showToast('Vui lòng tích chọn ít nhất 1 nhóm hoặc chọn "Tất cả nhóm"!', 'warning');
            return;
        }
        target = selected;
    }

    const schedId = id || ('sched_' + Date.now());
    const schedObj = {
        id: schedId,
        title,
        content,
        scheduleType,
        time,
        date: scheduleType === 'ONCE' ? date : '',
        target,
        active,
        updatedAt: new Date().toISOString()
    };

    const existingIdx = appState.schedules.findIndex(s => s.id === schedId);
    if (existingIdx !== -1) {
        appState.schedules[existingIdx] = { ...appState.schedules[existingIdx], ...schedObj };
    } else {
        schedObj.createdAt = new Date().toISOString();
        appState.schedules.push(schedObj);
    }

    renderSchedulesTable();
    updateScheduleMetrics();
    closeScheduleModal();
    showToast('Đang lưu lịch hẹn lên Firebase...', 'info');

    const url = getFirebaseEndpoint(`/schedules/${schedId}.json`);
    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedObj)
    })
    .then(() => {
        showToast(`Đã lưu lịch hẹn "${title}" thành công!`, 'success');
    })
    .catch(err => {
        console.error('Lỗi lưu schedule:', err);
        showToast('Lỗi khi lưu lên Firebase!', 'error');
    });
}

function toggleScheduleStatus(schedId) {
    const target = appState.schedules.find(s => s.id === schedId);
    if (!target) return;

    target.active = !(target.active !== false);
    renderSchedulesTable();
    updateScheduleMetrics();

    const url = getFirebaseEndpoint(`/schedules/${schedId}.json`);
    fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: target.active, updatedAt: new Date().toISOString() })
    })
    .then(() => {
        showToast(`Đã ${target.active ? 'bật' : 'tắt'} lịch hẹn "${target.title}"!`, 'success');
    })
    .catch(err => console.error(err));
}

function deleteSchedulePrompt(schedId) {
    const target = appState.schedules.find(s => s.id === schedId);
    if (!target) return;

    if (confirm(`Bạn có chắc chắn muốn xóa lịch hẹn "${target.title}" không?`)) {
        appState.schedules = appState.schedules.filter(s => s.id !== schedId);
        renderSchedulesTable();
        updateScheduleMetrics();

        const url = getFirebaseEndpoint(`/schedules/${schedId}.json`);
        fetch(url, { method: 'DELETE' })
        .then(() => {
            showToast(`Đã xóa lịch hẹn "${target.title}"!`, 'success');
        })
        .catch(err => console.error(err));
    }
}

function triggerScheduleNow(schedId) {
    const target = appState.schedules.find(s => s.id === schedId);
    if (!target) return;

    if (!confirm(`Bạn có chắc muốn gửi ngay thông báo của lịch "${target.title}" tới các nhóm không?`)) return;

    showToast(`Đang gửi thông báo "${target.title}" tới các nhóm...`, 'info');

    fetch(`/api/schedules/trigger/${schedId}`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast(`🚀 Đã gửi thông báo thành công đến ${data.sentCount}/${data.total} nhóm!`, 'success');
            syncDataFromFirebase(false);
        } else {
            showToast(`Không thể gửi: ${data.message || data.reason || 'Lỗi không xác định'}`, 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi khi gửi thông báo: ' + err.message, 'error');
    });
}

function openBroadcastModal() {
    const modal = document.getElementById('modal-broadcast');
    const contentInput = document.getElementById('broadcast-content');
    contentInput.value = '';
    document.getElementById('broadcast-target-all').checked = true;
    toggleBroadcastCustomGroups(false);
    populateGroupCheckboxes('broadcast-groups-checkboxes', []);
    modal.classList.remove('hidden');
}

function closeBroadcastModal() {
    const modal = document.getElementById('modal-broadcast');
    if (modal) modal.classList.add('hidden');
}

function toggleBroadcastCustomGroups(isCustom) {
    const container = document.getElementById('broadcast-groups-container');
    if (container) {
        if (isCustom) container.classList.remove('hidden');
        else container.classList.add('hidden');
    }
}

function handleSendBroadcast(e) {
    e.preventDefault();
    const content = document.getElementById('broadcast-content').value.trim();
    if (!content) {
        showToast('Vui lòng nhập nội dung thông báo!', 'warning');
        return;
    }

    const isCustom = document.getElementById('broadcast-target-custom').checked;
    let targets = 'ALL_GROUPS';
    if (isCustom) {
        const checkedBoxes = document.querySelectorAll('#broadcast-groups-checkboxes input[type="checkbox"]:checked');
        const selected = Array.from(checkedBoxes).map(cb => cb.value);
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 nhóm để gửi!', 'warning');
            return;
        }
        targets = selected;
    }

    closeBroadcastModal();
    showToast('Đang phát sóng thông báo tới các nhóm...', 'info');

    fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, targets })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast(`🚀 Đã phát sóng thành công đến ${data.sentCount}/${data.total} nhóm!`, 'success');
            syncDataFromFirebase(false);
        } else {
            showToast(`Không thể phát sóng: ${data.message || 'Lỗi không xác định'}`, 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi gửi broadcast: ' + err.message, 'error');
    });
}

function refreshGroupsInfo() {
    showToast('Đang làm mới thông tin và avatar các nhóm từ LINE API...', 'info');
    fetch('/api/groups/refresh', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast(`Đã làm mới thông tin ${data.updatedCount} nhóm thành công!`, 'success');
            syncDataFromFirebase(false);
        } else {
            showToast('Không thể làm mới: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Lỗi làm mới: ' + err.message, 'error');
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
