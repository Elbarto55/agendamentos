
// ==========================================
// KAH NAILS ADMIN SYSTEM (Server-Side DB)
// ==========================================

// --- GLOBAL ELEMENTS ---
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const navBtns = document.querySelectorAll('.sidebar-btn');
const views = document.querySelectorAll('.admin-view');
const currentDateEl = document.getElementById('current-date');

// Settings Elements
const settingOpenHour = document.getElementById('setting-open-hour');
const settingCloseHour = document.getElementById('setting-close-hour');
const settingInterval = document.getElementById('setting-interval');
const settingWorkSaturday = document.getElementById('setting-work-saturday');
const settingWorkSunday = document.getElementById('setting-work-sunday');
const saveHoursBtn = document.getElementById('save-hours-btn');
const blockDateInput = document.getElementById('block-date-input');
const addBlockDateBtn = document.getElementById('add-block-date-btn');
const blockedDatesList = document.getElementById('blocked-dates-list');
const settingWhatsappMsg = document.getElementById('setting-whatsapp-msg');
const settingWhatsappActive = document.getElementById('setting-whatsapp-active');
const saveMsgBtn = document.getElementById('save-msg-btn');
const settingBusinessPhone = document.getElementById('setting-business-phone');
const saveContactBtn = document.getElementById('save-contact-btn');
const settingWebhookActive = document.getElementById('setting-webhook-active');
const settingWebhookUrl = document.getElementById('setting-webhook-url');
const saveWebhookBtn = document.getElementById('save-webhook-btn');
const adminDateFilter = document.getElementById('admin-date-filter');

// Modals
const whatsappModal = document.getElementById('whatsapp-modal');
const closeWhatsappModalBtn = document.getElementById('close-whatsapp-modal');
const testPhoneInput = document.getElementById('test-phone-input');
const confirmTestBtn = document.getElementById('confirm-test-btn');
const serviceModal = document.getElementById('service-modal');
const serviceForm = document.getElementById('service-form');
const notificationBell = document.getElementById('notification-bell');
const notificationBadge = document.getElementById('notification-badge');

// --- GLOBAL DATA STATE ---
let lastSeenAptCount = 0;
let isInitialLoad = true;
let appointments = [];
let services = [];
let categories = [];
let appSettings = {
    openingHour: 9,
    closingHour: 18,
    interval: 30,
    workSaturday: true,
    workSunday: false,
    blockedDates: [],
    whatsappMsg: "*CONFIRMAÇÃO DE AGENDAMENTO* ✅\n\nOlá *{nome}*! Seu horário está confirmado.\n\n📅 Data: {data}\n🕒 Horário: {hora}\n💅 Serviços: {servicos}\n💰 Valor: {valor}\n\n------------------------------\n\n📍 *LOCALIZAÇÃO*\nStudio Kah Nails\nRua Exemplo, 123 - Centro\n\n🗺️ Google Maps:\nhttps://maps.google.com/?q=Studio+Kah+Nails\n\n------------------------------\n\nObrigada pela preferência! 💖",
    adminWhatsappMsg: "🔔 *NOVO AGENDAMENTO*\n\n👤 *{nome}*\n📅 {data}\n🕒 {hora}\n💅 {servicos}\n💰 {valor}\n\n(Acesse o painel para ver detalhes)",
    adminUser: { user: 'admin', pass: '1234' },
    whatsappActive: true,
    businessPhone: "",
    webhookActive: false,
    webhookUrl: "",
    webhookUrl: "",
    paymentMethods: [
        { name: "Pix", icon: "💠", description: "Aprovação Imediata" },
        { name: "Dinheiro", icon: "💵", description: "Pagamento na hora" },
        { name: "Cartão de Crédito", icon: "💳", description: "Taxas podem aplicar" },
        { name: "Cartão de Débito", icon: "💳", description: "" }
    ]
};

// ==========================================
// API LAYER (COMMUNICATION WITH SERVER)
// ==========================================

function getApiUrl() {
    const port = window.location.port;
    const host = window.location.hostname;

    // Local Development with Live Server
    if ((host === '127.0.0.1' || host === 'localhost') && port !== '3003') {
        return 'http://127.0.0.1:3003/api/db';
    }

    return '/api/db';
}

// --- NOTIFICATION STATE ---
let clearedNotifs = new Set(JSON.parse(localStorage.getItem('admin_cleared_notifs') || '[]'));

async function loadData() {
    try {
        const res = await fetch(getApiUrl());
        if (!res.ok) throw new Error('Erro ao carregar dados');
        const db = await res.json();

        // Update Global State
        services = db.services || [];
        appointments = db.appointments || [];
        categories = db.categories || [];

        // --- NOTIFICATION LOGIC ---
        // 1. Identify valid appointments (Scheduled only)
        const validApts = appointments.filter(a => a.status !== 'Cancelado');

        // 2. Filter Unread (Not in clearedNotifs)
        const unreadApts = validApts.filter(a => !clearedNotifs.has(a.id)).sort((a, b) => b.id - a.id);

        // 3. Update Badge
        const count = unreadApts.length;
        updateNotificationBadge(count);

        // 4. Update Dropdown List
        renderNotificationList(unreadApts);

        // 5. Play Sound if new Item appeared (Simple check: count increased)
        // We use a temp tracker for "last count" to know if we should ding
        if (count > lastSeenAptCount) {
            playNotificationSound();
            // showSuccess(`🔔 ${count - lastSeenAptCount} Novo(s)!`); // USER REQUEST: Disable popup
        }
        lastSeenAptCount = count;
        // ---------------------------

        // SAFE MERGE: Keep local defaults if DB is missing fields
        // ONLY merge settings on initial load to avoid overwriting Admin's work during polling
        if (isInitialLoad) {
            const remoteSettings = db.appSettings || {};
            appSettings = { ...appSettings, ...remoteSettings };

            // Ensure Payment Methods exists
            if (!appSettings.paymentMethods || appSettings.paymentMethods.length === 0) {
                console.log('⚠️ Payment Methods missing. Restoring defaults.');
                appSettings.paymentMethods = [
                    { name: "Pix", icon: "💠", description: "Aprovação Imediata" },
                    { name: "Dinheiro", icon: "💵", description: "Pagamento na hora" },
                    { name: "Cartão de Crédito", icon: "💳", description: "Taxas podem aplicar" },
                    { name: "Cartão de Débito", icon: "💳", description: "" }
                ];
                if (!remoteSettings.paymentMethods) {
                    await saveData();
                }
            }
            isInitialLoad = false;
        }

        // Refresh UI
        refreshUI();

    } catch (e) {
        console.error('❌ Erro de conexão:', e);
    }
}

async function saveData() {
    const db = {
        services,
        appointments,
        appSettings,
        categories
    };

    try {
        await fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db)
        });
        console.log('✅ Dados salvos no servidor!');
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        alert('Erro de conexão ao salvar dados. Verifique sua internet.');
    }
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

function init() {
    setupEventListeners();
    setupSettingsInputs(); // Pre-fill inputs even if hidden

    // Initial Load
    loadData();
    setInterval(loadData, 5000); // Polling sync

    // Check Login
    if (sessionStorage.getItem('isAdmin') === 'true') {
        showPanel();
    }
}

function refreshUI() {
    // Updates all active views based on current data
    const activeView = document.querySelector('.admin-view.active');

    updateDashboard(); // Always update stats

    if (activeView && activeView.id === 'clients-view') renderClients();
    if (activeView && activeView.id === 'services-view') renderServicesAdmin();
    if (activeView && activeView.id === 'categories-view') renderCategories();
    if (activeView && activeView.id === 'settings-view') renderPaymentMethodsSettings();
    if (activeView && activeView.id === 'calendar-view' && adminDateFilter) {
        renderAgendaList(adminDateFilter.value || new Date().toISOString().split('T')[0]);
    }

    // Settings specific
    renderBlockedDates();
}

function showPanel() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'flex';
    updateDashboard(); // First render
}

function switchView(viewId) {
    views.forEach(view => {
        view.classList.remove('active');
        if (view.id === `${viewId}-view`) view.classList.add('active');
    });

    // Bell Visibility (Only on Dashboard)
    const bellContainer = document.getElementById('notification-bell-container');
    if (bellContainer) {
        bellContainer.style.display = (viewId === 'dashboard') ? 'block' : 'none';
        // Also close dropdown if leaving dashboard
        if (viewId !== 'dashboard') {
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
    }

    // Refresh specific data when entering view
    const today = new Date().toISOString().split('T')[0];
    if (viewId === 'dashboard') updateDashboard();
    if (viewId === 'calendar') {
        if (adminDateFilter) adminDateFilter.value = today;
        renderAgendaList(today);
    }
    if (viewId === 'clients') renderClients();
    if (viewId === 'services') renderServicesAdmin();
    if (viewId === 'categories') renderCategories();
    if (viewId === 'settings') {
        setupSettingsInputs();
        renderPaymentMethodsSettings();
    }
}


// ==========================================
// DASHBOARD & STATS
// ==========================================

function updateDashboard() {
    if (!appointments) return;
    const today = new Date().toISOString().split('T')[0];

    const todayApts = appointments.filter(a => a.date === today && a.status !== 'Cancelado');
    const monthPrefix = today.substring(0, 7);
    const monthApts = appointments.filter(a => a.date && a.date.startsWith(monthPrefix) && a.status !== 'Cancelado');

    const elTodayRev = document.getElementById('today-revenue');
    const elTodayApt = document.getElementById('today-appointments');
    const elMonthRev = document.getElementById('month-revenue');
    const elDateDisplay = document.getElementById('current-date');

    if (elDateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elDateDisplay.textContent = new Date().toLocaleDateString('pt-BR', options);
    }

    if (elTodayRev) elTodayRev.textContent = formatCurrency(todayApts.reduce((sum, a) => sum + (a.totalPrice || 0), 0));
    if (elTodayApt) elTodayApt.textContent = todayApts.length;
    if (elMonthRev) elMonthRev.textContent = formatCurrency(monthApts.reduce((sum, a) => sum + (a.totalPrice || 0), 0));

    // Recent Activity Table
    const tbody = document.getElementById('dashboard-table-body');
    if (tbody) {
        // Sort by creation or ID desc
        const recentApts = [...appointments].sort((a, b) => b.id - a.id).slice(0, 10);

        tbody.innerHTML = recentApts.map(apt => `
            <tr>
                <td>
                    <div style="font-weight: bold; color: var(--primary);">${formatDate(apt.date)}</div>
                    <small style="color: var(--text-secondary);">${apt.time}</small>
                </td>
                <td>${apt.customer.name}<br><small>${apt.customer.phone}</small></td>
                <td><small>${apt.services.map(s => s.name).join(', ')}</small></td>
                <td>${formatCurrency(apt.totalPrice)}</td>
                <td><span class="status-badge ${apt.status ? apt.status.toLowerCase() : ''}">${apt.status}</span></td>
                <td>
                    <button class="btn btn-sm" onclick="sendWhatsapp(${apt.id})" style="background: #25D366; color: white;">📱</button>
                    ${apt.status !== 'Cancelado' ? `<button class="btn btn-danger btn-sm" onclick="cancelAppointment(${apt.id})">❌</button>` : ''}
                </td>
            </tr>
        `).join('');
    }
}


// ==========================================
// AGENDA & CALENDAR
// ==========================================

function renderAgendaList(filterDate) {
    const listContainer = document.getElementById('agenda-list');
    if (!listContainer) return;

    const filteredApts = appointments
        .filter(apt => apt.date === filterDate)
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    if (filteredApts.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><p>Nenhum agendamento para esta data.</p></div>`;
        return;
    }

    listContainer.innerHTML = filteredApts.map(apt => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div class="appointment-date-time">
                    <div class="appointment-time">🕐 ${apt.time}</div>
                    <div class="appointment-status">${apt.status}</div>
                </div>
                <div>
                    <strong>${apt.customer.name}</strong><br>
                    <small>${apt.customer.phone}</small>
                </div>
            </div>
            <div class="appointment-services">
                <strong>Serviços:</strong> ${apt.services.map(s => s.name).join(', ')}
            </div>
            <div class="appointment-footer">
                <div class="appointment-total">${formatCurrency(apt.totalPrice)}</div>
                <div class="actions">
                     <button class="btn btn-sm" onclick="sendWhatsapp(${apt.id})" style="background: #25D366; color: white;">📱 Confirmar</button>
                    ${apt.status !== 'Cancelado' ? `<button class="btn btn-danger btn-sm" onclick="cancelAppointment(${apt.id})">Cancelar</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

window.cancelAppointment = function (id) {
    showConfirm('Cancelar Agendamento?', 'Deseja cancelar (excluir) este agendamento?', async () => {
        const idx = appointments.findIndex(a => a.id === id);
        if (idx > -1) {
            appointments.splice(idx, 1);
            await saveData();
            refreshUI();
            showSuccess('Agendamento cancelado!');
        }
    });
};


// ==========================================
// SETTINGS
// ==========================================

function setupSettingsInputs() {
    if (settingOpenHour) settingOpenHour.value = appSettings.openingHour;
    if (settingCloseHour) settingCloseHour.value = appSettings.closingHour;
    if (settingInterval) settingInterval.value = appSettings.interval;
    if (settingWorkSaturday) settingWorkSaturday.checked = (appSettings.workSaturday !== undefined) ? appSettings.workSaturday : true;
    if (settingWorkSunday) settingWorkSunday.checked = (appSettings.workSunday !== undefined) ? appSettings.workSunday : false;

    if (settingWhatsappMsg) settingWhatsappMsg.value = appSettings.whatsappMsg || '';
    if (settingWhatsappActive) settingWhatsappActive.checked = (appSettings.whatsappActive !== undefined) ? appSettings.whatsappActive : true;

    // Admin Msg
    const settingAdminMsg = document.getElementById('setting-admin-msg');
    if (settingAdminMsg) settingAdminMsg.value = appSettings.adminWhatsappMsg || '';

    // Admin Access
    const settingAdminUser = document.getElementById('setting-admin-user');
    const settingAdminPass = document.getElementById('setting-admin-pass');
    if (settingAdminUser) settingAdminUser.value = (appSettings.adminUser && appSettings.adminUser.user) ? appSettings.adminUser.user : 'admin';
    if (settingAdminPass) settingAdminPass.value = (appSettings.adminUser && appSettings.adminUser.pass) ? appSettings.adminUser.pass : '';

    if (settingBusinessPhone) settingBusinessPhone.value = appSettings.businessPhone || '';

    if (settingWebhookActive) settingWebhookActive.checked = appSettings.webhookActive || false;
    if (settingWebhookUrl) settingWebhookUrl.value = appSettings.webhookUrl || '';

    renderBlockedDates();
}

// Logic for Settings Buttons is in setupEventListeners


// ==========================================
// SERVICES MANAGEMENT
// ==========================================

function renderServicesAdmin() {
    const tbody = document.getElementById('services-table-body');
    if (!tbody) return;

    if (services.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum serviço cadastrado.</td></tr>';
        return;
    }

    tbody.innerHTML = services.map(s => `
        <tr>
            <td style="font-size: 1.5rem;">${s.icon || '✨'}</td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${s.image ? `<img src="${s.image}" style="width:40px; height:40px; border-radius:5px; object-fit:cover;">` : ''}
                    <div>
                        <strong>${s.name}</strong><br>
                        <small style="color: grey;">${s.description || ''}</small>
                        <br><span class="status-badge" style="background:#fce7f3; color: #db2777; font-size: 0.75rem;">${s.category || 'Geral'}</span>
                    </div>
                </div>
            </td>
            <td>${formatCurrency(s.price)}</td>
            <td>${s.duration} min</td>
            <td>
                <button class="btn btn-sm" onclick="openServiceModal(${s.id})" style="background: #3b82f6; color: white;">✏️</button>
                <button class="btn btn-sm" onclick="deleteService(${s.id})" style="background: #ef4444; color: white;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.openServiceModal = function (id = null) {
    if (!serviceModal) return;

    const title = document.getElementById('service-modal-title');
    const inpId = document.getElementById('service-id');
    const inpName = document.getElementById('service-name');
    const inpIcon = document.getElementById('service-icon');
    const inpPrice = document.getElementById('service-price');
    const inpDuration = document.getElementById('service-duration');
    const inpDesc = document.getElementById('service-description');
    const inpCategory = document.getElementById('service-category');
    const inpImageBase64 = document.getElementById('service-image-base64');
    const preview = document.getElementById('image-preview');
    const fileInput = document.getElementById('service-image-file');

    // Reset fields
    fileInput.value = '';
    preview.style.display = 'none';
    inpImageBase64.value = '';

    if (id) {
        // Edit Mode
        const service = services.find(s => s.id === id);
        if (service) {
            title.textContent = 'Editar Serviço';
            inpId.value = service.id;
            inpName.value = service.name;
            inpIcon.value = service.icon || '✨';
            inpPrice.value = service.price;
            inpDuration.value = service.duration;
            inpDesc.value = service.description || '';

            // Populate Category
            populateCategorySelect(inpCategory, service.category);

            if (service.image) {
                inpImageBase64.value = service.image;
                preview.style.display = 'block';
                preview.style.backgroundImage = `url(${service.image})`;
            }
        }
    } else {
        // Create Mode
        title.textContent = 'Novo Serviço';
        if (serviceForm) serviceForm.reset();
        inpId.value = '';
        populateCategorySelect(inpCategory, categories[0]);
    }

    serviceModal.style.display = 'flex';
};

function populateCategorySelect(selectEl, selectedValue) {
    if (!selectEl) return;
    if (categories.length === 0) {
        selectEl.innerHTML = '<option value="Geral">Geral</option>';
        return;
    }
    selectEl.innerHTML = categories.map(cat =>
        `<option value="${cat}" ${cat === selectedValue ? 'selected' : ''}>${cat}</option>`
    ).join('');
}

window.closeServiceModal = function () {
    if (serviceModal) serviceModal.style.display = 'none';
};

async function saveService() {
    const id = document.getElementById('service-id').value;
    const name = document.getElementById('service-name').value;
    const icon = document.getElementById('service-icon').value || '✨';
    const price = parseFloat(document.getElementById('service-price').value);
    const duration = parseInt(document.getElementById('service-duration').value);
    const description = document.getElementById('service-description').value;
    const category = document.getElementById('service-category').value || 'Mãos';
    const image = document.getElementById('service-image-base64').value;

    // Default image if none uploaded
    const defaultImage = "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800";

    if (id) {
        // Update existing
        const index = services.findIndex(s => s.id == id);
        if (index > -1) {
            const oldImage = services[index].image;
            services[index] = {
                ...services[index],
                name, icon, price, duration, description, category,
                image: image || oldImage // keep old if not changed
            };
        }
    } else {
        // Create new
        const newService = {
            id: Date.now(),
            name, icon, price, duration, description, category,
            image: image || defaultImage
        };
        services.push(newService);
    }

    try {
        await saveData();
        closeServiceModal();
        renderServicesAdmin();
        showSuccess('Serviço salvo com sucesso!');
    } catch (e) {
        alert('Erro ao salvar. Imagem muito grande?');
    }
}

window.deleteService = function (id) {
    showConfirm('Excluir Serviço?', 'Tem certeza absoluta?', async () => {
        services = services.filter(s => s.id !== id);
        await saveData();
        renderServicesAdmin();
        showSuccess('Serviço excluído.');
    });
}


// ==========================================
// CATEGORIES & CLIENTS
// ==========================================

function renderCategories() {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (!categories || categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2">Nenhuma categoria encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td>${cat}</td>
            <td>
                <button class="btn btn-sm" onclick="deleteCategory('${cat}')" style="background: #ef4444; color: white;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.deleteCategory = async function (cat) {
    if (!confirm(`Excluir categoria "${cat}"?`)) return;
    categories = categories.filter(c => c !== cat);
    await saveData();
    renderCategories();
};

function renderClients() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    const clientsMap = new Map();
    appointments.forEach(apt => {
        const phone = apt.customer.phone.replace(/\D/g, '');
        if (!clientsMap.has(phone)) {
            clientsMap.set(phone, {
                name: apt.customer.name, phone: apt.customer.phone,
                visits: 0, lastVisit: apt.date
            });
        }
        const client = clientsMap.get(phone);
        client.visits++;
        if (apt.date > client.lastVisit) client.lastVisit = apt.date;
    });

    const clients = Array.from(clientsMap.values());
    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhum cliente registrado.</td></tr>';
        return;
    }

    tbody.innerHTML = clients.map(client => `
        <tr>
            <td>
                <div style="font-weight: 600; color: #333;">${client.name}</div>
            </td>
            <td>
                <a href="https://wa.me/55${client.phone.replace(/\D/g, '')}" target="_blank" style="
                    display: inline-flex; 
                    align-items: center; 
                    gap: 5px; 
                    color: #25D366; 
                    text-decoration: none; 
                    font-weight: 600; 
                    background: #eefdf3; 
                    padding: 4px 10px; 
                    border-radius: 15px;
                    transition: all 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    📱 ${client.phone}
                </a>
            </td>
            <td>${client.visits}</td>
            <td>${formatDate(client.lastVisit)}</td>
            <td>
                <button class="btn btn-sm" style="background: #25D366; color: white;" 
                    onclick="window.open('https://wa.me/55${client.phone.replace(/\D/g, '')}', '_blank')">
                    💬 Zap
                </button>
            </td>
        </tr>
    `).join('');
}


// ==========================================
// UTILITIES & HELPERS
// ==========================================

// --- NOTIFICATION HELPERS ---

function updateNotificationBadge(count) {
    if (!notificationBadge) return;
    if (count > 0) {
        notificationBadge.textContent = count;
        notificationBadge.style.display = 'block';
        notificationBadge.classList.add('active'); // Pop animation
    } else {
        notificationBadge.style.display = 'none';
        notificationBadge.classList.remove('active');
    }
}

function renderNotificationList(list) {
    const container = document.getElementById('notification-list');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = '<div class="empty-notif">Nenhuma notificação nova.</div>';
        return;
    }

    container.innerHTML = list.map(apt => `
        <div class="notification-item unread" onclick="handleNotificationClick(${apt.id})">
            <div class="notif-icon">📅</div>
            <div class="notif-content">
                <strong>${apt.customer.name}</strong>
                <p>Agendou para ${formatDate(apt.date)} às ${apt.time}</p>
                <span class="notif-time">Serviços: ${apt.services.map(s => s.name).join(', ')}</span>
            </div>
        </div>
    `).join('');
}

window.handleNotificationClick = function (id) {
    // 0. Find the appointment BEFORE filtering or reloading
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;

    // 1. Mark as Read
    clearedNotifs.add(id);
    localStorage.setItem('admin_cleared_notifs', JSON.stringify([...clearedNotifs]));

    // 2. Navigate to Agenda (Calendar)
    switchView('calendar');
    navBtns.forEach(b => b.classList.remove('active'));
    // 3. Set Date Filter
    if (adminDateFilter) {
        adminDateFilter.value = apt.date; // Ensure YYYY-MM-DD
    }

    // 4. Force Render Agenda for that date
    renderAgendaList(apt.date);

    // 5. Update Global Data (Badge/List) in background not to disrupt flow
    loadData();

    // 6. Scroll to Card with Highlight
    setTimeout(() => {
        const listContainer = document.getElementById('agenda-list');
        if (listContainer) listContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
};

function markAllAsRead() {
    // Add current valid appointments to cleared set
    const validIds = appointments.filter(a => a.status !== 'Cancelado').map(a => a.id);
    validIds.forEach(id => clearedNotifs.add(id));

    localStorage.setItem('admin_cleared_notifs', JSON.stringify([...clearedNotifs]));
    loadData();
}

function playNotificationSound() {
    // Simple beep
    // const audio = new Audio('path/to/sound.mp3'); audio.play();
    console.log('DING! 🔔');
}

function setupEventListeners() {
    // Notification Bell
    if (notificationBell) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid closing immediately
            const dropdown = document.getElementById('notification-dropdown');
            dropdown.classList.toggle('active');

            // If opening, maybe visually dim badge? (optional)
        });
    }

    // Clear All Notifications
    const clearBtn = document.getElementById('clear-notifications-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = document.getElementById('notification-bell');

        if (dropdown && dropdown.classList.contains('active')) {
            if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        }
    });

    // Close Notification Dropdown (X button)
    const closeDropdownBtn = document.getElementById('close-notification-dropdown');
    if (closeDropdownBtn) {
        closeDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        });
    }

    // Sidebar Toggles
    const toggleSidebarBtn = document.getElementById('sidebar-toggle');
    const closeSidebarBtn = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('sidebar');

    if (toggleSidebarBtn && sidebar) {
        toggleSidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('closed');
            }
            updateSidebarToggleVisibility();
        });
    }

    if (closeSidebarBtn && sidebar) {
        closeSidebarBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            } else {
                sidebar.classList.add('closed');
            }
            updateSidebarToggleVisibility();
        });
    }

    // Close when clicking outside (Mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar && sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !sidebar.contains(e.target) &&
            e.target !== toggleSidebarBtn) {
            sidebar.classList.remove('active');
            updateSidebarToggleVisibility();
        }
    });

    // Helper to hide toggle button when sidebar is open
    function updateSidebarToggleVisibility() {
        if (!toggleSidebarBtn || !sidebar) return;

        // Mobile: if active, hide toggle
        if (window.innerWidth <= 768) {
            if (sidebar.classList.contains('active')) {
                toggleSidebarBtn.style.opacity = '0';
                toggleSidebarBtn.style.pointerEvents = 'none';
            } else {
                toggleSidebarBtn.style.opacity = '1';
                toggleSidebarBtn.style.pointerEvents = 'auto';
            }
        } else {
            // Desktop: if NOT closed (meaning open), hide toggle
            if (!sidebar.classList.contains('closed')) {
                toggleSidebarBtn.style.opacity = '0';
                toggleSidebarBtn.style.pointerEvents = 'none';
            } else {
                toggleSidebarBtn.style.opacity = '1';
                toggleSidebarBtn.style.pointerEvents = 'auto';
            }
        }
    }

    // Run on init
    updateSidebarToggleVisibility();
    window.addEventListener('resize', updateSidebarToggleVisibility);
    // Navigation
    navBtns.forEach(btn => {
        if (btn.classList.contains('logout-btn')) return;
        btn.addEventListener('click', () => {
            const viewId = btn.dataset.view;
            switchView(viewId);
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('isAdmin');
        location.reload();
    });

    // Login Form (Fallback if HTML inline fails)
    if (loginForm && !loginForm.hasAttribute('onsubmit')) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Handle Login logic handled by HTML now, but keeping for safety
        });
    }

    // Toggle Password
    const toggleBtn = document.getElementById('toggle-password');
    // Handled in HTML inline mostly, but generic handler:
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            // Simple visual toggle logic
        });
    }

    // Settings Saves
    if (saveHoursBtn) saveHoursBtn.addEventListener('click', async () => {
        appSettings.openingHour = parseInt(settingOpenHour.value);
        appSettings.closingHour = parseInt(settingCloseHour.value);
        appSettings.interval = parseInt(settingInterval.value);
        if (settingWorkSaturday) appSettings.workSaturday = settingWorkSaturday.checked;
        if (settingWorkSunday) appSettings.workSunday = settingWorkSunday.checked;
        await saveData();
        showSuccess('Horários salvos! ⏰');
    });

    if (saveMsgBtn) saveMsgBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        appSettings.whatsappMsg = settingWhatsappMsg.value;
        appSettings.whatsappActive = settingWhatsappActive.checked;
        await saveData();
        showSuccess('Mensagem Cliente salva! 💬');
    });

    const saveAdminMsgBtn = document.getElementById('save-admin-msg-btn');
    if (saveAdminMsgBtn) saveAdminMsgBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        const settingAdminMsg = document.getElementById('setting-admin-msg');
        appSettings.adminWhatsappMsg = settingAdminMsg.value;
        await saveData();
        showSuccess('Mensagem Admin salva! 🔔');
    });

    const saveAccessBtn = document.getElementById('save-access-btn');
    if (saveAccessBtn) saveAccessBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        const settingAdminUser = document.getElementById('setting-admin-user');
        const settingAdminPass = document.getElementById('setting-admin-pass');

        const newUser = settingAdminUser.value.trim();
        const newPass = settingAdminPass.value.trim();

        if (newUser.length < 3 || newPass.length < 3) {
            showSuccess('⚠️ Usuário e Senha devem ter no mínimo 3 caracteres.');
            return;
        }

        appSettings.adminUser = {
            user: newUser,
            pass: newPass
        };

        await saveData();
        showSuccess('Dados de acesso atualizados! 🔐\n(Use-os no próximo login)');
    });

    if (saveContactBtn) saveContactBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        const phone = settingBusinessPhone.value;
        if (!phone || phone.length < 8) {
            showSuccess('⚠️ Atenção: Preencha o campo "Telefone do Negócio" corretamente antes de salvar!');
            return;
        }
        appSettings.businessPhone = phone.replace(/\D/g, '');
        await saveData();
        showSuccess('Número salvo!');
    });

    if (saveWebhookBtn) saveWebhookBtn.addEventListener('click', async () => {
        appSettings.webhookActive = settingWebhookActive.checked;
        appSettings.webhookUrl = settingWebhookUrl.value.trim();
        await saveData();
        showSuccess('Webhook configurado! 🤖');
    });

    // Payment Methods
    const addPayBtn = document.getElementById('add-payment-btn');
    const payInput = document.getElementById('payment-input');
    const payEmoji = document.getElementById('payment-emoji');
    const payDesc = document.getElementById('payment-desc');

    if (addPayBtn && payInput) {
        addPayBtn.addEventListener('click', async () => {
            const name = payInput.value.trim();
            // Agenda Flatpickr
            flatpickr("#admin-date-filter", {
                dateFormat: "Y-m-d",
                defaultDate: new Date(),
                locale: "pt",
                altInput: true,
                altFormat: "j \\d\\e F \\d\\e Y",
                disableMobile: true,
                onChange: function (selectedDates, dateStr, instance) {
                    if (currentView === 'calendar') {
                        renderAgendaList(dateStr);
                    }
                },
                onReady: function (selectedDates, dateStr, instance) {
                    instance.input.style.border = 'none';
                    instance.input.style.boxShadow = 'none';
                    instance.input.style.background = 'transparent';
                    if (instance.altInput) {
                        instance.altInput.style.border = 'none';
                        instance.altInput.style.boxShadow = 'none';
                        instance.altInput.style.background = 'transparent';
                    }
                }
            });

            // Blocked Days Flatpickr
            flatpickr("#block-date-input", {
                dateFormat: "Y-m-d",
                minDate: "today",
                allowInput: true,
                locale: "pt",
                altInput: true,
                altFormat: "d/m/Y",
                disableMobile: true,
                onReady: function (selectedDates, dateStr, instance) {
                    setTimeout(() => {
                        if (instance.altInput) {
                            instance.altInput.style.border = 'none';
                            instance.altInput.style.boxShadow = 'none';
                            instance.altInput.style.background = 'transparent';

                            instance.altInput.addEventListener('input', function (e) {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length > 8) v = v.substring(0, 8);
                                if (v.length > 4) {
                                    e.target.value = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
                                } else if (v.length > 2) {
                                    e.target.value = `${v.substring(0, 2)}/${v.substring(2)}`;
                                } else {
                                    e.target.value = v;
                                }
                            });
                        }
                    }, 200);
                }
            });

            const icon = payEmoji.value.trim() || '💳';
            const desc = payDesc.value.trim();

            if (name) {
                if (!appSettings.paymentMethods) appSettings.paymentMethods = [];

                // Check duplicate by name
                const exists = appSettings.paymentMethods.some(pm => (typeof pm === 'string' ? pm : pm.name) === name);

                if (!exists) {
                    appSettings.paymentMethods.push({ name, icon, description: desc });
                    await saveData();
                    renderPaymentMethodsSettings();

                    // Clear inputs
                    payInput.value = '';
                    payEmoji.value = '';
                    payDesc.value = '';

                    showSuccess('Forma de Pagamento adicionada!');
                } else {
                    alert('Esta forma de pagamento já existe.');
                }
            }
        });
    }

    if (addBlockDateBtn) addBlockDateBtn.addEventListener('click', () => {
        // Validation: Try to get Flatpickr instance, fallback to raw value
        const fp = blockDateInput._flatpickr;
        const rawVal = blockDateInput.value;

        // Debug
        console.log('Blocking Date Debug:', { fp: !!fp, rawVal });

        // Check if date is selected (Technical or Raw)
        const hasDateInPicker = fp && fp.selectedDates.length > 0;
        const hasRawDate = rawVal && rawVal.length >= 10; // YYYY-MM-DD

        if (!hasDateInPicker && !hasRawDate) {
            showSuccess('⚠️ Selecione uma data para bloquear!');
            return;
        }

        // Prefer the Flatpickr date object if available (handles timezone better), else raw string
        let d;
        if (hasDateInPicker) {
            // Get YYYY-MM-DD from the date object
            const dateObj = fp.selectedDates[0];
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            d = `${year}-${month}-${day}`;
        } else {
            // Handle raw value (manual input or fallback)
            // If it is DD/MM/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawVal)) {
                const [dd, mm, yy] = rawVal.split('/');
                d = `${yy}-${mm}-${dd}`;
            } else {
                d = rawVal;
            }
        }

        // Use new 3-argument signature: Title, Message, Callback
        showConfirm('Bloquear Data', `Deseja BLOQUEAR o dia ${formatDate(d)}?`, async () => {
            if (!appSettings.blockedDates) appSettings.blockedDates = [];

            if (!appSettings.blockedDates.includes(d)) {
                appSettings.blockedDates.push(d);
                appSettings.blockedDates.sort();
                await saveData();
                renderBlockedDates();
                if (fp) fp.clear();
                blockDateInput.value = ''; // fallback clear
                showSuccess('Data bloqueada com sucesso! 🚫');
            } else {
                showSuccess('Esta data já está bloqueada.');
            }
        });
    });

    // Test WhatsApp Modal
    const btnTeste = document.getElementById('test-msg-btn');
    if (btnTeste) {
        btnTeste.addEventListener('click', () => {
            if (whatsappModal) whatsappModal.style.display = 'flex';
        });
    }
    if (closeWhatsappModalBtn) closeWhatsappModalBtn.addEventListener('click', () => whatsappModal.style.display = 'none');
    if (confirmTestBtn) confirmTestBtn.addEventListener('click', async () => {
        const phone = testPhoneInput.value.replace(/\D/g, '');
        // Pega a mensagem atual da caixa de texto
        let msg = settingWhatsappMsg.value || "Teste de mensagem do Bot";

        // Substitui variáveis por exemplos fictícios para o teste
        msg = msg.replace(/{nome}/g, "Cliente Teste")
            .replace(/{data}/g, new Date().toLocaleDateString('pt-BR'))
            .replace(/{hora}/g, "14:00")
            .replace(/{servicos}/g, "Manicure Teste")
            .replace(/{valor}/g, "R$ 50,00");

        if (phone.length < 10) {
            alert('Número inválido para teste!');
            return;
        }

        whatsappModal.style.display = 'none';

        // Tenta enviar pelo Bot Local (Backend)
        try {
            showSuccess('Enviando teste... 🚀');
            // Detecta URL correta (mesma lógica do app.js simplificada)
            const port = window.location.port === '3003' ? '3003' : '3003';
            const baseUrl = window.location.port === '3003' ? '' : 'http://127.0.0.1:3003';

            const res = await fetch(`${baseUrl}/api/notify-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone,
                    message: msg
                })
            });
            const data = await res.json();

            if (data.success) {
                showSuccess('Teste enviado com sucesso! ✅');
            } else {
                alert('Erro ao enviar teste: ' + JSON.stringify(data));
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão ao enviar teste.');
        }
    });

    // Categories
    const addCatBtn = document.getElementById('add-category-btn');
    const newCatInput = document.getElementById('new-category-input');
    if (addCatBtn && newCatInput) {
        addCatBtn.addEventListener('click', async () => {
            const val = newCatInput.value.trim();
            if (val && !categories.includes(val)) {
                categories.push(val);
                await saveData();
                renderCategories();
                newCatInput.value = '';
                showSuccess('Categoria criada!');
            }
        });
    }

    // Service Form Image
    const fileInput = document.getElementById('service-image-file');
    if (fileInput) fileInput.addEventListener('change', handleImageUpload);
    if (serviceForm) serviceForm.addEventListener('submit', (e) => { e.preventDefault(); saveService(); });

    // Date Picker
    if (adminDateFilter && typeof flatpickr !== 'undefined') {
        flatpickr("#admin-date-filter", {
            locale: "pt",
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "j \\de F \\de Y",
            defaultDate: "today",
            onChange: function (selectedDates, dateStr) {
                renderAgendaList(dateStr);
            }
        });
    }
}


// --- HELPERS ---
function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function formatDate(iso) {
    if (!iso) return '';
    // Check if it matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }
    // Fallback for ISO strings with time
    if (iso.includes('T')) {
        const d = new Date(iso);
        return isNaN(d) ? iso : d.toLocaleDateString('pt-BR');
    }
    // Return original if unknown format (prevents "undefined")
    return iso;
}
function timeToMinutes(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }

// --- Blocked Dates Logic ---

// --- Helper: Custom Confirm Modal ---
// --- Helper: Custom Confirm Modal ---
// --- Helper: Custom Confirm Modal ---
window.showConfirm = function (arg1, arg2, arg3) {
    let title, msg, onYes;

    // Robust Argument Handling
    if (typeof arg3 === 'function') {
        title = arg1;
        msg = arg2;
        onYes = arg3;
    } else {
        title = 'Confirmação';
        msg = arg1;
        onYes = arg2;
    }

    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('confirm-msg');
    const yesBtn = document.getElementById('confirm-btn-yes');
    const noBtn = document.getElementById('confirm-btn-no');

    if (!modal || !msgEl || !yesBtn || !noBtn) {
        if (confirm(msg)) if (onYes) onYes();
        return;
    }

    // Use HTML to display bold Title and normal Message
    // Safely inject into H3 (Using spans and br to remain valid inside heading)
    msgEl.innerHTML = `
        <span style="display:block; font-size:1.25rem; font-weight:700; color:#2d3436; margin-bottom:8px;">${title}</span>
        <br>
        <span style="font-size:1rem; font-weight:normal; color:#636e72;">${msg}</span>
    `;

    modal.style.display = 'flex';

    // Replace buttons to clear listeners
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);

    newYes.onclick = () => {
        modal.style.display = 'none';
        if (onYes) onYes();
    };

    newNo.onclick = () => {
        modal.style.display = 'none';
    };
};

function renderBlockedDates() {
    const list = document.getElementById('blocked-dates-list');
    if (!list) return;

    const validDates = (appSettings.blockedDates || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (validDates.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #888; padding: 10px;">Nenhuma data bloqueada.</div>';
        return;
    }

    list.innerHTML = validDates.sort().map(d => `
        <div class="blocked-item-card" style="
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            background: white;
            padding: 12px 15px;
            border-radius: 12px;
            margin-bottom: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.03);
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: #FFF0F5; padding: 5px 10px; border-radius: 8px; font-size: 1.2rem;">🚫</span>
                <span style="font-weight: 600; color: var(--text-primary); font-family: 'Outfit';">${formatDate(d)}</span>
            </div>
            <button onclick="removeBlockedDate('${d}')" style="
                background: none; 
                border: none; 
                cursor: pointer; 
                font-size: 1.1rem;
                opacity: 0.7;
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                ❌
            </button>
        </div>
    `).join('');
}

window.removeBlockedDate = function (d) {
    showConfirm('Desbloquear Data', `Deseja liberar o dia ${formatDate(d)} para agendamentos?`, async () => {
        appSettings.blockedDates = appSettings.blockedDates.filter(bd => bd !== d);
        await saveData();
        renderBlockedDates();
        showSuccess('Data desbloqueada! ✅');
    });
};

// Image Upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX = 600;
            let w = img.width; let h = img.height;
            if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
            else { if (h > MAX) { w *= MAX / h; h = MAX; } }
            canvas.width = w; canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('service-image-base64').value = dataUrl;
            const p = document.getElementById('image-preview');
            p.style.display = 'block'; p.style.backgroundImage = `url(${dataUrl})`;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// WhatsApp Send
window.sendWhatsapp = function (id) {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    let msg = appSettings.whatsappMsg || "Olá {nome}!";
    msg = msg.replace(/{nome}/g, apt.customer.name.split(' ')[0])
        .replace(/{data}/g, formatDate(apt.date))
        .replace(/{hora}/g, apt.time)
        .replace(/{servicos}/g, apt.services.map(s => s.name).join(', '))
        .replace(/{total}/g, formatCurrency(apt.totalPrice));
    window.open(`https://wa.me/${apt.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Payment Methods Render
function renderPaymentMethodsSettings() {
    const tbody = document.getElementById('payment-methods-table-body');
    if (!tbody) return; // Might not exist if not in settings view

    const methods = appSettings.paymentMethods || [];

    if (methods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: grey;">Nenhuma forma de pagamento cadastrada.</td></tr>';
        return;
    }

    tbody.innerHTML = methods.map(pm => {
        // Handle backward compatibility (string vs object)
        const name = typeof pm === 'string' ? pm : pm.name;
        const icon = typeof pm === 'string' ? '💳' : (pm.icon || '💳');
        const desc = typeof pm === 'string' ? '' : (pm.description || '');

        return `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${name}</div>
                        ${desc ? `<small style="color: grey; font-size: 0.85rem;">${desc}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <button class="btn btn-sm" onclick="removePaymentMethod('${name}')" style="background: #ef4444; color: white;">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

window.removePaymentMethod = function (name) {
    showConfirm('Excluir Pagamento?', `Deseja remover a opção "${name}"?`, async () => {
        appSettings.paymentMethods = appSettings.paymentMethods.filter(p => {
            const pName = typeof p === 'string' ? p : p.name;
            return pName !== name;
        });
        await saveData();
        renderPaymentMethodsSettings();
        showSuccess('Forma de pagamento removida! 🗑️');
    });
}


// --- ALERTS ---
window.showSuccess = function (msg) {
    const sModal = document.getElementById('success-modal');
    const sIcon = document.getElementById('success-icon');
    const sBtn = document.getElementById('success-btn');
    const sMsg = document.getElementById('success-message');
    // Correctly target by ID
    const sTitle = document.getElementById('success-title');

    if (sModal) {
        if (sMsg) sMsg.textContent = msg;

        // Reset Styles (Default Pink/Success)
        if (sBtn) {
            sBtn.style.background = 'var(--primary)';
            sBtn.style.boxShadow = '0 5px 15px rgba(255, 105, 180, 0.4)';
        }
        if (sIcon) sIcon.textContent = '✨';
        if (sTitle) sTitle.textContent = 'Sucesso!';

        // Check for Destructive/Warning keywords
        const lowerMsg = (msg || '').toLowerCase();

        // Destructive
        if (lowerMsg.includes('apagado') || lowerMsg.includes('excluído') || lowerMsg.includes('limpa') || lowerMsg.includes('resetado') || lowerMsg.includes('cancelado')) {
            if (sIcon) {
                sIcon.textContent = '🗑️';
                if (lowerMsg.includes('limpa')) sIcon.textContent = '🧹';
                if (lowerMsg.includes('resetado')) sIcon.textContent = '💥';
            }
            if (sBtn) {
                sBtn.style.background = '#ef4444';
                sBtn.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.4)';
            }
        }

        // Warning / Validation
        if (lowerMsg.includes('preencha') || lowerMsg.includes('erro') || lowerMsg.includes('atenção') || lowerMsg.includes('inválid') || lowerMsg.includes('selecione')) {
            if (sIcon) sIcon.textContent = '⚠️';
            if (sTitle) sTitle.textContent = 'Atenção!';
            if (lowerMsg.includes('erro')) sTitle.textContent = 'Erro!';

            if (sBtn) {
                sBtn.style.background = '#f59e0b'; // Amber/Orange
                sBtn.style.boxShadow = '0 5px 15px rgba(245, 158, 11, 0.4)';
            }
        }

        sModal.style.display = 'flex';

        // Re-trigger animation
        if (sIcon) {
            sIcon.style.animation = 'none';
            sIcon.offsetHeight; /* trigger reflow */
            sIcon.style.animation = 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }

    } else {
        alert(msg);
    }
};

window.closeSuccessModal = function () {
    const sModal = document.getElementById('success-modal');
    if (sModal) sModal.style.display = 'none';
};

window.clearAllData = function (type) {
    const today = new Date().toISOString().split('T')[0];
    showConfirm('Limpar dados?', 'Tem certeza que deseja apagar? ' + type, async () => {
        if (type === 'agenda') appointments = appointments.filter(a => a.date < today);
        if (type === 'clients') appointments = appointments.filter(a => a.date >= today);
        if (type === 'services') services = [];
        if (type === 'categories') categories = [];
        if (type === 'full_reset') { services = []; appointments = []; }

        await saveData();
        refreshUI();
        showSuccess('Dados limpos.');
    });
};

function playNotificationSound() {
    // Simple chime sound
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
    audio.play().catch(e => console.warn('Audio play blocked:', e));
}

// Start
init();
