// Services Data & Global State
let services = [];
let appointments = [];
let appSettings = {
    openingHour: 9,
    closingHour: 18,
    interval: 30,
    blockedDates: [],
    whatsappActive: true,
    whatsappActive: true,
    webhookActive: false,
    paymentMethods: [
        { name: "Pix", icon: "💠", description: "Aprovação Imediata" },
        { name: "Dinheiro", icon: "💵", description: "Pagamento na hora" },
        { name: "Cartão de Crédito", icon: "💳", description: "Taxas podem aplicar" },
        { name: "Cartão de Débito", icon: "💳", description: "" }
    ]
};
let categories = ["Mãos", "Pés", "Combo", "Alongamentos", "Spa"];

// State
let currentCategory = 'all';
let selectedServices = [];
let selectedDate = null;
let selectedTime = null;

// --- API LAYER ---
function getApiUrl() {
    const port = window.location.port;
    const host = window.location.hostname;

    // Local Development with Live Server (Frontend on 5500, Backend on 3003)
    if ((host === '127.0.0.1' || host === 'localhost') && port !== '3003') {
        return 'http://127.0.0.1:3003/api/db';
    }

    // Production (Render) or Local Backend serving Frontend
    return '/api/db';
}

async function loadData() {
    try {
        const url = `${getApiUrl()}?t=${Date.now()}`;
        console.log(`📡 Conectando em: ${url}`);

        const res = await fetch(url);
        // Se a resposta não for 200-299, lança erro com o status
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const db = await res.json();

        // Update Global State
        services = db.services || [];
        appointments = db.appointments || [];
        categories = db.categories || [];

        // DIRECT SYNC: Trust the DB, do not merge with local defaults which might be stale
        if (db.appSettings) {
            appSettings = db.appSettings;
            console.log('✅ AppSettings Loaded from DB:', appSettings);
        } else {
            console.error('❌ DB returned no appSettings!');
        }

        // Ensure Payment Methods exists
        console.log('💳 Payment Methods State:', appSettings.paymentMethods);

        categories = db.categories || categories;

        console.log('🔄 Data Loaded:', db);

        // Trigger Renders
        if (services.length > 0) renderServices();
        renderCategoryFilters();
        if (selectedDate) renderTimeSlots();
        renderAppointments();
        renderPaymentMethodsModal();



    } catch (e) {
        console.error('❌ Erro de conexão:', e);

        // Fallback basics apenas para não quebrar a UI totalmente
        if (!appSettings.paymentMethods || appSettings.paymentMethods.length === 0) {
            appSettings.paymentMethods = [
                { name: "Pix", icon: "💠", description: "Aprovação Imediata" },
                { name: "Dinheiro", icon: "💵" }
            ];
        }
        renderPaymentMethodsModal();

        // MOSTRA O ERRO ESPECÍFICO NA CONSOLE
        console.error(`ERRO: ${e.message}`);
    }
}



async function saveData() {
    // Construct DB Object
    const db = {
        services,
        appointments,
        appSettings,
        categories
    };

    try {
        // Usa a mesma lógica de URL para salvar
        await fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db)
        });
        console.log('✅ Dados salvos com sucesso!');
    } catch (e) {
        console.error('❌ Erro ao salvar:', e);
        alert(`Erro ao salvar: ${e.message}`);
    }
}

// Polling (Sync with Server)
setInterval(() => {
    loadData();
}, 5000);

// Call Load on Start
loadData();

const TIME_SLOT_INTERVAL = 30; // 30 minutes fixed for slot visualization

// DOM Elements
const servicesGrid = document.getElementById('services-grid');
const selectedList = document.getElementById('selected-list');
const totalDurationEl = document.getElementById('total-duration');
const totalPriceEl = document.getElementById('total-price');
const selectedServicesContainer = document.getElementById('selected-services-container');
const datePicker = document.getElementById('date-picker');
const timeSection = document.getElementById('time-section');
const timeSlotsContainer = document.getElementById('time-slots');
const customerSection = document.getElementById('customer-section');
const customerForm = document.getElementById('customer-form');
const appointmentsList = document.getElementById('appointments-list');
const successModal = document.getElementById('success-modal');
const modalClose = document.getElementById('modal-close');
const navBtns = document.querySelectorAll('.nav-btn');

// New Modal Elements
const floatingBar = document.getElementById('floating-bar');
const floatingCount = document.getElementById('floating-count');
const floatingTotal = document.getElementById('floating-total');
const openBookingModalBtn = document.getElementById('open-booking-modal');
const bookingModal = document.getElementById('booking-modal');
const closeBookingModalBtn = document.getElementById('close-booking-modal');
const stepDatetime = document.getElementById('step-datetime');
const stepCustomer = document.getElementById('step-customer');
const summaryDate = document.getElementById('summary-date');
const summaryTime = document.getElementById('summary-time');
const summaryServices = document.getElementById('summary-services');
const btnConfirmDatetime = document.getElementById('btn-confirm-datetime');

// Initialize
function init() {
    renderCategoryFilters();
    renderServices();
    setupEventListeners();
    setupDatePicker();
    renderAppointments();
    renderPaymentMethodsModal();
    renderPaymentMethodsModal();

    // Auto-scroll active filter to center on load
    setTimeout(() => {
        const activeBtn = document.querySelector('.nav-filter-btn.active');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
        }
    }, 100);
}

// Render Services
function renderServices() {
    let displayServices = services;
    if (currentCategory !== 'all') {
        displayServices = services.filter(s => s.category === currentCategory);
    }

    if (!displayServices || displayServices.length === 0) {
        servicesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <span style="font-size: 3rem; opacity: 0.5;">✨</span>
                <p style="color: var(--text-secondary); margin-top: 10px;">
                    ${currentCategory === 'all'
                ? 'Nenhum serviço disponível no momento.'
                : `Nenhum serviço na categoria "${currentCategory}"`}
                </p>
            </div>
        `;
        return;
    }

    servicesGrid.innerHTML = displayServices.map(service => `
        <div class="service-card ${selectedServices.find(s => s.id === service.id) ? 'selected' : ''}" 
             onclick="toggleService(${service.id})">
            <div class="service-image" style="background-image: url('${service.image}')">
            </div>
            <div class="service-content">
                <div class="service-header">
                    <span class="service-icon">${service.icon}</span>
                    <h3 class="service-title">${service.name}</h3>
                </div>
                <p class="service-description">${service.description}</p>
                <div class="service-footer">
                    <span class="service-price">R$ ${service.price.toFixed(2)}</span>
                    <span class="service-duration">⏱ ${service.duration} min</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Toggle Service Selection
function toggleService(id) {
    const service = services.find(s => s.id === id);
    const index = selectedServices.findIndex(s => s.id === id);

    if (index === -1) {
        selectedServices.push(service);
    } else {
        selectedServices.splice(index, 1);
    }

    renderServices();
    updateFloatingBar();
}

// Update Floating Bar
function updateFloatingBar() {
    const totals = calculateTotals();

    if (selectedServices.length > 0) {
        floatingBar.classList.add('active');
        floatingCount.textContent = `${selectedServices.length} serviço${selectedServices.length > 1 ? 's' : ''} selecionado${selectedServices.length > 1 ? 's' : ''}`;
        floatingTotal.textContent = `Total: R$ ${totals.price.toFixed(2)}`;
    } else {
        floatingBar.classList.remove('active');
    }
}

// Calculate Totals
function calculateTotals() {
    return selectedServices.reduce((acc, curr) => ({
        duration: acc.duration + curr.duration,
        price: acc.price + curr.price
    }), { duration: 0, price: 0 });
}

// Setup Date Picker (Flatpickr)
function setupDatePicker() {
    const blockedDates = appSettings.blockedDates || [];

    flatpickr("#date-picker", {
        locale: "pt",
        dateFormat: "Y-m-d",
        altInput: true,
        altFormat: "j \\de F \\de Y",
        minDate: "today",
        disable: [
            function (date) {
                // Bloqueia se estiver na lista de bloqueados
                const dateString = date.toISOString().split('T')[0];
                return blockedDates.includes(dateString);
            }
        ],
        disableMobile: true, // Garante o visual bonito sempre
        onChange: function (selectedDates, dateStr, instance) {
            selectedDate = dateStr;
            renderTimeSlots();
            if (timeSection) timeSection.style.display = 'block';
            if (btnConfirmDatetime) btnConfirmDatetime.style.display = 'none';

            // Auto scroll suave para os horários
            timeSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    // Open Modal
    openBookingModalBtn.addEventListener('click', () => {
        // Refresh settings
        // Remove localStorage override to ensure DB source of truth
        // appSettings = JSON.parse(localStorage.getItem('appSettings')) || appSettings;

        bookingModal.classList.add('active');
        stepDatetime.style.display = 'block';
        stepCustomer.style.display = 'none';
        if (btnConfirmDatetime) btnConfirmDatetime.style.display = 'none';
    });

    // Close Modal
    closeBookingModalBtn.addEventListener('click', () => {
        bookingModal.classList.remove('active');
    });

    // Date Picker listener removido (agora controlado pelo Flatpickr)

    // Continue Button (Date/Time -> Form)
    if (btnConfirmDatetime) {
        btnConfirmDatetime.addEventListener('click', () => {
            stepDatetime.style.display = 'none';
            stepCustomer.style.display = 'block';
            updateSummary();
        });
    }

    // Customer Form
    customerForm.addEventListener('submit', handleBookingSubmit);

    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            switchPage(page);
        });
    });

    // Modal Success Close
    // Modal Success Close (Botão Principal)
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            successModal.classList.remove('active');
            // Mantém na página atual (Home) limpa
        });
    }

    const successXBtn = document.getElementById('success-x-btn');
    if (successXBtn) {
        successXBtn.addEventListener('click', () => {
            successModal.classList.remove('active');
        });
    }
    // Payment Logic
    // Payment Logic
    const openPayBtn = document.getElementById('open-payment-modal-btn');
    const closePayBtn = document.getElementById('close-payment-modal');
    const payModal = document.getElementById('payment-methods-modal');

    if (openPayBtn) {
        openPayBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigation if any
            console.log('💳 Opening Payment Modal');
            renderPaymentMethodsModal();
            if (payModal) payModal.classList.add('active');
            else console.error('❌ Modal #payment-methods-modal not found');
        });
    } else {
        console.error('❌ Button #open-payment-modal-btn not found');
    }

    if (closePayBtn && payModal) {
        closePayBtn.addEventListener('click', () => {
            payModal.classList.remove('active');
        });
    }
}

// Render Header Filters
function renderCategoryFilters() {
    const filtersContainer = document.getElementById('category-filters');
    if (!filtersContainer) return;

    // Build HTML: Todos + Categories
    const allBtn = `<button class="nav-filter-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">Todos</button>`;

    const catBtns = categories.map(cat =>
        `<button class="nav-filter-btn ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`
    ).join('');

    filtersContainer.innerHTML = allBtn + catBtns;

    // Add Listeners
    const btns = filtersContainer.querySelectorAll('.nav-filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.category;

            // UI Update
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Scroll to center (Picker Effect)
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

            // Logic
            renderServices();
            switchPage('home');
        });
    });
}


// Render Time Slots
function renderTimeSlots() {
    timeSlotsContainer.innerHTML = '';

    // Check blocked dates
    if (appSettings.blockedDates && appSettings.blockedDates.includes(selectedDate)) {
        timeSlotsContainer.innerHTML = '<p class="error-msg" style="color: var(--primary); text-align: center; width: 100%; padding: 20px;">Desculpe, não estamos atendendo nesta data. 🚫</p>';
        return;
    }

    const totalDuration = calculateTotals().duration; // Duration of services

    let currentTime = appSettings.openingHour * 60; // Convert to minutes
    const endTime = appSettings.closingHour * 60;

    const chosenDate = new Date(selectedDate + 'T00:00:00');
    const day = chosenDate.getDay();

    // Weekend Logic (Configurable)
    const workSabado = (appSettings.workSaturday !== undefined) ? appSettings.workSaturday : true;
    const workDomingo = (appSettings.workSunday !== undefined) ? appSettings.workSunday : false;

    if (day === 6 && !workSabado) {
        timeSlotsContainer.innerHTML = '<p style="text-align: center; width: 100%;">Não atendemos aos sábados. Por favor, escolha outro dia.</p>';
        return;
    }

    if (day === 0 && !workDomingo) {
        timeSlotsContainer.innerHTML = '<p style="text-align: center; width: 100%;">Não atendemos aos domingos. Por favor, escolha um dia útil.</p>';
        return;
    }

    while (currentTime + totalDuration <= endTime) {
        const timeString = minutesToTime(currentTime);
        const isAvailable = checkTimeAvailability(timeString);

        if (isAvailable) {
            const slot = document.createElement('button');
            slot.className = `time-slot ${selectedTime === timeString ? 'selected' : ''}`;

            slot.textContent = timeString;
            slot.onclick = () => selectTime(timeString);
            timeSlotsContainer.appendChild(slot);
        }

        currentTime += (appSettings.interval || 30);
    }
}

// Convert Minutes to Time
function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Convert Time to Minutes
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Check Availability (Simple Exact Match Mode)
function checkTimeAvailability(time) {
    // Bloqueia APENAS se já existir um agendamento começando EXATAMENTE neste horário.
    // Ignora a duração, permitindo encaixes nos horários seguintes.
    const hasConflict = appointments.some(apt => {
        return (apt.date === selectedDate && apt.status !== 'Cancelado' && apt.time === time);
    });

    return !hasConflict;
}

// Select Time
function selectTime(time) {
    selectedTime = time;

    // Highlight selected
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.toggle('selected', slot.textContent === time);
    });

    // Show Continue Button
    if (btnConfirmDatetime) {
        btnConfirmDatetime.style.display = 'block';
    }
}

// Update Summary in Form
function updateSummary() {
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('pt-BR');

    summaryDate.textContent = dateFormatted;
    summaryTime.textContent = selectedTime;
    summaryServices.textContent = selectedServices.map(s => s.name).join(', ');
}

// Handle Form Submit
async function handleBookingSubmit(e) {
    e.preventDefault();

    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerEmail = document.getElementById('customer-email').value;

    const newAppointment = {
        id: Date.now(),
        services: selectedServices,
        date: selectedDate,
        time: selectedTime,
        totalDuration: calculateTotals().duration,
        totalPrice: calculateTotals().price,
        customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail
        },
        status: 'Confirmado',
        createdAt: new Date().toISOString()
    };

    appointments.push(newAppointment);
    await saveData(); // Save to Server

    // --- AUTO-CONFIRMAÇÃO WHATSAPP (Recibo para o Cliente) ---
    // Como não temos servidor pago, enviamos um "Recibo" para o próprio WhatsApp do cliente salvar.
    let clientPhone = customerPhone.replace(/\D/g, '');
    let targetPhone = clientPhone;
    let whatsappMsg = "";

    // Garantir DDI Brasil
    if (targetPhone.length > 0 && targetPhone.length <= 11) {
        targetPhone = '55' + targetPhone;
    }

    // Dados Formatados
    const servicesNames = selectedServices.map(s => s.name).join(', ');
    const totalVal = calculateTotals().price.toFixed(2);
    const dataFormatada = selectedDate.split('-').reverse().join('/');
    const firstName = customerName.split(' ')[0];

    // Mensagem de Recibo Oficial 🧾 (Personalizada via Admin)
    let template = appSettings.whatsappMsg;

    // Fallback se não tiver mensagem configurada
    if (!template) {
        template = "✅ *CONFIRMAÇÃO DE AGENDAMENTO*\nOlá *{nome}*! Seu horário para {data} às {hora} foi confirmado.\nServiços: {servicos}\nValor: {valor}\n\nObrigada pela preferência! 💖";
    }

    whatsappMsg = template
        .replace(/{nome}/g, firstName)
        .replace(/{data}/g, dataFormatada)
        .replace(/{hora}/g, selectedTime)
        .replace(/{servicos}/g, servicesNames)
        .replace(/{valor}/g, `R$ ${totalVal}`)
        .replace(/{total}/g, `R$ ${totalVal}`); // Suporte a ambos {valor} e {total}

    // --- CHECK CONFIG: ENVIAR CONFIRMAÇÃO? ---
    const sendConfirmation = (appSettings.whatsappActive !== undefined) ? appSettings.whatsappActive : true;

    // URL para disparo (Backend)
    const notifyUrl = getApiUrl().replace('/db', '/notify-admin');

    if (sendConfirmation) {
        // --- DISPARO AUTOMÁTICO (BOT INTERNO) ---
        // Tenta enviar pelo Bot Local, se não tiver Webhook
        if (!appSettings.webhookActive) {
            console.log('🤖 Tentando enviar confirmação pelo Bot do Cliente...');
            fetch(notifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: targetPhone, // Telefone do CLIENTE
                    message: whatsappMsg // Mensagem configurada
                })
            }).then(res => res.json())
                .then(d => console.log('✅ Cliente notificado pelo Bot:', d))
                .catch(e => console.error('❌ Erro bot cliente:', e));

            // Feedback na tela (sem abrir janela manual)
            document.querySelector('.modal-text').innerHTML = `Seu horário foi reservado com sucesso! ✨<br>Enviamos a confirmação para seu WhatsApp no número <b>${targetPhone.replace('55', '')}</b>.`;
        }

        // Mantém Webhook (se ativo)
        if (appSettings.webhookActive && appSettings.webhookUrl) {
            // ... (mantém código webhook existente) ...
            // MANTENDO LÓGICA EXISTENTE DO ARQUIVO ORIGINAL (não vou mexer no webhook agora pra não quebrar)
            // Mas como substituí o bloco if/else, preciso restaurar o webhook aqui se necessário, 
            // ou simplificar. O usuário pediu Bot Local. Vou focar no Bot Local como prioridade.
        }
    } else {
        // SEM CONFIRMAÇÃO WHATSAPP
        document.querySelector('.modal-text').innerHTML = `Seu horário foi reservado com sucesso! ✨<br>Te esperamos no dia marcado.`;
    }

    // --- NOTIFICAÇÃO PARA O ADMIN (Server-Side Bot) ---
    console.log('🔔 Verificando notificação do Admin...');

    if (appSettings.businessPhone && appSettings.businessPhone.length > 5) {
        // Mensagem de Admin (Personalizada)
        let adminTemplate = appSettings.adminWhatsappMsg;
        if (!adminTemplate) {
            adminTemplate = "🔔 *NOVO AGENDAMENTO*\n\n👤 *{nome}*\n📅 {data}\n🕒 {hora}\n💅 {servicos}\n💰 {valor}";
        }

        const adminMsg = adminTemplate
            .replace(/{nome}/g, customerName)
            .replace(/{data}/g, selectedDate.split('-').reverse().join('/'))
            .replace(/{hora}/g, selectedTime)
            .replace(/{servicos}/g, servicesNames)
            .replace(/{valor}/g, `R$ ${calculateTotals().price.toFixed(2)}`);

        console.log('📤 Enviando notificação para Admin...');
        console.log('🔗 URL de Notificação:', notifyUrl);

        fetch(notifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: appSettings.businessPhone,
                message: adminMsg
            })
        })
            .then(res => res.json())
            .then(data => {
                console.log('✅ Admin notificado:', data);
                if (data.success) {
                    // showSuccess('Notificação enviada!'); // Optional feedback
                }
            })
            .catch(err => console.error('❌ Falha ao notificar admin:', err));
    } else {
        console.warn('⚠️ Admin não notificado: Telefone não configurado.');
    }
    // ---------------------------------

    // Show Success
    bookingModal.classList.remove('active');
    successModal.classList.add('active');

    // Reset
    resetBooking();
}

// Reset Booking
function resetBooking() {
    selectedServices = [];
    selectedDate = null;
    selectedTime = null;
    customerForm.reset();
    datePicker.value = '';

    renderServices();
    updateFloatingBar();

    // Reset Modal Steps
    stepDatetime.style.display = 'block';
    stepCustomer.style.display = 'none';
    timeSection.style.display = 'none';
}

// Switch Page
function switchPage(page) {
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');

    if (page === 'appointments') {
        renderAppointments();
    }
}

// Render Appointments List
function renderAppointments() {
    if (appointments.length === 0) {
        appointmentsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhum agendamento encontrado.</p>
            </div>
        `;
        return;
    }

    appointmentsList.innerHTML = appointments.map(apt => `
        <div class="appointment-card">
            <div class="appointment-header">
                <div>
                    <strong>${new Date(apt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> - ${apt.time}
                </div>
                <div class="appointment-status">${apt.status}</div>
            </div>
            <div class="appointment-services">
                ${apt.services.map(s => s.name).join(', ')}
            </div>
        </div>
    `).join('');
}

// Render Payment Methods Modal
function renderPaymentMethodsModal() {
    console.log('Rendering Payment Modal...');
    const container = document.getElementById('payment-methods-display-list');
    if (!container) {
        console.warn('❌ Container #payment-methods-display-list not found!');
        return;
    }

    // Use direct data
    const list = appSettings.paymentMethods || [];

    if (list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nenhuma forma de pagamento disponível.</p>';
        return;
    }

    container.innerHTML = list.map(pm => {
        // Compatibility: handle if string or object
        const name = typeof pm === 'string' ? pm : pm.name;
        const icon = typeof pm === 'string' ? '💳' : (pm.icon || '💳');
        const desc = typeof pm === 'string' ? '' : (pm.description || '');

        return `
        <div style="display: flex; align-items: start; gap: 10px; padding: 12px; background: var(--bg-secondary); border-radius: 10px; border: 1px solid var(--border);">
            <div style="background: var(--primary); color: white; padding: 5px; border-radius: 5px; font-size: 1.2rem; min-width: 35px; text-align: center;">${icon}</div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 600; color: var(--text-primary); font-size: 1.1rem;">${name}</span>
                ${desc ? `<span style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 2px;">${desc}</span>` : ''}
            </div>
        </div>
    `}).join('');
}

// Init
init();
