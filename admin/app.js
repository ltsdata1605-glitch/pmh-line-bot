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
    keywords: [],
    keywordSearch: '',
    settings: { autoApprove: false },
    dashboardStockPage: 1,
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

    // Khởi tạo luồng dữ liệu Live Realtime (SSE)
    initRealtimeEventStream();
}

function handleLogout() {
    if (realtimeEventSource) {
        try {
            realtimeEventSource.close();
        } catch (e) {}
        realtimeEventSource = null;
    }
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
    } else if (tabId === 'keywords') {
        titleEl.innerText = 'Thư Viện Từ Khoá Tự Động';
        descEl.innerText = 'Quản lý danh sách từ khoá tự động phản hồi nội dung và hình ảnh khi người dùng chat';
        renderKeywordsGrid();
        updateKeywordMetrics();
    } else if (tabId === 'audit') {
        titleEl.innerText = 'Nhật Ký Thao Tác Quản Trị';
        descEl.innerText = 'Ghi vết toàn bộ hành động nạp mã, xoá mã, đổi cú pháp và quản lý hệ thống';
        loadAuditLogsFromFirebase();
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
    const warningBanner = document.getElementById('stock-warning-banner');
    if (!tbody) return;

    const typeMap = appState.dashboardTypeMap || {};
    const searchVal = (document.getElementById('stock-type-search')?.value || '').trim().toLowerCase();
    const filterVal = document.getElementById('stock-type-filter')?.value || 'ALL';

    tbody.innerHTML = '';

    const allTypeNames = Object.keys(typeMap);
    if (allTypeNames.length === 0) {
        if (warningBanner) warningBanner.style.display = 'none';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').innerText = 'Chưa có loại mã nào trong kho. Vào tab "Kho Mã Coupon" để nạp dữ liệu.';
        }
        return;
    }

    // Phân loại các nhóm cảnh báo (<30, <20, <10, 0)
    const outList = [];
    const criticalList = [];
    const highList = [];
    const warningList = [];

    allTypeNames.forEach(t => {
        const u = typeMap[t].unused;
        if (u === 0) outList.push({ name: t, count: u });
        else if (u < 10) criticalList.push({ name: t, count: u });
        else if (u < 20) highList.push({ name: t, count: u });
        else if (u < 30) warningList.push({ name: t, count: u });
    });

    // Render Banner Cảnh Báo Tự Động
    if (warningBanner) {
        const totalAlerts = outList.length + criticalList.length + highList.length + warningList.length;
        if (totalAlerts > 0) {
            warningBanner.style.display = 'block';

            let chipsHtml = '';
            criticalList.forEach(item => {
                chipsHtml += `<span class="warning-chip critical" onclick="filterDashboardStockType('${item.name}')" title="Bấm để lọc mã ${item.name}"><i class="fa-solid fa-circle-exclamation"></i> ${item.name}: <strong>${item.count} mã</strong></span>`;
            });
            highList.forEach(item => {
                chipsHtml += `<span class="warning-chip high" onclick="filterDashboardStockType('${item.name}')" title="Bấm để lọc mã ${item.name}"><i class="fa-solid fa-triangle-exclamation"></i> ${item.name}: <strong>${item.count} mã</strong></span>`;
            });
            warningList.forEach(item => {
                chipsHtml += `<span class="warning-chip warning" onclick="filterDashboardStockType('${item.name}')" title="Bấm để lọc mã ${item.name}"><i class="fa-solid fa-circle-notch"></i> ${item.name}: <strong>${item.count} mã</strong></span>`;
            });
            outList.forEach(item => {
                chipsHtml += `<span class="warning-chip out" onclick="filterDashboardStockType('${item.name}')" title="Bấm để lọc mã ${item.name}"><i class="fa-solid fa-ban"></i> ${item.name}: 0 mã</span>`;
            });

            warningBanner.innerHTML = `
                <div class="stock-warning-header">
                    <div>
                        <div class="stock-warning-title">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.15rem; color: #EA580C;"></i>
                            <span>Cảnh Báo Tồn Kho Sắp Hết (${totalAlerts} loại cần chú ý)</span>
                        </div>
                        <div style="display: flex; gap: 12px; margin-top: 4px; font-size: 0.78rem; flex-wrap: wrap;">
                            ${criticalList.length > 0 ? `<span style="color: #DC2626; font-weight: 600;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #DC2626; margin-right: 4px;"></span>${criticalList.length} loại &lt; 10 mã (Khẩn cấp)</span>` : ''}
                            ${highList.length > 0 ? `<span style="color: #EA580C; font-weight: 600;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #EA580C; margin-right: 4px;"></span>${highList.length} loại &lt; 20 mã (Cần nạp)</span>` : ''}
                            ${warningList.length > 0 ? `<span style="color: #D97706; font-weight: 600;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #D97706; margin-right: 4px;"></span>${warningList.length} loại &lt; 30 mã (Sắp hết)</span>` : ''}
                            ${outList.length > 0 ? `<span style="color: #475569; font-weight: 600;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #475569; margin-right: 4px;"></span>${outList.length} loại 0 mã</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="btn btn-primary btn-sm" onclick="openBulkImportModal()" style="font-size: 0.8rem; padding: 5px 12px;">
                            <i class="fa-solid fa-plus"></i> Nạp Mã Ngay
                        </button>
                    </div>
                </div>
                <div class="stock-warning-chips" style="max-height: 108px; overflow-y: auto; padding-right: 4px;">
                    ${chipsHtml}
                </div>
            `;
        } else {
            warningBanner.style.display = 'block';
            warningBanner.innerHTML = `
                <div class="stock-safe-banner">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Trạng thái kho rất tốt: Tất cả ${allTypeNames.length} loại PMH đều có số lượng tồn an toàn (&ge; 30 mã).</span>
                </div>
            `;
        }
    }

    // Lọc theo search và trạng thái
    const filteredTypes = allTypeNames.filter(typeName => {
        if (searchVal && !typeName.toLowerCase().includes(searchVal)) {
            return false;
        }

        const unused = typeMap[typeName].unused;
        if (filterVal === 'CRITICAL' && (unused >= 10 || unused === 0)) return false;
        if (filterVal === 'HIGH' && (unused < 10 || unused >= 20)) return false;
        if (filterVal === 'LOW' && (unused < 20 || unused >= 30)) return false;
        if (filterVal === 'OUT' && unused > 0) return false;
        if (filterVal === 'OK' && unused < 30) return false;

        return true;
    });

    // Sắp xếp ưu tiên: Hết mã (0) -> Cực thấp (<10) -> Cần nạp (<20) -> Sắp hết (<30) -> Theo số lượng tăng dần
    filteredTypes.sort((a, b) => {
        return typeMap[a].unused - typeMap[b].unused || a.localeCompare(b);
    });

    if (filteredTypes.length === 0) {
        const paginationEl = document.getElementById('stock-type-pagination');
        if (paginationEl) paginationEl.style.display = 'none';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.querySelector('p').innerText = 'Không tìm thấy loại PMH nào phù hợp với bộ lọc.';
        }
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // GIỚI HẠN 10 DÒNG MỖI TRANG & PHÂN TRANG THÔNG MINH
    const pageSize = 10;
    const totalPages = Math.ceil(filteredTypes.length / pageSize) || 1;
    if (!appState.dashboardStockPage || appState.dashboardStockPage < 1) appState.dashboardStockPage = 1;
    if (appState.dashboardStockPage > totalPages) appState.dashboardStockPage = totalPages;

    const startIndex = (appState.dashboardStockPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredTypes.length);
    const pagedTypes = filteredTypes.slice(startIndex, endIndex);

    pagedTypes.forEach((typeName, index) => {
        const rowNumber = startIndex + index + 1;
        const data = typeMap[typeName];
        const isOut = data.unused === 0;
        const isCritical = data.unused > 0 && data.unused < 10;
        const isHigh = data.unused >= 10 && data.unused < 20;
        const isWarning = data.unused >= 20 && data.unused < 30;
        const fillPct = data.total > 0 ? Math.round((data.unused / data.total) * 100) : 0;

        let statusBadgeHtml = '';
        let unusedBadgeHtml = '';
        let barColor = '#10B981';

        if (isOut) {
            statusBadgeHtml = `<span class="status-badge" style="color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA;"><i class="fa-solid fa-circle-xmark"></i> Hết mã (0)</span>`;
            unusedBadgeHtml = `<strong style="color: #DC2626; font-size: 0.95rem;">0</strong>`;
            barColor = '#CBD5E1';
        } else if (isCritical) {
            statusBadgeHtml = `<span class="status-badge" style="color: #DC2626; background: #FEF2F2; border: 1px solid #FECACA;"><i class="fa-solid fa-circle-exclamation"></i> Khẩn cấp (&lt; 10)</span>`;
            unusedBadgeHtml = `<strong style="color: #DC2626; font-size: 0.95rem;">${data.unused}</strong>`;
            barColor = '#EF4444';
        } else if (isHigh) {
            statusBadgeHtml = `<span class="status-badge" style="color: #EA580C; background: #FFF7ED; border: 1px solid #FFEDD5;"><i class="fa-solid fa-triangle-exclamation"></i> Cần nạp (&lt; 20)</span>`;
            unusedBadgeHtml = `<strong style="color: #EA580C; font-size: 0.95rem;">${data.unused}</strong>`;
            barColor = '#F97316';
        } else if (isWarning) {
            statusBadgeHtml = `<span class="status-badge" style="color: #D97706; background: #FEF3C7; border: 1px solid #FDE68A;"><i class="fa-solid fa-triangle-exclamation"></i> Sắp hết (&lt; 30)</span>`;
            unusedBadgeHtml = `<strong style="color: #D97706; font-size: 0.95rem;">${data.unused}</strong>`;
            barColor = '#F59E0B';
        } else {
            statusBadgeHtml = `<span class="status-badge unused" style="color: #16A34A; background: #F0FDF4; border: 1px solid #BBF7D0;"><i class="fa-solid fa-circle-check"></i> Khả dụng (&ge; 30)</span>`;
            unusedBadgeHtml = `<strong style="color: #16A34A; font-size: 0.95rem;">${data.unused}</strong>`;
            barColor = '#10B981';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-muted" style="font-size: 0.85rem;">${rowNumber}</td>
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

    // Render Thanh Phân Trang (Hiển thị 10 dòng/trang)
    const paginationEl = document.getElementById('stock-type-pagination');
    const paginationInfo = document.getElementById('stock-type-pagination-info');
    const paginationButtons = document.getElementById('stock-type-pagination-buttons');
    if (paginationEl && paginationInfo && paginationButtons) {
        if (filteredTypes.length > pageSize) {
            paginationEl.style.display = 'flex';
            paginationInfo.innerHTML = `Hiển thị <strong>${startIndex + 1} - ${endIndex}</strong> trên tổng số <strong>${filteredTypes.length}</strong> loại PMH`;

            let btnsHtml = `
                <button class="btn btn-secondary btn-sm" onclick="changeDashboardStockPage(-1)" ${appState.dashboardStockPage <= 1 ? 'disabled style="opacity: 0.45; cursor: not-allowed; padding: 4px 10px; font-size: 0.82rem;"' : 'style="padding: 4px 10px; font-size: 0.82rem;"'}>
                    <i class="fa-solid fa-chevron-left"></i> Trước
                </button>
                <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-dark); padding: 0 8px;">
                    Trang ${appState.dashboardStockPage} / ${totalPages}
                </span>
                <button class="btn btn-secondary btn-sm" onclick="changeDashboardStockPage(1)" ${appState.dashboardStockPage >= totalPages ? 'disabled style="opacity: 0.45; cursor: not-allowed; padding: 4px 10px; font-size: 0.82rem;"' : 'style="padding: 4px 10px; font-size: 0.82rem;"'}>
                    Sau <i class="fa-solid fa-chevron-right"></i>
                </button>
            `;
            paginationButtons.innerHTML = btnsHtml;
        } else {
            paginationEl.style.display = 'none';
        }
    }
}

function changeDashboardStockPage(delta) {
    appState.dashboardStockPage = (appState.dashboardStockPage || 1) + delta;
    renderDashboardStockList();
}

function filterDashboardStockType(typeName) {
    const searchInput = document.getElementById('stock-type-search');
    if (searchInput) {
        searchInput.value = typeName;
    }
    appState.dashboardStockPage = 1;
    renderDashboardStockList();
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
        recordAuditLog('DELETE_COUPON', `Xoá mã coupon "${code}" khỏi kho`);
        renderCouponsTable();
        renderDashboard();
        updateTypeDropdowns();
        showToast(`Đã xóa mã ${code}`, 'info');
    }
}

function clearAllCouponsPrompt() {
    const totalCount = appState.coupons.length;
    if (totalCount === 0) {
        showToast('Kho hiện tại đang trống, không có mã nào để xóa.', 'info');
        return;
    }

    const unusedCount = appState.coupons.filter(c => c.status === 'UNUSED').length;
    const sentCount = totalCount - unusedCount;

    const confirmMsg =
        `⚠️ CẢNH BÁO NGUY HIỂM: XOÁ TẤT CẢ MÃ TRONG KHO ⚠️\n\n` +
        `Bạn có chắc chắn muốn XOÁ VĨNH VIỄN TOÀN BỘ ${totalCount.toLocaleString('vi-VN')} MÃ COUPON đang có trong kho?\n\n` +
        `• Mã chưa dùng (Tồn kho): ${unusedCount.toLocaleString('vi-VN')} mã\n` +
        `• Mã đã phát (Đã duyệt): ${sentCount.toLocaleString('vi-VN')} mã\n\n` +
        `🚨 LƯU Ý: Toàn bộ dữ liệu mã trong kho sẽ bị xoá sạch về 0 và KHÔNG THỂ khôi phục lại!\n\n` +
        `Bấm "OK" để tiếp tục xác nhận xoá toàn bộ.`;

    if (!confirm(confirmMsg)) return;

    if (!confirm(`🔴 XÁC NHẬN LẦN CUỐI:\n\nBạn thực sự muốn xoá sạch toàn bộ ${totalCount.toLocaleString('vi-VN')} mã coupon trong kho về 0?`)) return;

    appState.coupons = [];
    saveAndSyncCoupons();
    recordAuditLog('CLEAR_ALL', `Xoá sạch toàn bộ ${totalCount.toLocaleString('vi-VN')} mã coupon trong kho`);
    renderCouponsTable();
    renderDashboard();
    updateTypeDropdowns();
    showToast(`Đã xoá sạch toàn bộ ${totalCount.toLocaleString('vi-VN')} mã trong kho!`, 'success');
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
        recordAuditLog('CLEAR_SENT', `Xoá ${sentCount} mã coupon đã phát`);
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
    recordAuditLog('IMPORT_COUPONS', `Nạp file danh sách mã coupon: ${addedCount} mã mới, ${updatedCount} mã cập nhật`);
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
            recordAuditLog('UPDATE_SYNTAX', 'Cập nhật nội dung cú pháp đăng ký PMH');
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
    const keywordsUrl = getFirebaseEndpoint('/keywords.json');

    Promise.all([
        fetch(couponsUrl).then(r => r.ok ? r.json() : null),
        fetch(syntaxUrl).then(r => r.ok ? r.json() : null),
        fetch(adminsUrl).then(r => r.ok ? r.json() : null),
        fetch(settingsUrl).then(r => r.ok ? r.json() : null),
        fetch(schedulesUrl).then(r => r.ok ? r.json() : null),
        fetch(groupsUrl).then(r => r.ok ? r.json() : null),
        fetch(keywordsUrl).then(r => r.ok ? r.json() : null)
    ])
    .then(([fbCoupons, fbSyntax, fbAdmins, fbSettings, fbSchedules, fbGroups, fbKeywords]) => {
        showSyncing(false);

        if (fbCoupons) {
            if (Array.isArray(fbCoupons)) {
                appState.coupons = fbCoupons;
            } else if (typeof fbCoupons === 'object') {
                appState.coupons = Object.values(fbCoupons).filter(Boolean);
            }
        } else {
            appState.coupons = [];
        }
        saveCouponsToLocal();
        renderCouponsTable();
        renderDashboard();
        updateTypeDropdowns();

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

        // Xử lý Thư Viện Từ Khoá (Keywords)
        if (fbKeywords && typeof fbKeywords === 'object') {
            if (Array.isArray(fbKeywords)) {
                appState.keywords = fbKeywords.filter(Boolean);
            } else {
                appState.keywords = Object.entries(fbKeywords).map(([id, k]) => ({ id, ...k }));
            }
        } else {
            appState.keywords = [];
        }

        renderSchedulesTable();
        renderGroupsList();
        updateScheduleMetrics();
        renderKeywordsGrid();
        updateKeywordMetrics();

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
    const dot = document.getElementById('sync-status-dot') || document.querySelector('.status-dot');
    if (!text || !dot) return;

    if (isSyncing) {
        text.innerText = 'Đang đồng bộ...';
        dot.className = 'status-dot online';
        dot.style.background = 'var(--warning)';
        dot.style.boxShadow = '0 0 8px var(--warning)';
    } else {
        text.innerText = 'Live Realtime';
        dot.className = 'status-dot online pulse';
        dot.style.background = 'var(--success)';
        dot.style.boxShadow = '';
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

// ==================== 13. TOAST NOTIFICATIONS & REALTIME HUB ====================
let realtimeEventSource = null;

function showToast(message, type = 'info', duration = 3800) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><div class="toast-body">${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 200ms ease';
        setTimeout(() => toast.remove(), 200);
    }, duration);
}

function updateRealtimeIndicator(connected) {
    const dot = document.getElementById('sync-status-dot') || document.querySelector('.status-dot');
    const text = document.getElementById('sync-status-text');
    if (!dot || !text) return;

    if (connected) {
        dot.className = 'status-dot online pulse';
        dot.style.background = 'var(--success)';
        dot.style.boxShadow = '';
        text.innerText = 'Live Realtime';
    } else {
        dot.className = 'status-dot offline';
        dot.style.background = 'var(--danger)';
        dot.style.boxShadow = '0 0 6px rgba(220, 38, 38, 0.4)';
        text.innerText = 'Mất kết nối';
    }
}

function initRealtimeEventStream() {
    if (realtimeEventSource) {
        try {
            realtimeEventSource.close();
        } catch (e) {}
        realtimeEventSource = null;
    }

    if (typeof EventSource === 'undefined') {
        console.warn('[Realtime] Trình duyệt không hỗ trợ Server-Sent Events');
        return;
    }

    try {
        realtimeEventSource = new EventSource('/api/realtime/stream');

        realtimeEventSource.onopen = () => {
            console.log('[Realtime] Đã kết nối SSE Server thành công!');
            updateRealtimeIndicator(true);
        };

        // Khi có đơn hàng phát mã thành công (tự động phát hoặc admin duyệt)
        realtimeEventSource.addEventListener('coupon_sent', (e) => {
            try {
                const payload = JSON.parse(e.data);
                const info = payload.data || {};
                console.log('[Realtime] Sự kiện coupon_sent:', info);

                // Tự động nhảy số tồn kho & cập nhật bảng mã ngay lập tức
                syncDataFromFirebase(false);

                // Hiển thị Popup Toast thông báo đơn mới được cấp
                const actionTitle = info.isReplaced ? '🔄 Đổi & Cấp Lại Mã Mới' : '⚡ Phát Mã PMH Thành Công';
                const content = `
                    <div style="font-weight: 700; font-size: 0.95rem; color: #065F46;">${actionTitle}</div>
                    <div style="font-size: 0.85rem; line-height: 1.4; margin-top: 2px;">
                        • MĐH: <span style="font-family: monospace; font-weight: 600;">${info.mdh || info.orderId || '-'}</span> (${info.maKho || 'Kho'})<br>
                        • Khách: <b>${info.recipient || 'Nhân viên'}</b> | Loại: <b>${info.loaiPMH || '-'}</b><br>
                        • Mã cấp: <span style="font-family: monospace; font-weight: 700; color: #047857;">${info.code || '-'}</span>
                    </div>
                `;
                showToast(content, 'success', 5000);
            } catch (err) {
                console.error('[Realtime] Lỗi xử lý coupon_sent:', err);
            }
        });

        // Khi có đơn hàng mới đang chờ Admin duyệt
        realtimeEventSource.addEventListener('request_pending', (e) => {
            try {
                const payload = JSON.parse(e.data);
                const info = payload.data || {};
                console.log('[Realtime] Sự kiện request_pending:', info);

                syncDataFromFirebase(false);

                const content = `
                    <div style="font-weight: 700; font-size: 0.95rem; color: #92400E;">⏳ Có Đơn Hàng Mới Chờ Duyệt</div>
                    <div style="font-size: 0.85rem; line-height: 1.4; margin-top: 2px;">
                        • MĐH: <span style="font-family: monospace; font-weight: 600;">${info.mdh || info.orderId || '-'}</span> (${info.maKho || 'Kho'})<br>
                        • Người xin: <b>${info.displayName || 'Nhân viên'}</b> | PMH: <b>${info.loaiPMH || '-'}</b>
                    </div>
                `;
                showToast(content, 'warning', 6000);
            } catch (err) {
                console.error('[Realtime] Lỗi xử lý request_pending:', err);
            }
        });

        // Khi có mã bị thu hồi
        realtimeEventSource.addEventListener('coupon_revoked', (e) => {
            try {
                const payload = JSON.parse(e.data);
                const info = payload.data || {};
                syncDataFromFirebase(false);
                showToast(`ℹ️ Đã thu hồi mã: <b>${info.code || ''}</b>`, 'info', 4000);
            } catch (err) {
                console.error('[Realtime] Lỗi xử lý coupon_revoked:', err);
            }
        });

        realtimeEventSource.onerror = (err) => {
            console.warn('[Realtime] Mất kết nối SSE stream, tự động kết nối lại...', err);
            updateRealtimeIndicator(false);
        };
    } catch (e) {
        console.warn('[Realtime] Lỗi khởi tạo EventSource:', e);
        updateRealtimeIndicator(false);
    }
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
        } else if (sched.scheduleType === 'CUSTOM_DAYS' || (Array.isArray(sched.daysOfWeek) && sched.daysOfWeek.length > 0)) {
            const dayNames = { '1': 'T2', '2': 'T3', '3': 'T4', '4': 'T5', '5': 'T6', '6': 'T7', '0': 'CN' };
            const daysStr = (sched.daysOfWeek || []).map(d => dayNames[String(d)] || d).join(', ');
            typeBadge = `<span class="status-badge" style="color: #7C3AED; background: #F5F3FF; border: 1px solid #DDD6FE;"><i class="fa-solid fa-calendar-week"></i> ${daysStr || 'Tùy chọn'}</span>`;
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

    // Reset day chips
    const dayCheckboxes = document.querySelectorAll('input[name="schedule-day"]');
    dayCheckboxes.forEach(cb => { cb.checked = false; });

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

            if (target.daysOfWeek && Array.isArray(target.daysOfWeek)) {
                dayCheckboxes.forEach(cb => {
                    if (target.daysOfWeek.map(Number).includes(Number(cb.value))) {
                        cb.checked = true;
                    }
                });
            } else if (target.scheduleType === 'WEEKDAYS') {
                dayCheckboxes.forEach(cb => {
                    const v = Number(cb.value);
                    cb.checked = (v >= 1 && v <= 5);
                });
            } else {
                dayCheckboxes.forEach(cb => { cb.checked = true; });
            }

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

        // Default: pre-check all days
        dayCheckboxes.forEach(cb => { cb.checked = true; });

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
    const daysGroup = document.getElementById('group-schedule-days');

    if (dateGroup) {
        if (type === 'ONCE') {
            dateGroup.classList.remove('hidden');
        } else {
            dateGroup.classList.add('hidden');
        }
    }

    if (daysGroup) {
        if (type === 'CUSTOM_DAYS') {
            daysGroup.classList.remove('hidden');
        } else {
            daysGroup.classList.add('hidden');
        }
    }
}

function selectDaysPreset(preset) {
    const checkboxes = document.querySelectorAll('input[name="schedule-day"]');
    checkboxes.forEach(cb => {
        const val = Number(cb.value);
        if (preset === 'ALL') {
            cb.checked = true;
        } else if (preset === 'WEEKDAYS') {
            cb.checked = (val >= 1 && val <= 5);
        } else if (preset === 'WEEKEND') {
            cb.checked = (val === 6 || val === 0);
        } else if (preset === 'CLEAR') {
            cb.checked = false;
        }
    });
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
        <label class="group-check-item">
            <input type="checkbox" value="${g.groupId}" ${selectedIds.includes(g.groupId) ? 'checked' : ''}>
            <div class="group-check-info">
                <span class="group-check-name" title="${escapeHtml(g.groupName || 'Nhóm')}">${escapeHtml(g.groupName || 'Nhóm')}</span>
                <span class="group-check-id">${g.groupId.slice(0, 10)}...</span>
            </div>
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

    let daysOfWeek = [];
    if (scheduleType === 'CUSTOM_DAYS') {
        const checkedDays = document.querySelectorAll('input[name="schedule-day"]:checked');
        daysOfWeek = Array.from(checkedDays).map(cb => Number(cb.value)).sort((a, b) => {
            const orderA = a === 0 ? 7 : a;
            const orderB = b === 0 ? 7 : b;
            return orderA - orderB;
        });
        if (daysOfWeek.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 thứ trong tuần!', 'warning');
            return;
        }
    } else if (scheduleType === 'WEEKDAYS') {
        daysOfWeek = [1, 2, 3, 4, 5];
    } else if (scheduleType === 'DAILY') {
        daysOfWeek = [1, 2, 3, 4, 5, 6, 0];
    }

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
        daysOfWeek,
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
        recordAuditLog('SCHEDULE', `Lưu lịch thông báo "${title}" (${schedObj.time})`);
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
            recordAuditLog('SCHEDULE', `Xoá lịch thông báo "${target.title}"`);
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

// ==================== 16. THƯ VIỆN TỪ KHOÁ TỰ ĐỘNG (KEYWORDS) ====================
const IMGBB_API_KEY = '043aad4c1ec156b8711e30fe9444cdb9';
let keywordModalImages = [];

function renderKeywordsGrid() {
    const container = document.getElementById('keywords-grid-container');
    const badgeCount = document.getElementById('badge-total-keywords');
    if (!container) return;

    const keywords = appState.keywords || [];
    const activeCount = keywords.filter(k => k.active !== false).length;
    if (badgeCount) badgeCount.innerText = activeCount;

    const searchTerm = (appState.keywordSearch || '').trim().toLowerCase();
    const filtered = keywords.filter(kw => {
        if (!searchTerm) return true;
        const kwText = String(kw.keyword || '').toLowerCase();
        const replyText = String(kw.reply_text || '').toLowerCase();
        return kwText.includes(searchTerm) || replyText.includes(searchTerm);
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFFFFF; border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
                <div style="font-size: 2.2rem; color: #94A3B8; margin-bottom: 10px;"><i class="fa-solid fa-spell-check"></i></div>
                <h3 style="font-size: 1.1rem; color: #0F172A; margin-bottom: 6px;">${searchTerm ? 'Không tìm thấy từ khoá phù hợp' : 'Chưa có từ khoá nào trong thư viện'}</h3>
                <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 16px;">
                    ${searchTerm ? 'Thử tìm với từ khoá khác hoặc tạo mới' : 'Nhấn nút bên dưới để tạo từ khoá tự động phản hồi đầu tiên cho BOT LINE'}
                </p>
                <button class="btn btn-primary btn-sm" onclick="openAddKeywordModal()">
                    <i class="fa-solid fa-plus"></i> Thêm Từ Khoá Mới
                </button>
            </div>
        `;
        return;
    }

    filtered.forEach(kw => {
        const card = document.createElement('div');
        card.className = 'keyword-card';
        const isActive = kw.active !== false;

        let rawUrls = [];
        if (kw.image_urls && Array.isArray(kw.image_urls) && kw.image_urls.length > 0) {
            rawUrls = kw.image_urls.filter(Boolean);
        } else if (kw.image_url) {
            rawUrls = [kw.image_url];
        }

        const matchBadge = kw.matchType === 'CONTAINS'
            ? '<span class="status-badge" style="background: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; font-size: 0.7rem; padding: 1px 6px; line-height: 1.3;">Chứa từ</span>'
            : '<span class="status-badge" style="background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; font-size: 0.7rem; padding: 1px 6px; line-height: 1.3;">Chính xác</span>';

        // Thumbnails thu gọn (nằm cùng hàng với nội dung)
        let imageHtml = '';
        if (rawUrls.length > 0) {
            const maxVisible = 2;
            const visibleUrls = rawUrls.slice(0, maxVisible);
            const remaining = rawUrls.length - maxVisible;

            const thumbs = visibleUrls.map((url, idx) => {
                const isLastWithMore = (idx === maxVisible - 1 && remaining > 0);
                return `
                    <div style="position: relative; width: 42px; height: 42px; flex-shrink: 0; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                        <a href="${url}" target="_blank" title="Xem ảnh gốc (${rawUrls.length} ảnh)" style="display: block; width: 100%; height: 100%;">
                            <img src="${url}" alt="Ảnh" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/42x42?text=IMG'">
                        </a>
                        ${isLastWithMore ? `<span style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15, 23, 42, 0.78); color: #FFF; font-size: 0.65rem; font-weight: 700; text-align: center; line-height: 14px;">+${remaining}</span>` : ''}
                    </div>
                `;
            }).join('');

            imageHtml = `
                <div style="display: flex; gap: 5px; align-items: center; flex-shrink: 0;">
                    ${thumbs}
                </div>
            `;
        }

        const replyContent = kw.reply_text
            ? escapeHtml(kw.reply_text)
            : '<span style="color: #94A3B8; font-style: italic;">(Không kèm văn bản, chỉ gửi ảnh)</span>';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex-wrap: wrap;">
                    <span class="keyword-pill">#${escapeHtml(kw.keyword)}</span>
                    ${matchBadge}
                </div>
                <div class="table-actions" style="margin: 0; gap: 2px;">
                    <button class="btn-icon" title="${isActive ? 'Tạm tắt từ khoá' : 'Bật từ khoá'}" onclick="toggleKeywordStatus('${kw.id}')" style="color: ${isActive ? '#16A34A' : '#94A3B8'}; font-size: 0.95rem; width: 28px; height: 28px;">
                        <i class="fa-solid ${isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                    </button>
                    <button class="btn-icon" title="Chỉnh sửa từ khoá" onclick="openAddKeywordModal('${kw.id}')" style="font-size: 0.82rem; width: 28px; height: 28px;">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon danger" title="Xóa từ khoá" onclick="deleteKeywordPrompt('${kw.id}')" style="font-size: 0.82rem; width: 28px; height: 28px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center; margin: 4px 0 6px 0;">
                <div class="keyword-reply-text" title="${escapeHtml(kw.reply_text || '')}">
                    ${replyContent}
                </div>
                ${imageHtml}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px dashed #E2E8F0; font-size: 0.72rem; color: #94A3B8;">
                <span style="display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-regular fa-clock" style="font-size: 0.7rem;"></i> ${kw.updatedAt ? formatDate(kw.updatedAt) : ''}
                </span>
                <span style="display: inline-flex; align-items: center; gap: 5px; color: ${isActive ? '#16A34A' : '#94A3B8'}; font-weight: 500;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isActive ? '#16A34A' : '#94A3B8'}; display: inline-block;"></span>
                    ${isActive ? 'Hoạt động' : 'Tạm tắt'}
                </span>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateKeywordMetrics() {
    const keywords = appState.keywords || [];
    const totalEl = document.getElementById('stat-total-keywords');
    const activeSubEl = document.getElementById('stat-active-keywords-sub');
    const imgEl = document.getElementById('stat-keywords-with-images');

    if (totalEl) totalEl.innerText = keywords.length;
    if (activeSubEl) activeSubEl.innerText = keywords.filter(k => k.active !== false).length;
    if (imgEl) imgEl.innerText = keywords.filter(k => (k.image_urls && k.image_urls.length > 0) || k.image_url).length;
}

function handleKeywordSearch(query) {
    appState.keywordSearch = query;
    renderKeywordsGrid();
}

function openAddKeywordModal(editId = null) {
    const modal = document.getElementById('modal-keyword');
    const titleEl = document.getElementById('modal-keyword-title');
    const idInput = document.getElementById('keyword-edit-id');
    const kwInput = document.getElementById('kw-keyword');
    const matchTypeInput = document.getElementById('kw-match-type');
    const replyInput = document.getElementById('kw-reply-text');
    const activeInput = document.getElementById('kw-active');
    const urlInput = document.getElementById('kw-image-url-input');

    urlInput.value = '';
    keywordModalImages = [];

    if (editId) {
        const target = appState.keywords.find(k => k.id === editId);
        if (target) {
            titleEl.innerText = 'Chỉnh Sửa Từ Khoá';
            idInput.value = target.id;
            kwInput.value = target.keyword || '';
            matchTypeInput.value = target.matchType || 'EXACT';
            replyInput.value = target.reply_text || '';
            activeInput.checked = target.active !== false;

            if (target.image_urls && Array.isArray(target.image_urls)) {
                keywordModalImages = [...target.image_urls];
            } else if (target.image_url) {
                keywordModalImages = [target.image_url];
            }
        }
    } else {
        titleEl.innerText = 'Thêm Từ Khoá Mới';
        idInput.value = '';
        kwInput.value = '';
        matchTypeInput.value = 'EXACT';
        replyInput.value = '';
        activeInput.checked = true;
    }

    renderKeywordModalImages();
    modal.classList.remove('hidden');
}

function closeKeywordModal() {
    const modal = document.getElementById('modal-keyword');
    if (modal) modal.classList.add('hidden');
}

function renderKeywordModalImages() {
    const grid = document.getElementById('kw-images-preview-grid');
    const countBadge = document.getElementById('kw-images-count-badge');
    const controls = document.getElementById('kw-add-image-controls');
    if (!grid) return;

    if (countBadge) countBadge.innerText = `${keywordModalImages.length}/4 ảnh`;

    if (controls) {
        if (keywordModalImages.length >= 4) {
            controls.style.display = 'none';
        } else {
            controls.style.display = 'flex';
        }
    }

    if (keywordModalImages.length === 0) {
        grid.innerHTML = '<div style="font-size: 0.8rem; color: #94A3B8; font-style: italic; padding: 4px 0;">Chưa có ảnh nào được đính kèm.</div>';
        return;
    }

    grid.innerHTML = keywordModalImages.map((url, idx) => `
        <div style="position: relative; width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid #CBD5E1; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex-shrink: 0;">
            <img src="${url}" alt="Preview ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" onclick="handleRemoveKeywordImage(${idx})" title="Xóa ảnh này" style="position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.65); color: #FFF; border: none; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}

function handleAddKeywordImageUrl() {
    const input = document.getElementById('kw-image-url-input');
    const url = (input.value || '').trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showToast('Link ảnh phải bắt đầu bằng http:// hoặc https://', 'warning');
        return;
    }

    if (keywordModalImages.length >= 4) {
        showToast('Chỉ được thêm tối đa 4 hình ảnh!', 'warning');
        return;
    }

    keywordModalImages.push(url);
    input.value = '';
    renderKeywordModalImages();
}

async function handleKeywordImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (keywordModalImages.length + files.length > 4) {
        showToast('Bạn chỉ được tải lên tối đa 4 ảnh cho mỗi từ khoá!', 'warning');
        event.target.value = '';
        return;
    }

    const statusText = document.getElementById('kw-upload-status-text');
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải ảnh lên CDN ImgBB...';

    showToast(`Đang tải ${files.length} ảnh lên CDN...`, 'info');

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = err => reject(err);
                reader.readAsDataURL(file);
            });

            const formData = new FormData();
            formData.append('image', base64);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data && data.success && data.data && data.data.url) {
                keywordModalImages.push(data.data.url);
            } else {
                throw new Error(data.error?.message || 'Không thể upload ảnh');
            }
        }

        renderKeywordModalImages();
        showToast('Tải ảnh lên thành công!', 'success');
    } catch (err) {
        console.error('Lỗi upload ImgBB:', err);
        showToast('Lỗi khi tải ảnh lên: ' + err.message, 'error');
    } finally {
        if (statusText) statusText.innerText = 'Chọn ảnh từ máy (Tự động tải lên CDN ImgBB)';
        event.target.value = '';
    }
}

function handleRemoveKeywordImage(index) {
    keywordModalImages.splice(index, 1);
    renderKeywordModalImages();
}

function handleSaveKeyword(e) {
    e.preventDefault();

    const id = document.getElementById('keyword-edit-id').value;
    const keyword = document.getElementById('kw-keyword').value.trim().toLowerCase();
    const matchType = document.getElementById('kw-match-type').value;
    const reply_text = document.getElementById('kw-reply-text').value.trim();
    const active = document.getElementById('kw-active').checked;

    if (!keyword || !reply_text) {
        showToast('Vui lòng nhập từ khoá và nội dung phản hồi!', 'warning');
        return;
    }

    const kwId = id || ('kw_' + Date.now());
    const kwObj = {
        id: kwId,
        keyword,
        matchType,
        reply_text,
        image_urls: [...keywordModalImages],
        image_url: keywordModalImages.length > 0 ? keywordModalImages[0] : '',
        active,
        updatedAt: new Date().toISOString()
    };

    const existingIdx = appState.keywords.findIndex(k => k.id === kwId);
    if (existingIdx !== -1) {
        appState.keywords[existingIdx] = { ...appState.keywords[existingIdx], ...kwObj };
    } else {
        kwObj.createdAt = new Date().toISOString();
        appState.keywords.push(kwObj);
    }

    renderKeywordsGrid();
    updateKeywordMetrics();
    closeKeywordModal();
    showToast('Đang lưu từ khoá lên Firebase...', 'info');

    const url = getFirebaseEndpoint(`/keywords/${kwId}.json`);
    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kwObj)
    })
    .then(() => {
        showToast(`Đã lưu từ khoá "#${keyword}" thành công!`, 'success');
    })
    .catch(err => {
        console.error('Lỗi lưu keyword:', err);
        showToast('Lỗi khi lưu lên Firebase: ' + err.message, 'error');
    });
}

function toggleKeywordStatus(kwId) {
    const target = appState.keywords.find(k => k.id === kwId);
    if (!target) return;

    target.active = !(target.active !== false);
    renderKeywordsGrid();
    updateKeywordMetrics();

    const url = getFirebaseEndpoint(`/keywords/${kwId}.json`);
    fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: target.active, updatedAt: new Date().toISOString() })
    })
    .then(() => {
        showToast(`Đã ${target.active ? 'bật' : 'tắt'} từ khoá "#${target.keyword}"!`, 'success');
    })
    .catch(err => console.error(err));
}

function deleteKeywordPrompt(kwId) {
    const target = appState.keywords.find(k => k.id === kwId);
    if (!target) return;

    if (confirm(`Bạn có chắc chắn muốn xóa từ khoá "#${target.keyword}" không?`)) {
        appState.keywords = appState.keywords.filter(k => k.id !== kwId);
        renderKeywordsGrid();
        updateKeywordMetrics();

        const url = getFirebaseEndpoint(`/keywords/${kwId}.json`);
        fetch(url, { method: 'DELETE' })
        .then(() => {
            recordAuditLog('KEYWORD', `Xoá từ khoá "#${target.keyword}"`);
            showToast(`Đã xóa từ khoá "#${target.keyword}"!`, 'success');
        })
        .catch(err => console.error(err));
    }
}

// ==================== 15. NHẬT KÝ THAO TÁC QUẢN TRỊ (AUDIT LOGS) ====================
let appAuditLogs = [];

function recordAuditLog(action, description, details = {}) {
    const currentAdmin = appState.currentUser || sessionStorage.getItem('pmh_auth_user') || localStorage.getItem('pmh_auth_user') || 'Admin';
    const logItem = {
        adminUser: String(currentAdmin),
        action: action,
        description: description,
        details: details,
        timestamp: new Date().toISOString()
    };

    if (appState.firebaseConfig.databaseUrl) {
        const url = getFirebaseEndpoint('/audit_logs.json');
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logItem)
        }).catch(err => console.error('Lỗi lưu audit log:', err));
    }
}

function loadAuditLogsFromFirebase(isUserClick = false) {
    if (!appState.firebaseConfig.databaseUrl) {
        if (isUserClick) showToast('Chưa cấu hình Firebase URL', 'info');
        return;
    }

    if (isUserClick) showToast('Đang tải nhật ký thao tác...', 'info');
    const url = getFirebaseEndpoint('/audit_logs.json');
    fetch(url)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data) {
                appAuditLogs = [];
            } else {
                appAuditLogs = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                appAuditLogs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            }
            const badge = document.getElementById('badge-total-logs');
            if (badge) badge.innerText = appAuditLogs.length;
            renderAuditLogsTable();
            if (isUserClick) showToast('Đã làm mới nhật ký!', 'success');
        })
        .catch(err => {
            console.error('Lỗi tải audit logs:', err);
            if (isUserClick) showToast('Không thể tải nhật ký', 'error');
        });
}

function renderAuditLogsTable(filteredLogs = null) {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    const list = filteredLogs !== null ? filteredLogs : appAuditLogs;
    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="padding: 30px; color: var(--text-muted);">
                    <i class="fa-regular fa-folder-open" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
                    Chưa có nhật ký thao tác nào được ghi nhận.
                </td>
            </tr>
        `;
        return;
    }

    const actionBadgeMap = {
        'IMPORT_COUPONS': '<span class="status-badge status-unused" style="background:#ECFDF5; color:#059669; border-color:#A7F3D0;"><i class="fa-solid fa-file-import"></i> Nạp mã kho</span>',
        'DELETE_COUPON': '<span class="status-badge" style="background:#FEF2F2; color:#DC2626; border-color:#FECACA;"><i class="fa-solid fa-trash"></i> Xoá mã đơn</span>',
        'CLEAR_SENT': '<span class="status-badge" style="background:#FFF7ED; color:#C2410C; border-color:#FFEDD5;"><i class="fa-solid fa-trash-can"></i> Xoá mã đã phát</span>',
        'CLEAR_ALL': '<span class="status-badge" style="background:#450A0A; color:#FEE2E2; border-color:#991B1B;"><i class="fa-solid fa-triangle-exclamation"></i> Xoá toàn bộ kho</span>',
        'UPDATE_SYNTAX': '<span class="status-badge" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;"><i class="fa-solid fa-file-code"></i> Cú pháp PMH</span>',
        'SCHEDULE': '<span class="status-badge" style="background:#F0FDF4; color:#16A34A; border-color:#BBF7D0;"><i class="fa-solid fa-clock"></i> Lịch thông báo</span>',
        'KEYWORD': '<span class="status-badge" style="background:#FEF3C7; color:#D97706; border-color:#FDE68A;"><i class="fa-solid fa-spell-check"></i> Từ khoá tự động</span>',
        'ADMIN': '<span class="status-badge" style="background:#F3E8FF; color:#9333EA; border-color:#E9D5FF;"><i class="fa-solid fa-user-shield"></i> Quản lý Admin</span>'
    };

    let html = '';
    list.forEach((log, idx) => {
        let timeFormatted = log.timestamp || '-';
        try {
            const d = new Date(log.timestamp);
            timeFormatted = d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        } catch (e) {}

        const actionBadge = actionBadgeMap[log.action] || `<span class="status-badge">${log.action || 'Hành động'}</span>`;
        const adminBadge = `<span style="font-family: monospace; font-weight: 700; color: #4F46E5; background: #EEF2FF; padding: 2px 8px; border-radius: 4px;">${log.adminUser || 'Admin'}</span>`;

        html += `
            <tr>
                <td>${idx + 1}</td>
                <td style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fa-regular fa-clock" style="margin-right: 4px;"></i>${timeFormatted}</td>
                <td>${adminBadge}</td>
                <td>${actionBadge}</td>
                <td style="font-weight: 500; color: #334155;">${escapeHtml(log.description || '-')}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function filterAuditLogs() {
    const searchVal = (document.getElementById('audit-search-input')?.value || '').toLowerCase().trim();
    const actionVal = document.getElementById('audit-action-filter')?.value || 'ALL';

    const filtered = appAuditLogs.filter(log => {
        if (actionVal !== 'ALL' && log.action !== actionVal) return false;
        if (searchVal) {
            const text = `${log.adminUser || ''} ${log.action || ''} ${log.description || ''}`.toLowerCase();
            if (!text.includes(searchVal)) return false;
        }
        return true;
    });

    renderAuditLogsTable(filtered);
}
