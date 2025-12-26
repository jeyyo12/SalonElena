/**
 * Main Application - Core logic and routing
 */

let AppState = {
    currentTab: 'dashboard',
    currentClientId: null,
    currentAppointmentId: null,
    currentServiceId: null,
    appointmentFilter: 'today',
    transactionFilter: 'all',
    transactionDateFilter: UI.getTodayInputValue(),
    historyPeriod: 'day',
    historyDate: UI.getTodayInputValue(),
    historyTxFilter: 'all',
    historyTxSearch: '',
    accountingPeriod: 'month',
    accountingFilters: {
        dateFrom: null,
        dateTo: null,
        type: 'all',
        paymentMethods: [],
        categories: [],
        status: 'all',
        search: ''
    },
    accountingTxFilter: 'all'
};

const App = {
    /**
     * Initialize application
     */
    init() {
        // Initialize auto-sync storage first
        Storage.init();
        
        this.loadData();
        this.setupEventListeners();
        this.render();
        this.updateDateTime();
        
        // Update date/time every minute
        setInterval(() => this.updateDateTime(), 60000);
    },

    /**
     * Load all data from storage
     */
    loadData() {
        Services.init();
        Clients.init();
        Appointments.init();
        Transactions.init();
        Accounting.init();
    },

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupNavigation();
        this.setupClients();
        this.setupAppointments();
        this.setupServices();
        this.setupTransactions();
        this.setupHistory();
        this.setupAccounting();
        this.setupModals();
    },

    /**
     * NAVIGATION
     */
    setupNavigation() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        // Hide all sections
        document.querySelectorAll('.tab-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active from tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected section
        const section = document.getElementById(tabName);
        if (section) section.classList.add('active');

        // Mark tab as active
        document.querySelector(`.nav-tab[data-tab="${tabName}"]`)?.classList.add('active');

        AppState.currentTab = tabName;

        // Render content
        switch (tabName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'clients':
                this.renderClients();
                break;
            case 'appointments':
                this.renderAppointments();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'history':
                this.renderHistory();
                break;
            case 'accounting':
                // AUTO-SYNC before rendering accounting tab
                Logger.log('[APP] Switching to accounting - running full sync');
                Accounting.fullSync();
                this.renderAccounting();
                break;
            case 'services':
                this.renderServices();
                break;
        }
    },

    /**
     * Update date/time display
     */
    updateDateTime() {
        const today = new Date();
        const formatter = new Intl.DateTimeFormat('ro-RO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const display = document.getElementById('dateDisplay');
        if (display) {
            display.textContent = formatter.format(today);
        }
    },

    /**
     * ==================== CLIENTS TAB ====================
     */
    setupClients() {
        const btnAddClient = document.getElementById('btnAddClient');
        btnAddClient.addEventListener('click', () => this.openClientModal(null));

        const clientSearch = document.getElementById('clientSearch');
        clientSearch.addEventListener('input', () => this.renderClients());

        const filterChips = document.querySelectorAll('.filter-chips .chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.renderClients();
            });
        });
    },

    renderClients() {
        if (AppState.currentTab !== 'clients') return;

        const searchTerm = document.getElementById('clientSearch').value;
        const activeFilter = document.querySelector('.filter-chips .chip.active');
        const filter = activeFilter?.dataset.filter || 'all';

        let clients = Clients.filter(filter, searchTerm);
        clients = Clients.sortByPriority(clients);

        const grid = document.getElementById('clientsGrid');
        if (clients.length === 0) {
            grid.innerHTML = '<p class="empty-state">Nu sunt clienți. Adaugă prima clientă!</p>';
            return;
        }

        grid.innerHTML = clients.map(client => this.createClientCard(client)).join('');

        // Add event listeners
        grid.querySelectorAll('.client-card').forEach(card => {
            const clientId = card.dataset.clientId;
            const viewBtn = card.querySelector('.btn-view');
            const appointBtn = card.querySelector('.btn-appt');
            const deleteBtn = card.querySelector('.btn-delete');

            viewBtn.addEventListener('click', () => {
                this.openClientModal(clientId);
            });

            appointBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openAppointmentModal(null, clientId);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Ștergi clientă? Programările vor rămâne.')) {
                    Clients.delete(clientId);
                    UI.showToast('Clientă ștearsă', 'success');
                    this.renderClients();
                }
            });
        });
    },

    createClientCard(client) {
        const mainPhoto = Clients.getMainPhoto(client.id);
        const avatarContent = mainPhoto 
            ? `<img src="${mainPhoto.data}" alt="${client.name}">`
            : `<span>${UI.getInitials(client.name)}</span>`;

        return `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-header">
                    <div class="client-avatar">${avatarContent}</div>
                    <div class="client-info">
                        <div class="client-name">${client.name}</div>
                        <div class="client-phone">${client.phone}</div>
                        <span class="client-badge ${UI.getBadgeClass(client.tag)}">
                            ${UI.getStatusLabel(client.tag)}
                        </span>
                    </div>
                </div>
                <div class="client-stats">
                    <div class="client-stat">
                        <span class="client-stat-label">Vizite:</span>
                        <span class="client-stat-value">${client.visits}</span>
                    </div>
                    <div class="client-stat">
                        <span class="client-stat-label">Cheltuit:</span>
                        <span class="client-stat-value">${UI.formatCurrency(client.totalSpent)}</span>
                    </div>
                    <div class="client-stat">
                        <span class="client-stat-label">Ultima vizită:</span>
                        <span class="client-stat-value">${client.lastVisitAt ? UI.formatDate(client.lastVisitAt) : '-'}</span>
                    </div>
                </div>
                <div class="client-actions">
                    <button class="btn btn-secondary btn-sm btn-view">Vizualizare</button>
                    <button class="btn btn-primary btn-sm btn-appt">+ Programare</button>
                    <button class="btn btn-danger btn-sm btn-delete">Șterge</button>
                </div>
            </div>
        `;
    },

    openClientModal(clientId) {
        UI.openModal('clientModal');
        AppState.currentClientId = clientId;

        const modal = document.getElementById('clientModal');
        const deleteBtn = modal.querySelector('#btnClientDelete');
        const form = document.getElementById('clientForm');

        if (clientId) {
            const client = Clients.getById(clientId);
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientPhone').value = client.phone;
            document.getElementById('clientEmail').value = client.email;
            document.getElementById('clientNotes').value = client.notes;
            deleteBtn.style.display = 'block';

            // Render gallery
            this.renderClientGallery(client);

            // Render appointments
            this.renderClientAppointments(client.id);

            // Render stats
            this.renderClientStats(client);

            // Update tag display
            document.getElementById('clientTag').textContent = UI.getStatusLabel(client.tag);
            document.getElementById('clientTag').className = `badge-display ${UI.getBadgeClass(client.tag)}`;
        } else {
            form.reset();
            deleteBtn.style.display = 'none';
            document.getElementById('clientTag').textContent = '---';
            document.getElementById('clientTag').className = 'badge-display';
            document.getElementById('photoGallery').innerHTML = '';
            document.getElementById('clientAppointmentsList').innerHTML = '<p class="empty-state">Salvează clientă mai întâi</p>';
            document.getElementById('statVisits').textContent = '0';
            document.getElementById('statTotalSpent').textContent = '0 RON';
            document.getElementById('statLastVisit').textContent = '-';
            document.getElementById('statStatus').textContent = '-';
            
            // Initialize upload zone for new client
            this.setupPhotoUpload();
        }
    },

    renderClientGallery(client) {
        const gallery = document.getElementById('photoGallery');
        const uploadZone = document.getElementById('uploadZone');

        if (!client.photos || client.photos.length === 0) {
            gallery.innerHTML = '';
        } else {
            gallery.innerHTML = client.photos.map(photo => `
                <div class="photo-item ${photo.id === client.mainPhotoId ? 'main' : ''}">
                    <img src="${photo.data}" alt="Photo">
                    <div class="photo-controls">
                        <button data-photo-id="${photo.id}" data-action="main">Main</button>
                        <button data-photo-id="${photo.id}" data-action="delete">Delete</button>
                    </div>
                </div>
            `).join('');

            // Add photo control listeners
            gallery.querySelectorAll('.photo-controls button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const photoId = btn.dataset.photoId;
                    const action = btn.dataset.action;

                    if (action === 'main') {
                        Clients.setMainPhoto(AppState.currentClientId, photoId);
                        this.openClientModal(AppState.currentClientId);
                        UI.showToast('Poză principală setată', 'success');
                    } else if (action === 'delete') {
                        Clients.removePhoto(AppState.currentClientId, photoId);
                        this.openClientModal(AppState.currentClientId);
                        UI.showToast('Poză ștearsă', 'success');
                    }
                });
            });
        }

        // Setup file upload with common method
        this.setupPhotoUpload();
    },

    handleFileUpload(files) {
        if (!AppState.currentClientId) {
            UI.showToast('Salvează clientă mai întâi', 'warning');
            return;
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                Clients.addPhoto(AppState.currentClientId, e.target.result);
                this.openClientModal(AppState.currentClientId);
                UI.showToast('Poză adăugată', 'success');
            };
            reader.readAsDataURL(file);
        });
    },

    setupPhotoUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('clientPhotoInput');

        // Remove existing listeners by cloning
        const newUploadZone = uploadZone.cloneNode(true);
        uploadZone.parentNode.replaceChild(newUploadZone, uploadZone);
        
        const newFileInput = newUploadZone.querySelector('#clientPhotoInput');

        // Click to open file dialog
        newUploadZone.addEventListener('click', () => {
            newFileInput.click();
        });

        // Drag over
        newUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newUploadZone.style.borderColor = 'var(--color-accent-violet)';
            newUploadZone.style.backgroundColor = 'rgba(157, 78, 221, 0.05)';
        });

        // Drag leave
        newUploadZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newUploadZone.style.borderColor = '';
            newUploadZone.style.backgroundColor = '';
        });

        // Drop
        newUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newUploadZone.style.borderColor = '';
            newUploadZone.style.backgroundColor = '';
            this.handleFileUpload(e.dataTransfer.files);
        });

        // File input change
        newFileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
    },

    renderClientAppointments(clientId) {
        const appointments = Appointments.getByClient(clientId);
        const list = document.getElementById('clientAppointmentsList');

        if (appointments.length === 0) {
            list.innerHTML = '<p class="empty-state">Nu sunt programări</p>';
            return;
        }

        list.innerHTML = appointments.map(appt => {
            const client = Clients.getById(appt.clientId);
            const service = Services.getById(appt.serviceId);
            const apptDate = new Date(appt.date);
            const dateStr = UI.formatDate(appt.date);

            return `
                <div class="appointment-card">
                    <div class="appointment-time">${appt.time}</div>
                    <div class="appointment-info">
                        <div class="appointment-client">${client?.name || '-'}</div>
                        <div class="appointment-service">${service?.name || '-'}</div>
                        <div style="color: var(--color-text-secondary); font-size: var(--font-size-xs); margin-top: 4px;">${dateStr}</div>
                    </div>
                    <span class="appointment-status status-${appt.status}">${appt.status}</span>
                    <div class="appointment-actions">
                        <button class="btn btn-secondary btn-sm btn-edit-appt" data-appt-id="${appt.id}">Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete-appt" data-appt-id="${appt.id}">Șterge</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add listeners
        list.querySelectorAll('.btn-edit-appt').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openAppointmentModal(btn.dataset.apptId);
            });
        });

        list.querySelectorAll('.btn-delete-appt').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Ștergi programare?')) {
                    Appointments.delete(btn.dataset.apptId);
                    UI.showToast('Programare ștearsă', 'success');
                    this.openClientModal(AppState.currentClientId);
                }
            });
        });
    },

    renderClientStats(client) {
        document.getElementById('statVisits').textContent = client.visits;
        document.getElementById('statTotalSpent').textContent = UI.formatCurrency(client.totalSpent);
        document.getElementById('statLastVisit').textContent = client.lastVisitAt ? UI.formatDate(client.lastVisitAt) : '-';
        document.getElementById('statStatus').textContent = UI.getStatusLabel(client.tag);
    },

    /**
     * ==================== APPOINTMENTS TAB ====================
     */
    setupAppointments() {
        const btnAddAppointment = document.getElementById('btnAddAppointment');
        btnAddAppointment.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.switchTab('appointments');
            this.openAppointmentModal(null);
        });

        const filterBtns = document.querySelectorAll('.appointment-filters .filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.appointmentFilter = btn.dataset.filter;
                this.renderAppointments();
            });
        });
    },

    renderAppointments() {
        if (AppState.currentTab !== 'appointments') return;

        let appointments = [];
        const filter = AppState.appointmentFilter;

        if (filter === 'today') {
            appointments = Appointments.getToday();
        } else if (filter === 'tomorrow') {
            appointments = Appointments.getTomorrow();
        } else if (filter === 'week') {
            appointments = Appointments.getThisWeek();
        } else {
            appointments = Appointments.getAll();
        }

        appointments = Appointments.sortByTime(appointments);

        const list = document.getElementById('appointmentsList');
        if (appointments.length === 0) {
            list.innerHTML = '<p class="empty-state">Nu sunt programări</p>';
            return;
        }

        list.innerHTML = appointments.map(appt => {
            const client = Clients.getById(appt.clientId);
            const service = Services.getById(appt.serviceId);

            return `
                <div class="appointment-card">
                    <div class="appointment-time">${appt.time}</div>
                    <div class="appointment-info">
                        <div class="appointment-client">${client?.name || '-'}</div>
                        <div class="appointment-service">${service?.name || '-'} (${appt.duration} min)</div>
                    </div>
                    <span class="appointment-status status-${appt.status}">${appt.status}</span>
                    <div class="appointment-actions">
                        <button class="btn btn-secondary btn-sm btn-edit" data-appt-id="${appt.id}">Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete" data-appt-id="${appt.id}">Șterge</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add listeners
        list.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openAppointmentModal(btn.dataset.apptId);
            });
        });

        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Ștergi programare?')) {
                    Appointments.delete(btn.dataset.apptId);
                    UI.showToast('Programare ștearsă', 'success');
                    this.renderAppointments();
                }
            });
        });
    },

    openAppointmentModal(appointmentId, clientId = null) {
        UI.openModal('appointmentModal');
        AppState.currentAppointmentId = appointmentId;

        const form = document.getElementById('appointmentForm');
        const deleteBtn = document.getElementById('btnAppointmentDelete');
        const paymentSection = document.getElementById('paymentSection');
        const statusSelect = document.getElementById('appointmentStatus');

        form.reset();
        deleteBtn.style.display = appointmentId ? 'block' : 'none';
        paymentSection.style.display = 'none';

        // Populate client dropdown
        this.updateClientDropdown(clientId);

        // Populate service dropdown
        this.updateServiceDropdown();

        // Set today's date
        document.getElementById('appointmentDate').value = UI.getTodayInputValue();
        document.getElementById('appointmentDuration').value = 60;

        if (appointmentId) {
            const appt = Appointments.getById(appointmentId);
            document.getElementById('appointmentClient').value = appt.clientId;
            document.getElementById('appointmentService').value = appt.serviceId;
            document.getElementById('appointmentDate').value = UI.getDateInputValue(appt.date);
            document.getElementById('appointmentTime').value = appt.time;
            document.getElementById('appointmentDuration').value = appt.duration;
            document.getElementById('appointmentNotes').value = appt.notes;
            statusSelect.value = appt.status;

            // Show payment section if completed
            if (appt.status === 'completed') {
                paymentSection.style.display = 'block';
                if (appt.isPaid) {
                    document.getElementById('paymentAmount').value = appt.paymentAmount;
                    document.getElementById('paymentMethod').value = appt.paymentMethod;
                }
            }
        }

        // Listen for status change
        statusSelect.addEventListener('change', () => {
            paymentSection.style.display = statusSelect.value === 'completed' ? 'block' : 'none';
        });
    },

    updateClientDropdown(preSelectedId = null) {
        const select = document.getElementById('appointmentClient');
        const clients = Clients.getAll();
        
        select.innerHTML = '<option value="">Selectează clientă</option>' + 
            clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (preSelectedId) {
            select.value = preSelectedId;
        }
    },

    updateServiceDropdown() {
        const select = document.getElementById('appointmentService');
        const services = Services.getAll();
        
        select.innerHTML = '<option value="">Selectează serviciu</option>' + 
            services.map(s => `<option value="${s.id}">${s.name} - ${UI.formatCurrency(s.price)}</option>`).join('');
    },

    /**
     * ==================== SERVICES TAB ====================
     */
    setupServices() {
        const btnAddService = document.getElementById('btnAddService');
        btnAddService.addEventListener('click', () => this.openServiceModal(null));
    },

    renderServices() {
        if (AppState.currentTab !== 'services') return;

        const services = Services.getAll();
        const grid = document.getElementById('servicesList');

        if (services.length === 0) {
            grid.innerHTML = '<p class="empty-state">Nu sunt servicii</p>';
            return;
        }

        grid.innerHTML = services.map(service => `
            <div class="service-card" data-service-id="${service.id}">
                <div class="service-name">${service.name}</div>
                <span class="service-category">${service.category.toUpperCase()}</span>
                <div class="service-details">
                    <div class="service-detail">
                        <div class="service-detail-label">Preț</div>
                        <div class="service-detail-value">${UI.formatCurrency(service.price)}</div>
                    </div>
                    <div class="service-detail">
                        <div class="service-detail-label">Durată</div>
                        <div class="service-detail-value">${service.duration} min</div>
                    </div>
                </div>
                <div class="service-actions">
                    <button class="btn btn-secondary btn-sm btn-edit">Edit</button>
                    <button class="btn btn-danger btn-sm btn-delete">Șterge</button>
                </div>
            </div>
        `).join('');

        // Add listeners
        grid.querySelectorAll('.service-card').forEach(card => {
            const serviceId = card.dataset.serviceId;
            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');

            editBtn.addEventListener('click', () => {
                this.openServiceModal(serviceId);
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('Ștergi serviciu?')) {
                    Services.delete(serviceId);
                    UI.showToast('Serviciu șters', 'success');
                    this.renderServices();
                }
            });
        });
    },

    openServiceModal(serviceId) {
        UI.openModal('serviceModal');
        AppState.currentServiceId = serviceId;

        const form = document.getElementById('serviceForm');
        const deleteBtn = document.getElementById('btnServiceDelete');

        form.reset();
        deleteBtn.style.display = serviceId ? 'block' : 'none';

        if (serviceId) {
            const service = Services.getById(serviceId);
            document.getElementById('serviceName').value = service.name;
            document.getElementById('serviceCategory').value = service.category;
            document.getElementById('servicePrice').value = service.price;
            document.getElementById('serviceDuration').value = service.duration;
        }
    },

    /**
     * ==================== TRANSACTIONS TAB ====================
     */
    setupTransactions() {
        const dateInput = document.getElementById('transactionDate');
        dateInput.value = UI.getTodayInputValue();
        dateInput.addEventListener('change', () => {
            AppState.transactionDateFilter = dateInput.value;
            this.renderTransactions();
        });

        const btnAddExpense = document.getElementById('btnAddExpense');
        btnAddExpense.addEventListener('click', () => this.openExpenseModal());

        const txFilters = document.querySelectorAll('.tx-filter');
        txFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                txFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                AppState.transactionFilter = filter.dataset.type;
                this.renderTransactions();
            });
        });
    },

    renderTransactions() {
        if (AppState.currentTab !== 'transactions') return;

        const dateStr = AppState.transactionDateFilter;
        const summary = Transactions.getDailySummary(dateStr);

        // Update KPI
        document.getElementById('txIncome').textContent = UI.formatCurrency(summary.income);
        document.getElementById('txExpenses').textContent = UI.formatCurrency(summary.expenses);
        document.getElementById('txProfit').textContent = UI.formatCurrency(summary.profit);
        document.getElementById('txClients').textContent = summary.clientsServed;

        // Filter transactions
        let transactions = summary.transactions;
        const filter = AppState.transactionFilter;
        transactions = Transactions.filterByType(transactions, filter);
        transactions = Transactions.sortByDate(transactions);

        const list = document.getElementById('transactionsList');
        if (transactions.length === 0) {
            list.innerHTML = '<p class="empty-state">Nu sunt tranzacții pentru aceasta zi</p>';
            return;
        }

        list.innerHTML = transactions.map(tx => {
            const isIncome = tx.type === 'income';
            const sign = isIncome ? '+' : '-';
            const amount = `${sign}${UI.formatCurrency(tx.amount)}`;
            
            let description = tx.description;
            if (isIncome) {
                const client = Clients.getById(tx.clientId);
                const service = Services.getById(tx.serviceId);
                description = `${client?.name || '-'} - ${service?.name || '-'}`;
            }

            return `
                <div class="transaction-item">
                    <div class="tx-desc">
                        <div class="tx-label">${description}</div>
                        <div class="tx-meta">${UI.formatDateTime(tx.date)}</div>
                    </div>
                    <div class="tx-amount ${isIncome ? 'tx-income' : 'tx-expense'}">
                        ${amount}
                    </div>
                    <span class="tx-type ${tx.type}">${tx.type === 'income' ? 'VENIT' : 'CHELTUIALA'}</span>
                    <button class="btn btn-danger btn-sm" data-tx-id="${tx.id}" style="margin-left: 8px;">×</button>
                </div>
            `;
        }).join('');

        // Add delete listeners
        list.querySelectorAll('button[data-tx-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Ștergi tranzacție?')) {
                    Transactions.delete(btn.dataset.txId);
                    UI.showToast('Tranzacție ștearsă', 'success');
                    this.renderTransactions();
                }
            });
        });
    },

    openExpenseModal() {
        Logger.log('[EXPENSE] Opening expense modal');
        
        // Open modal
        UI.openModal('expenseModal');
        
        // Reset form
        const form = document.getElementById('expenseForm');
        if (form) {
            form.reset();
            Logger.log('[EXPENSE] Form reset');
        }
        
        // Populate categories
        this.populateModalExpenseCategorySelect();
        Logger.log('[EXPENSE] Categories populated');
        
        // Focus on first input
        const descInput = document.getElementById('modal-expenseDescription');
        if (descInput) {
            setTimeout(() => descInput.focus(), 100);
        }
        
        Logger.log('[EXPENSE] Modal opened successfully');
    },

    /**
     * ==================== HISTORY/REPORTS TAB ====================
     */
    setupHistory() {
        // Period toggle
        const periodBtns = document.querySelectorAll('.period-btn');
        periodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                periodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                AppState.historyPeriod = btn.dataset.period;
                this.renderHistory();
            });
        });

        // Day selector
        const historyDate = document.getElementById('historyDate');
        historyDate.value = UI.getTodayInputValue();
        historyDate.addEventListener('change', () => {
            AppState.historyDate = historyDate.value;
            this.renderHistory();
        });

        // Week selectors
        const prevWeek = document.getElementById('prevWeek');
        const nextWeek = document.getElementById('nextWeek');
        prevWeek.addEventListener('click', () => {
            const d = new Date(AppState.historyDate);
            d.setDate(d.getDate() - 7);
            AppState.historyDate = UI.getDateInputValue(d);
            historyDate.value = AppState.historyDate;
            this.renderHistory();
        });
        nextWeek.addEventListener('click', () => {
            const d = new Date(AppState.historyDate);
            d.setDate(d.getDate() + 7);
            AppState.historyDate = UI.getDateInputValue(d);
            historyDate.value = AppState.historyDate;
            this.renderHistory();
        });

        // Month selectors
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');

        // Populate years
        const currentYear = new Date().getFullYear();
        for (let i = currentYear - 2; i <= currentYear + 2; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }

        monthSelect.addEventListener('change', () => this.renderHistory());
        yearSelect.addEventListener('change', () => this.renderHistory());
        prevMonth.addEventListener('click', () => {
            let m = parseInt(monthSelect.value) - 1;
            let y = parseInt(yearSelect.value);
            if (m < 0) {
                m = 11;
                y--;
            }
            monthSelect.value = m;
            yearSelect.value = y;
            this.renderHistory();
        });
        nextMonth.addEventListener('click', () => {
            let m = parseInt(monthSelect.value) + 1;
            let y = parseInt(yearSelect.value);
            if (m > 11) {
                m = 0;
                y++;
            }
            monthSelect.value = m;
            yearSelect.value = y;
            this.renderHistory();
        });

        // Transaction filters and search
        const txFiltersHistory = document.querySelectorAll('.tx-filter-history');
        txFiltersHistory.forEach(filter => {
            filter.addEventListener('click', () => {
                txFiltersHistory.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                AppState.historyTxFilter = filter.dataset.filter;
                this.renderHistory();
            });
        });

        const txSearch = document.getElementById('txSearch');
        txSearch.addEventListener('input', () => {
            AppState.historyTxSearch = txSearch.value;
            this.renderHistory();
        });

        // Export button
        const btnExportCSV = document.getElementById('btnExportCSV');
        btnExportCSV.addEventListener('click', () => this.exportHistoryCSV());
    },

    renderHistory() {
        if (AppState.currentTab !== 'history') return;

        const period = AppState.historyPeriod || 'day';
        let dateRange;

        // Determine date range
        if (period === 'day') {
            const date = new Date(AppState.historyDate || UI.getTodayInputValue());
            dateRange = { start: date, end: date };
        } else if (period === 'week') {
            const range = History.getWeekRange(AppState.historyDate || new Date());
            dateRange = { start: range.startDate, end: range.endDate };
            document.getElementById('weekDisplay').textContent = History.getWeekDisplayString(AppState.historyDate || new Date());
        } else if (period === 'month') {
            const month = parseInt(document.getElementById('monthSelect').value);
            const year = parseInt(document.getElementById('yearSelect').value);
            const range = History.getMonthRange(year, month);
            dateRange = { start: range.startDate, end: range.endDate };
        }

        // Get summary
        const summary = History.getSummaryForRange(dateRange.start, dateRange.end);

        // Update KPI cards
        document.getElementById('historyIncome').textContent = UI.formatCurrency(summary.incomeTotal);
        document.getElementById('historyExpenses').textContent = UI.formatCurrency(summary.expenseTotal);
        document.getElementById('historyProfit').textContent = UI.formatCurrency(summary.profit);
        document.getElementById('historyClients').textContent = summary.clientsServed;
        document.getElementById('historyTxCount').textContent = summary.txCount;

        // Show/hide day breakdown
        const dayBreakdownContainer = document.getElementById('dayBreakdown');
        if (period !== 'day') {
            dayBreakdownContainer.style.display = 'block';
            const dayGroups = History.groupByDay(summary.transactions);
            const breakdownBody = document.getElementById('breakdownBody');
            breakdownBody.innerHTML = dayGroups.map(day => `
                <div class="breakdown-row" data-date="${day.date}">
                    <div class="col-date">${new Date(day.date).toLocaleDateString('ro-RO')}</div>
                    <div class="col-income">${UI.formatCurrency(day.income)}</div>
                    <div class="col-expenses">${UI.formatCurrency(day.expenses)}</div>
                    <div class="col-profit">${UI.formatCurrency(day.profit)}</div>
                    <div class="col-clients">${day.clients}</div>
                </div>
            `).join('');

            // Add click handlers for day rows
            breakdownBody.querySelectorAll('.breakdown-row').forEach(row => {
                row.addEventListener('click', () => {
                    const date = row.dataset.date;
                    const dayTxs = summary.transactions.filter(tx => tx.date.split('T')[0] === date);
                    this.showDayTransactions(dayTxs);
                });
            });
        } else {
            dayBreakdownContainer.style.display = 'none';
        }

        // Render transactions
        let txs = summary.transactions;
        const filter = AppState.historyTxFilter || 'all';
        if (filter !== 'all') {
            txs = txs.filter(tx => tx.type === filter);
        }

        const searchTerm = AppState.historyTxSearch || '';
        txs = History.searchTransactions(txs, searchTerm);
        txs = txs.sort((a, b) => new Date(b.date) - new Date(a.date));

        const txList = document.getElementById('historyTransactionsList');
        if (txs.length === 0) {
            txList.innerHTML = '<p class="empty-state">Nu sunt tranzacții</p>';
        } else {
            txList.innerHTML = txs.map(tx => {
                const isIncome = tx.type === 'income';
                const amount = UI.formatCurrency(tx.amount);
                const client = isIncome ? Clients.getById(tx.clientId)?.name : tx.note;

                return `
                    <div class="transaction-item">
                        <div class="tx-desc">
                            <div class="tx-label">${client || '-'}</div>
                            <div class="tx-meta">${UI.formatDateTime(tx.date)}</div>
                        </div>
                        <div class="tx-amount ${isIncome ? 'tx-income' : 'tx-expense'}">
                            ${isIncome ? '+' : '-'}${amount}
                        </div>
                        <span class="tx-type ${tx.type}">${tx.type === 'income' ? 'VENIT' : 'CHELTUIALA'}</span>
                    </div>
                `;
            }).join('');
        }
    },

    showDayTransactions(dayTransactions) {
        // This could expand a details view or filter the list - for now we just re-render with date filter
        UI.showToast(`Afișez ${dayTransactions.length} tranzacții pentru ziua selectată`, 'success');
    },

    exportHistoryCSV() {
        const period = AppState.historyPeriod || 'day';
        let dateRange, filename;

        if (period === 'day') {
            const date = new Date(AppState.historyDate || UI.getTodayInputValue());
            dateRange = { start: date, end: date };
            filename = `raport-${AppState.historyDate || new Date().toISOString().split('T')[0]}.csv`;
        } else if (period === 'week') {
            const range = History.getWeekRange(AppState.historyDate || new Date());
            dateRange = { start: range.startDate, end: range.endDate };
            filename = `raport-saptamana-${range.weekStart}_${range.weekEnd}.csv`;
        } else if (period === 'month') {
            const month = parseInt(document.getElementById('monthSelect').value);
            const year = parseInt(document.getElementById('yearSelect').value);
            const range = History.getMonthRange(year, month);
            dateRange = { start: range.startDate, end: range.endDate };
            filename = `raport-luna-${History.getMonthDisplayString(year, month)}.csv`;
        }

        const summary = History.getSummaryForRange(dateRange.start, dateRange.end);
        History.exportToCSV(summary.transactions, filename);
        UI.showToast('Fișier CSV exportat!', 'success');
    },

    /**
     * ==================== DASHBOARD TAB ====================
     */
    renderDashboard() {
        if (AppState.currentTab !== 'dashboard') return;

        const today = new Date();
        const summary = Transactions.getDailySummary(UI.getTodayInputValue());

        // Update KPI cards
        document.getElementById('kpiIncome').textContent = UI.formatCurrency(summary.income);
        document.getElementById('kpiExpenses').textContent = UI.formatCurrency(summary.expenses);
        document.getElementById('kpiProfit').textContent = UI.formatCurrency(summary.profit);
        document.getElementById('kpiClients').textContent = summary.clientsServed;

        // Render today's appointments
        const appointments = Appointments.getToday();
        const apptContainer = document.getElementById('dashboardAppointments');
        
        if (appointments.length === 0) {
            apptContainer.innerHTML = '<p class="empty-state">Nu sunt programări astazi</p>';
        } else {
            apptContainer.innerHTML = appointments.map(appt => {
                const client = Clients.getById(appt.clientId);
                const service = Services.getById(appt.serviceId);

                return `
                    <div class="appointment-card">
                        <div class="appointment-time">${appt.time}</div>
                        <div class="appointment-info">
                            <div class="appointment-client">${client?.name || '-'}</div>
                            <div class="appointment-service">${service?.name || '-'}</div>
                        </div>
                        <span class="appointment-status status-${appt.status}">${appt.status}</span>
                    </div>
                `;
            }).join('');
        }

        // Render recent transactions
        const allTransactions = Transactions.sortByDate().slice(0, 5);
        const txContainer = document.getElementById('dashboardTransactions');

        if (allTransactions.length === 0) {
            txContainer.innerHTML = '<p class="empty-state">Nu sunt tranzacții</p>';
        } else {
            txContainer.innerHTML = allTransactions.map(tx => {
                const isIncome = tx.type === 'income';
                const amount = UI.formatCurrency(tx.amount);
                const client = isIncome ? Clients.getById(tx.clientId)?.name : tx.description;

                return `
                    <div class="transaction-item">
                        <div class="tx-desc">
                            <div class="tx-label">${client || '-'}</div>
                            <div class="tx-meta">${UI.formatDateTime(tx.date)}</div>
                        </div>
                        <div class="tx-amount ${isIncome ? 'tx-income' : 'tx-expense'}">
                            ${isIncome ? '+' : '-'}${amount}
                        </div>
                        <span class="tx-type ${tx.type}">${tx.type === 'income' ? 'VENIT' : 'CHELTUIALA'}</span>
                    </div>
                `;
            }).join('');
        }
    },

    /**
     * ==================== MODALS ====================
     */
    setupModals() {
        Logger.log('[INIT] Setting up modal handlers');
        
        UI.setupModalClose('clientModal');
        UI.setupModalTabs('clientModal');
        UI.setupModalClose('appointmentModal');
        UI.setupModalClose('serviceModal');
        UI.setupModalClose('expenseModal');
        UI.setupModalClose('recurringExpensesModal');
        
        // Setup global ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModals = document.querySelectorAll('.modal.active');
                if (activeModals.length > 0) {
                    Logger.log('[EVENT] ESC key pressed, closing modals');
                    activeModals.forEach(m => UI.closeModal(m.id));
                }
            }
        });
        Logger.log('[INIT] ESC handler attached');

        // Client modal save
        const btnClientSave = document.getElementById('btnClientSave');
        if (btnClientSave) {
            btnClientSave.addEventListener('click', () => this.saveClient());
        }

        const btnClientCancel = document.getElementById('btnClientCancel');
        if (btnClientCancel) {
            btnClientCancel.addEventListener('click', () => UI.closeModal('clientModal'));
        }

        document.getElementById('btnClientDelete').addEventListener('click', () => {
            if (confirm('Ștergi clientă permanent?')) {
                Clients.delete(AppState.currentClientId);
                UI.closeModal('clientModal');
                UI.showToast('Clientă ștearsă', 'success');
                this.renderClients();
            }
        });

        // Quick appointment from client modal
        document.getElementById('btnQuickAppointment').addEventListener('click', () => {
            this.openAppointmentModal(null, AppState.currentClientId);
        });

        // New client from appointment modal
        document.getElementById('btnNewClientFromAppt').addEventListener('click', () => {
            const name = prompt('Nume clientă:');
            if (!name) return;
            const phone = prompt('Telefon:');
            if (!phone) return;

            const result = Clients.create(name, phone);
            if (result.error) {
                UI.showToast(result.error, 'error');
            } else {
                this.updateClientDropdown(result.id);
                document.getElementById('appointmentClient').value = result.id;
                UI.showToast('Clientă creată', 'success');
            }
        });

        // Appointment modal save
        document.getElementById('btnAppointmentSave').addEventListener('click', () => {
            this.saveAppointment();
        });

        document.getElementById('btnAppointmentCancel').addEventListener('click', () => {
            UI.closeModal('appointmentModal');
        });

        document.getElementById('btnAppointmentDelete').addEventListener('click', () => {
            if (confirm('Ștergi programare?')) {
                Appointments.delete(AppState.currentAppointmentId);
                UI.closeModal('appointmentModal');
                UI.showToast('Programare ștearsă', 'success');
                this.renderAppointments();
            }
        });

        // Service modal save
        document.getElementById('btnServiceSave').addEventListener('click', () => {
            this.saveService();
        });

        document.getElementById('btnServiceCancel').addEventListener('click', () => {
            UI.closeModal('serviceModal');
        });

        document.getElementById('btnServiceDelete').addEventListener('click', () => {
            if (confirm('Ștergi serviciu?')) {
                Services.delete(AppState.currentServiceId);
                UI.closeModal('serviceModal');
                UI.showToast('Serviciu șters', 'success');
                this.renderServices();
            }
        });

        // Expense modal save
        const btnExpenseSave = document.getElementById('btnExpenseSave');
        if (btnExpenseSave) {
            Logger.log('[INIT] btnExpenseSave event listener attached');
            btnExpenseSave.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log('[EVENT] btnExpenseSave clicked');
                this.saveExpense();
            });
        } else {
            console.warn('[WARNING] btnExpenseSave button not found in DOM');
        }

        const btnExpenseCancel = document.getElementById('btnExpenseCancel');
        if (btnExpenseCancel) {
            btnExpenseCancel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log('[EVENT] btnExpenseCancel clicked');
                UI.closeModal('expenseModal');
            });
        } else {
            console.warn('[WARNING] btnExpenseCancel button not found in DOM');
        }

        // Recurring expenses modal
        UI.setupModalClose('recurringExpensesModal');
        
        const btnRecurringExpenses = document.getElementById('btnRecurringExpenses');
        if (btnRecurringExpenses) {
            btnRecurringExpenses.addEventListener('click', () => {
                this.renderRecurringExpensesModal();
                UI.openModal('recurringExpensesModal');
            });
        }

        const btnRecurringExpensesClose = document.getElementById('btnRecurringExpensesClose');
        if (btnRecurringExpensesClose) {
            btnRecurringExpensesClose.addEventListener('click', () => {
                UI.closeModal('recurringExpensesModal');
            });
        }

        // Recurring expenses modal form - use button click instead of form submit
        const btnSaveRecurringExpense = document.querySelector('#recurringExpenseForm .btn-primary');
        if (btnSaveRecurringExpense) {
            Logger.log('[INIT] Recurring expense save button listener attached');
            btnSaveRecurringExpense.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log('[EVENT] Save recurring expense button clicked');
                this.saveRecurringExpense();
            });
        } else {
            console.warn('[WARNING] Recurring expense save button not found');
        }
    },

    /**
     * ==================== ACCOUNTING TAB ====================
     */
    setupAccounting() {
        // AUTO-SYNC: Full sync when entering accounting tab or on init
        Logger.log('[APP] Running full accounting sync...');
        Accounting.fullSync();

        // Date filters - auto-update
        const dateStartInput = document.getElementById('accDateStart');
        const dateEndInput = document.getElementById('accDateEnd');
        
        if (dateStartInput) {
            dateStartInput.addEventListener('change', () => {
                AppState.accountingFilters.dateFrom = dateStartInput.value;
                this.renderAccounting();
            });
        }
        
        if (dateEndInput) {
            dateEndInput.addEventListener('change', () => {
                AppState.accountingFilters.dateTo = dateEndInput.value;
                this.renderAccounting();
            });
        }

        // Type filter - auto-update
        const typeSelect = document.getElementById('accType');
        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                AppState.accountingFilters.type = typeSelect.value;
                this.renderAccounting();
            });
        }

        // Payment method checkboxes - auto-update
        const paymentCheckboxes = document.querySelectorAll('#accounting .checkbox-group-modern input[type="checkbox"].acc-payment-method');
        paymentCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selectedMethods = Array.from(document.querySelectorAll('#accounting .checkbox-group-modern input[type="checkbox"].acc-payment-method:checked'))
                    .map(cb => cb.value);
                AppState.accountingFilters.paymentMethods = selectedMethods;
                this.renderAccounting();
            });
        });

        // Status filter - auto-update
        const statusSelect = document.getElementById('accStatus');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => {
                AppState.accountingFilters.status = statusSelect.value;
                this.renderAccounting();
            });
        }

        // Category filter - auto-update
        const categorySelect = document.getElementById('accCategories');
        if (categorySelect) {
            categorySelect.addEventListener('change', () => {
                const selectedCategories = Array.from(categorySelect.selectedOptions)
                    .map(option => option.value)
                    .filter(val => val !== '');
                AppState.accountingFilters.categories = selectedCategories;
                this.renderAccounting();
            });
        }

        // Search - auto-update with debounce
        const searchInput = document.getElementById('accSearch');
        let searchTimeout;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    AppState.accountingFilters.search = searchInput.value.toLowerCase();
                    this.renderAccounting();
                }, 300);
            });
        }

        // Tab switching
        const accTabBtns = document.querySelectorAll('#accounting .acc-tab-btn');
        accTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.accTab;
                accTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('#accounting .acc-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`acc-tab-${tabName}`)?.classList.add('active');
            });
        });

        // Income form
        const incomeForm = document.getElementById('accIncomeForm');
        if (incomeForm) {
            incomeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveIncome();
            });
        }

        // Expense form
        const expenseForm = document.getElementById('accExpenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveExpenseAccounting();
            });
        }

        // Add category buttons
        const btnAddIncomeCategory = document.getElementById('btnAddIncomeCategory');
        if (btnAddIncomeCategory) {
            btnAddIncomeCategory.addEventListener('click', () => {
                document.getElementById('newCategoryType').value = 'income';
                document.getElementById('addCategoryForm').style.display = 'block';
                document.getElementById('newCategoryName').focus();
            });
        }

        const btnAddExpenseCategory = document.getElementById('btnAddExpenseCategory');
        if (btnAddExpenseCategory) {
            btnAddExpenseCategory.addEventListener('click', () => {
                document.getElementById('newCategoryType').value = 'expense';
                document.getElementById('addCategoryForm').style.display = 'block';
                document.getElementById('newCategoryName').focus();
            });
        }

        // Save category button
        const btnSaveCategory = document.getElementById('btnSaveCategory');
        if (btnSaveCategory) {
            btnSaveCategory.addEventListener('click', () => {
                this.saveCategory();
            });
        }

        // Cancel category button
        const btnCancelCategory = document.getElementById('btnCancelCategory');
        if (btnCancelCategory) {
            btnCancelCategory.addEventListener('click', () => {
                document.getElementById('addCategoryForm').style.display = 'none';
                document.getElementById('newCategoryName').value = '';
                document.getElementById('newCategoryColor').value = '#9D4EDD';
            });
        }

        // Reset filters
        const resetFiltersBtn = document.getElementById('btnResetFilters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                AppState.accountingFilters = {
                    dateFrom: null,
                    dateTo: null,
                    type: 'all',
                    paymentMethods: [],
                    categories: [],
                    status: 'all',
                    search: ''
                };
                // Reset UI
                document.querySelectorAll('#accounting .checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
                document.querySelectorAll('#accounting .filter-group select').forEach(sel => sel.value = 'all');
                if (searchInput) searchInput.value = '';
                this.renderAccounting();
            });
        }

        // CSV export
        const exportBtn = document.getElementById('btnExportAccounting');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const filters = AppState.accountingFilters;
                const txs = Accounting.getFilteredTransactions(filters);
                const filename = `Contabilitate_${new Date().toISOString().split('T')[0]}.csv`;
                Accounting.exportCsv(txs, filename);
                UI.showToast('Export CSV realizat', 'success');
            });
        }
    },

    setupCategoryDeleteButtons() {
        document.querySelectorAll('.category-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.dataset.categoryId;
                if (confirm('Ștergi categorie?')) {
                    Accounting.deleteCategory(categoryId);
                    this.renderAccounting();
                    UI.showToast('Categorie ștearsă', 'success');
                }
            });
        });
    },

    renderAccounting() {
        if (AppState.currentTab !== 'accounting') return;

        // Get filtered transactions
        const filters = AppState.accountingFilters;
        const txs = Accounting.getFilteredTransactions(filters);
        const summary = Accounting.getRangeSummary(filters);

        // Populate category selects
        this.populateExpenseCategorySelect();

        // Update KPI cards - using correct HTML IDs
        const incomeCard = document.getElementById('accIncomeTotal');
        if (incomeCard) incomeCard.textContent = UI.formatCurrency(summary.incomeTotal);

        const expenseCard = document.getElementById('accExpenseTotal');
        if (expenseCard) expenseCard.textContent = UI.formatCurrency(summary.expenseTotal);

        const profitCard = document.getElementById('accProfitTotal');
        if (profitCard) {
            profitCard.textContent = UI.formatCurrency(summary.profit);
            profitCard.className = summary.profit >= 0 ? 'kpi-value' : 'kpi-value danger';
        }

        const cashCard = document.getElementById('accCashTotal');
        if (cashCard) cashCard.textContent = UI.formatCurrency(summary.cashTotal);

        const cardCard = document.getElementById('accCardTotal');
        if (cardCard) cardCard.textContent = UI.formatCurrency(summary.cardTotal);

        const transferCard = document.getElementById('accTransferTotal');
        if (transferCard) transferCard.textContent = UI.formatCurrency(summary.transferTotal);

        // Render transaction list
        this.renderAccountingTransactionList(txs);

        // Render categories
        this.renderAccountingCategories();

        // Render reports
        this.renderAccountingReports(txs);
    },

    populateExpenseCategorySelect() {
        const expenseCategorySelect = document.getElementById('expenseCategory');
        if (!expenseCategorySelect) return;

        const expenseCategories = Accounting.loadCategories().filter(c => c.type === 'expense');
        expenseCategorySelect.innerHTML = '<option value="">-- Selectează --</option>';
        
        expenseCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            expenseCategorySelect.appendChild(option);
        });
    },

    populateModalExpenseCategorySelect() {
        const modalCategorySelect = document.getElementById('modal-expenseCategory');
        if (!modalCategorySelect) return;

        const expenseCategories = Accounting.categories.filter(c => c.type === 'expense');
        modalCategorySelect.innerHTML = '<option value="">-- Selectează --</option>';
        
        expenseCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            modalCategorySelect.appendChild(option);
        });
    },

    renderAccountingTransactionList(txs) {
        const listContainer = document.getElementById('acc-tab-list');
        if (!listContainer) return;

        const list = listContainer.querySelector('.accounting-transactions');
        if (!list) return;
        
        list.innerHTML = '';

        if (txs.length === 0) {
            list.innerHTML = '<div style="color: var(--color-text-secondary); padding: var(--spacing-lg);">Nicio tranzacție</div>';
            return;
        }

        txs.forEach(tx => {
            const category = Accounting.getCategory(tx.categoryId);
            const categoryColor = category ? category.color : '#9D4EDD';
            const categoryName = category ? category.name : 'Fără categorie';
            
            const item = document.createElement('div');
            item.className = 'accounting-tx-item';
            item.innerHTML = `
                <div class="acc-tx-date">${tx.date}</div>
                <div class="acc-tx-desc">
                    <div class="acc-tx-desc-title">${tx.serviceName || 'Tranzacție'}</div>
                    <div class="acc-tx-desc-sub">${tx.note || ''}</div>
                </div>
                <div class="acc-tx-category">
                    <span class="acc-tx-category-badge" style="background-color: ${categoryColor}20; color: ${categoryColor};">${categoryName}</span>
                </div>
                <div class="acc-tx-method">${this.formatPaymentMethod(tx.paymentMethod)}</div>
                <div class="acc-tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${UI.formatCurrency(tx.amount)}</div>
                <div class="acc-tx-actions">
                    <button class="btn-sm" onclick="App.editTransaction('${tx.id}')">Edit</button>
                    <button class="btn-sm btn-danger" onclick="App.deleteTransaction('${tx.id}')">Șterge</button>
                </div>
            `;
            list.appendChild(item);
        });
    },

    renderAccountingCategories() {
        const container = document.getElementById('acc-tab-categories');
        if (!container) return;

        const incomeCategories = Accounting.loadCategories().filter(c => c.type === 'income');
        const expenseCategories = Accounting.loadCategories().filter(c => c.type === 'expense');

        // Populate income categories list
        const incomeList = document.getElementById('incomeCategories');
        if (incomeList) {
            incomeList.innerHTML = '';
            incomeCategories.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                    <div class="category-info">
                        <div class="category-color" style="background-color: ${cat.color};"></div>
                        <span class="category-name">${cat.name}</span>
                    </div>
                    <button class="category-delete" data-category-id="${cat.id}">Șterge</button>
                `;
                incomeList.appendChild(card);
            });
        }

        // Populate expense categories list
        const expenseList = document.getElementById('expenseCategories');
        if (expenseList) {
            expenseList.innerHTML = '';
            expenseCategories.forEach(cat => {
                const card = document.createElement('div');
                card.className = 'category-card';
                card.innerHTML = `
                    <div class="category-info">
                        <div class="category-color" style="background-color: ${cat.color};"></div>
                        <span class="category-name">${cat.name}</span>
                    </div>
                    <button class="category-delete" data-category-id="${cat.id}">Șterge</button>
                `;
                expenseList.appendChild(card);
            });
        }

        this.setupCategoryDeleteButtons();
    },

    renderAccountingReports(txs) {
        // Get filtered transactions for reports
        const expenseTransactions = txs.filter(t => t.type === 'expense' && t.status === 'confirmed');
        const incomeTransactions = txs.filter(t => t.type === 'income' && t.status === 'confirmed');

        // ===== DAILY EXPENSES SUMMARY =====
        this.renderDailyExpenseSummary(expenseTransactions);

        // ===== DAILY PROFIT SUMMARY =====
        this.renderDailyProfitSummary(txs);

        // ===== TOP EXPENSE CATEGORIES =====
        const topExpenses = Accounting.getTopExpenseCategories(txs, 5);
        const topExpenseContainer = document.getElementById('topExpenseCategories');
        if (topExpenseContainer) {
            topExpenseContainer.innerHTML = '';
            if (topExpenses.length === 0) {
                topExpenseContainer.innerHTML = '<p class="empty-state">Nu există cheltuieli</p>';
            } else {
                topExpenses.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'report-item';
                    itemEl.innerHTML = `
                        <span class="report-item-name">${item.categoryName}</span>
                        <span class="report-item-amount">-${UI.formatCurrency(item.amount)}</span>
                    `;
                    topExpenseContainer.appendChild(itemEl);
                });
            }
        }

        // ===== TOP SERVICES =====
        const topServices = Accounting.getTopServices(txs, 5);
        const topServicesContainer = document.getElementById('topServices');
        if (topServicesContainer) {
            topServicesContainer.innerHTML = '';
            if (topServices.length === 0) {
                topServicesContainer.innerHTML = '<p class="empty-state">Nu există venituri</p>';
            } else {
                topServices.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'report-item';
                    itemEl.innerHTML = `
                        <span class="report-item-name">${item.serviceName}</span>
                        <span class="report-item-amount" style="color: var(--color-success);">+${UI.formatCurrency(item.amount)}</span>
                    `;
                    topServicesContainer.appendChild(itemEl);
                });
            }
        }

        // ===== DAY BREAKDOWN =====
        const groupedByDay = Accounting.groupByDay(txs);
        const breakdownContainer = document.getElementById('dayBreakdownAccounting');
        if (breakdownContainer) {
            breakdownContainer.innerHTML = '';
            
            if (groupedByDay.length === 0) {
                breakdownContainer.innerHTML = '<p class="empty-state">Nu există tranzacții</p>';
            } else {
                // Header
                const header = document.createElement('div');
                header.className = 'breakdown-table-header daily-summary-row header';
                header.innerHTML = `
                    <span>Data</span>
                    <span>Venituri</span>
                    <span>Cheltuieli</span>
                    <span>Profit</span>
                `;
                breakdownContainer.appendChild(header);

                // Rows
                groupedByDay.forEach(day => {
                    const row = document.createElement('div');
                    row.className = 'breakdown-table-row daily-summary-row';
                    const profitClass = day.profit >= 0 ? 'daily-profit' : 'daily-profit negative';
                    row.innerHTML = `
                        <span class="daily-date">${day.date}</span>
                        <span class="daily-income">+${UI.formatCurrency(day.income)}</span>
                        <span class="daily-expenses">-${UI.formatCurrency(day.expenses)}</span>
                        <span class="${profitClass}">${day.profit >= 0 ? '+' : ''}${UI.formatCurrency(day.profit)}</span>
                    `;
                    breakdownContainer.appendChild(row);
                });
            }
        }
    },

    renderDailyExpenseSummary(expenseTransactions) {
        const container = document.getElementById('dailyExpenseSummary');
        if (!container) return;

        // Group expenses by date
        const groupedExpenses = {};
        expenseTransactions.forEach(tx => {
            if (!groupedExpenses[tx.date]) {
                groupedExpenses[tx.date] = 0;
            }
            groupedExpenses[tx.date] += tx.amount;
        });

        // Sort by date descending
        const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length === 0) {
            container.innerHTML = '<p class="empty-state">Nu există cheltuieli pentru perioada selectată</p>';
            return;
        }

        // Render header
        container.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'daily-summary-row header';
        header.innerHTML = `
            <span>Data</span>
            <span>Total Cheltuieli</span>
        `;
        container.appendChild(header);

        // Render rows
        sortedDates.forEach(date => {
            const row = document.createElement('div');
            row.className = 'daily-summary-row';
            row.innerHTML = `
                <span class="daily-date">${date}</span>
                <span class="daily-expenses">-${UI.formatCurrency(groupedExpenses[date])}</span>
            `;
            container.appendChild(row);
        });
    },

    renderDailyProfitSummary(allTransactions) {
        const container = document.getElementById('dailyProfitSummary');
        if (!container) return;

        // Group by date
        const groupedByDay = {};
        allTransactions.forEach(tx => {
            if (tx.status !== 'confirmed') return;
            if (!groupedByDay[tx.date]) {
                groupedByDay[tx.date] = { income: 0, expenses: 0 };
            }
            if (tx.type === 'income') {
                groupedByDay[tx.date].income += tx.amount;
            } else {
                groupedByDay[tx.date].expenses += tx.amount;
            }
        });

        // Sort by date descending
        const sortedDates = Object.keys(groupedByDay).sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length === 0) {
            container.innerHTML = '<p class="empty-state">Nu există tranzacții pentru perioada selectată</p>';
            return;
        }

        // Render header
        container.innerHTML = '';
        const header = document.createElement('div');
        header.className = 'daily-summary-row header';
        header.innerHTML = `
            <span>Data</span>
            <span>Venituri</span>
            <span>Cheltuieli</span>
            <span>Profit</span>
        `;
        container.appendChild(header);

        // Render rows
        sortedDates.forEach(date => {
            const day = groupedByDay[date];
            const profit = day.income - day.expenses;
            const profitClass = profit >= 0 ? 'daily-profit' : 'daily-profit negative';
            const row = document.createElement('div');
            row.className = 'daily-summary-row';
            row.innerHTML = `
                <span class="daily-date">${date}</span>
                <span class="daily-income">+${UI.formatCurrency(day.income)}</span>
                <span class="daily-expenses">-${UI.formatCurrency(day.expenses)}</span>
                <span class="${profitClass}">${profit >= 0 ? '+' : ''}${UI.formatCurrency(profit)}</span>
            `;
            container.appendChild(row);
        });
    },

    formatPaymentMethod(method) {
        const methods = {
            'cash': 'Numerar',
            'card': 'Card',
            'transfer': 'Transfer'
        };
        return methods[method] || method;
    },

    saveIncome() {
        const date = document.getElementById('incomeDate')?.value;
        const time = document.getElementById('incomeTime')?.value || '12:00';
        const amount = document.getElementById('incomeAmount')?.value;
        const clientId = document.getElementById('incomeClient')?.value;
        const serviceName = document.getElementById('incomeService')?.value;
        const method = document.getElementById('incomeMethod')?.value || 'cash';
        const note = document.getElementById('incomeNote')?.value || '';

        if (!date || !amount || !serviceName) {
            UI.showToast('Completează data, sumă și serviciu', 'warning');
            return;
        }

        const defaultIncomeCategory = Accounting.loadCategories().find(c => c.type === 'income');
        
        const tx = {
            id: 'tx_' + Date.now(),
            type: 'income',
            date: date,
            time: time,
            amount: parseFloat(amount),
            currency: 'RON',
            categoryId: defaultIncomeCategory ? defaultIncomeCategory.id : 'income_default',
            clientId: clientId || null,
            serviceName: serviceName,
            paymentMethod: method,
            note: note,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        Accounting.addTransaction(tx);
        UI.showToast('Venit adăugat', 'success');
        
        // Reset form
        document.getElementById('accIncomeForm').reset();
        this.renderAccounting();
    },

    saveExpenseAccounting() {
        const date = document.getElementById('expenseDate')?.value;
        const time = document.getElementById('expenseTime')?.value || '12:00';
        const amount = document.getElementById('expenseAmount')?.value;
        const categoryId = document.getElementById('expenseCategory')?.value;
        const method = document.getElementById('expenseMethod')?.value || 'cash';
        const note = document.getElementById('expenseNote')?.value || '';

        if (!date || !amount || !categoryId) {
            UI.showToast('Completează data, sumă și categorie', 'warning');
            return;
        }

        const tx = {
            id: 'tx_' + Date.now(),
            type: 'expense',
            date: date,
            time: time,
            amount: parseFloat(amount),
            currency: 'RON',
            categoryId: categoryId,
            paymentMethod: method,
            note: note,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        Accounting.addTransaction(tx);
        UI.showToast('Cheltuiala adăugată', 'success');
        
        // Reset form
        document.getElementById('accExpenseForm').reset();
        this.renderAccounting();
    },

    saveCategory() {
        const type = document.getElementById('newCategoryType')?.value;
        const name = document.getElementById('newCategoryName')?.value;
        const color = document.getElementById('newCategoryColor')?.value;

        if (!name || !type) {
            UI.showToast('Completează tip și nume', 'warning');
            return;
        }

        Accounting.addCategory(name, type, color);
        UI.showToast('Categorie adăugată', 'success');
        document.getElementById('newCategoryName').value = '';
        this.renderAccounting();
    },

    editTransaction(txId) {
        UI.showToast('Edit nu e disponibil încă', 'info');
    },

    deleteTransaction(txId) {
        if (confirm('Ștergi tranzacție?')) {
            Accounting.deleteTransaction(txId);
            UI.showToast('Tranzacție ștearsă', 'success');
            this.renderAccounting();
        }
    },

    saveClient() {
        const name = document.getElementById('clientName').value.trim();
        const phone = document.getElementById('clientPhone').value.trim();
        const email = document.getElementById('clientEmail').value.trim();
        const notes = document.getElementById('clientNotes').value.trim();

        if (!name || !phone) {
            UI.showToast('Completează nume și telefon', 'warning');
            return;
        }

        if (!UI.validatePhone(phone)) {
            UI.showToast('Telefon invalid (10 cifre)', 'error');
            return;
        }

        if (email && !UI.validateEmail(email)) {
            UI.showToast('Email invalid', 'error');
            return;
        }

        let result;
        if (AppState.currentClientId) {
            result = Clients.update(AppState.currentClientId, name, phone, email, notes);
        } else {
            result = Clients.create(name, phone, email, notes);
        }

        if (result.error) {
            UI.showToast(result.error, 'error');
            return;
        }

        UI.closeModal('clientModal');
        UI.showToast('Clientă salvată', 'success');
        this.renderClients();
    },

    saveAppointment() {
        const clientId = document.getElementById('appointmentClient').value;
        const serviceId = document.getElementById('appointmentService').value;
        const date = document.getElementById('appointmentDate').value;
        const time = document.getElementById('appointmentTime').value;
        const duration = document.getElementById('appointmentDuration').value || 60;
        const notes = document.getElementById('appointmentNotes').value.trim();
        const status = document.getElementById('appointmentStatus').value;

        if (!clientId || !serviceId || !date || !time) {
            UI.showToast('Completează câmpurile obligatorii', 'warning');
            return;
        }

        let result;
        const dateISO = new Date(date).toISOString();

        if (AppState.currentAppointmentId) {
            result = Appointments.update(AppState.currentAppointmentId, clientId, serviceId, dateISO, time, duration, notes, status);
        } else {
            result = Appointments.create(clientId, serviceId, dateISO, time, duration, notes, status);
        }

        if (result.error) {
            UI.showToast(result.error, 'error');
            return;
        }

        // If completed, create income transaction automatically
        if (status === 'completed' && AppState.currentAppointmentId) {
            Logger.log('[APP] Appointment marked as completed - running auto-sync');
            Accounting.syncIncomeFromAppointments();
        }

        UI.closeModal('appointmentModal');
        UI.showToast('Programare salvată', 'success');
        this.renderAppointments();
        this.renderDashboard();
        this.renderAccounting();
    },

    saveService() {
        const name = document.getElementById('serviceName').value.trim();
        const category = document.getElementById('serviceCategory').value;
        const price = document.getElementById('servicePrice').value;
        const duration = document.getElementById('serviceDuration').value;

        if (!name || !price) {
            UI.showToast('Completează nume și preț', 'warning');
            return;
        }

        let result;
        if (AppState.currentServiceId) {
            result = Services.update(AppState.currentServiceId, name, category, price, duration);
        } else {
            result = Services.create(name, category, price, duration);
        }

        UI.closeModal('serviceModal');
        UI.showToast('Serviciu salvat', 'success');
        this.renderServices();
    },

    saveExpense() {
        Logger.log('[EXPENSE] [START] saveExpense() called');
        
        try {
            // Get modal element
            const modal = document.getElementById('expenseModal');
            if (!modal) {
                Logger.error('[EXPENSE] [ERROR] Modal expenseModal not found in DOM');
                UI.showToast('Modalul nu a fost gasit', 'error');
                return;
            }

            // Get form elements WITHIN modal using querySelector relative to modal
            const descriptionEl = modal.querySelector('#modal-expenseDescription');
            const amountEl = modal.querySelector('#modal-expenseAmount');
            const categoryEl = modal.querySelector('#modal-expenseCategory');
            const methodEl = modal.querySelector('#modal-expenseMethod');

            Logger.log('[EXPENSE] [DEBUG] Form elements:', {
                descriptionEl: !!descriptionEl,
                amountEl: !!amountEl,
                categoryEl: !!categoryEl,
                methodEl: !!methodEl
            });

            if (!descriptionEl || !amountEl || !categoryEl) {
                Logger.error('[EXPENSE] [ERROR] Form elements not found in expenseModal');
                UI.showToast('Formularul nu este complet', 'error');
                return;
            }

            // Get and validate description
            const description = descriptionEl.value.trim();
            Logger.log('[EXPENSE] [DEBUG] Description:', description);
            
            if (!description) {
                UI.showToast('Completează descriere', 'warning');
                console.log('[EXPENSE] [ERROR] Description validation failed');
                return;
            }

            // Get and normalize amount
            let amountStr = amountEl.value.trim();
            console.log('[EXPENSE] [DEBUG] Amount input:', amountStr);
            
            if (!amountStr) {
                UI.showToast('Completează sumă', 'warning');
                console.log('[EXPENSE] [ERROR] Amount empty');
                return;
            }

            // Normalize: replace comma with dot
            amountStr = amountStr.replace(',', '.');
            const amount = Number(amountStr);

            console.log('[EXPENSE] [DEBUG] Amount normalized:', { input: amountStr, parsed: amount, isFinite: Number.isFinite(amount) });

            // Validate amount
            if (!Number.isFinite(amount) || amount <= 0) {
                UI.showToast('Sumă invalidă. Introdu un număr > 0', 'warning');
                console.log('[EXPENSE] [ERROR] Amount validation failed:', { amountStr, amount, isFinite: Number.isFinite(amount) });
                return;
            }

            // Get category
            const categoryId = categoryEl.value;
            console.log('[EXPENSE] [DEBUG] Category:', categoryId);
            
            if (!categoryId) {
                UI.showToast('Selectează categorie', 'warning');
                console.log('[EXPENSE] [ERROR] Category validation failed');
                return;
            }

            // Get method (default cash)
            const method = methodEl?.value || 'cash';
            console.log('[EXPENSE] [DEBUG] Payment method:', method);

            // Get today's date and current time
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5);

            console.log('[EXPENSE] [DEBUG] DateTime:', { date: today, time: now });
            console.log('[EXPENSE] [DEBUG] Creating transaction:', { description, amount, categoryId, method, date: today, time: now });

            // Create transaction object (compatible with Accounting.addTransaction)
            const txData = {
                type: 'expense',
                date: today,
                time: now,
                amount: amount,
                categoryId: categoryId,
                paymentMethod: method,
                note: description,
                status: 'confirmed'
            };

            console.log('[EXPENSE] [DEBUG] Transaction data:', txData);

            // Call Accounting module to save
            console.log('[EXPENSE] [DEBUG] Checking if Accounting exists:', typeof Accounting);
            if (!Accounting) {
                throw new Error('Accounting module not initialized');
            }

            if (!Accounting.addTransaction || typeof Accounting.addTransaction !== 'function') {
                throw new Error('Accounting.addTransaction is not a function');
            }

            let tx;
            tx = Accounting.addTransaction(txData);
            console.log('[EXPENSE] [SUCCESS] Transaction saved in Accounting:', tx);

            // Clear form elements
            descriptionEl.value = '';
            amountEl.value = '';
            categoryEl.value = '';
            if (methodEl) methodEl.value = 'cash';

            console.log('[EXPENSE] [INFO] Form cleared');

            // Close modal
            UI.closeModal('expenseModal');
            console.log('[EXPENSE] [INFO] Modal closed');

            // Show success message
            UI.showToast(`Cheltuiala "${description}" salvată: ${amount.toFixed(2)} RON`, 'success');
            console.log('[EXPENSE] [SUCCESS] Toast shown');

            // === FULL SYNC AND REFRESH ALL VIEWS ===
            console.log('[EXPENSE] [INFO] Starting full accounting sync...');
            
            // Run full sync
            if (Accounting && Accounting.fullSync && typeof Accounting.fullSync === 'function') {
                Accounting.fullSync();
                console.log('[EXPENSE] [SUCCESS] Full accounting sync completed');
            } else {
                console.warn('[EXPENSE] [WARNING] Accounting.fullSync not available');
            }

            // Refresh ALL views
            const viewsToRefresh = [
                { name: 'renderDashboard', method: () => this.renderDashboard?.() },
                { name: 'renderAccounting', method: () => this.renderAccounting?.() },
                { name: 'renderTransactions', method: () => this.renderTransactions?.() },
                { name: 'renderHistory', method: () => this.renderHistory?.() },
            ];

            viewsToRefresh.forEach(view => {
                if (this[view.name] && typeof this[view.name] === 'function') {
                    try {
                        this[view.name]();
                        console.log(`[EXPENSE] [SUCCESS] ${view.name}() refreshed`);
                    } catch (error) {
                        console.warn(`[EXPENSE] [WARNING] ${view.name}() failed:`, error.message);
                    }
                }
            });

            console.log('[EXPENSE] [COMPLETE] saveExpense() finished successfully');
        } catch (error) {
            console.error('[EXPENSE] [ERROR] Exception in saveExpense():', error);
            console.error('[EXPENSE] [ERROR] Stack:', error.stack);
            UI.showToast('Eroare: ' + error.message, 'error');
        }
    },

    /**
     * Render recurring expenses modal content
     */
    renderRecurringExpensesModal() {
        const recurringExpenses = Accounting.getRecurringExpenses();
        const listDiv = document.getElementById('recurringExpensesList');

        if (recurringExpenses.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">Nu sunt cheltuieli recurente setate</p>';
        } else {
            let html = '<div class="recurring-items">';
            recurringExpenses.forEach(rec => {
                html += `
                    <div class="recurring-item">
                        <div class="recurring-info">
                            <h4>${rec.name}</h4>
                            <p>${rec.amount.toFixed(2)} RON - ${rec.category} - Ziua ${rec.dayOfMonth}</p>
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="App.deleteRecurringExpense('${rec.id}')">Ștergere</button>
                    </div>
                `;
            });
            html += '</div>';
            listDiv.innerHTML = html;
        }

        // Populate category select
        const categorySelect = document.getElementById('recExpenseCategory');
        if (categorySelect) {
            const categories = Accounting.categories.filter(c => c.type === 'expense');
            categorySelect.innerHTML = '<option value="">-- Selectează --</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        }
    },

    /**
     * Save recurring expense
     */
    saveRecurringExpense() {
        console.log('[START] saveRecurringExpense() called');
        
        try {
            const nameEl = document.getElementById('recExpenseName');
            const amountEl = document.getElementById('recExpenseAmount');
            const categoryEl = document.getElementById('recExpenseCategory');
            const methodEl = document.getElementById('recExpenseMethod');
            const dayEl = document.getElementById('recExpenseDay');

            console.log('[DEBUG] Form elements found:', {
                name: !!nameEl,
                amount: !!amountEl,
                category: !!categoryEl,
                method: !!methodEl,
                day: !!dayEl
            });

            if (!nameEl || !amountEl || !categoryEl || !dayEl) {
                UI.showToast('Formular incomplet - contactează suportul', 'error');
                console.error('[ERROR] Missing form elements');
                return;
            }

            const name = nameEl.value.trim();
            const amount = amountEl.value.trim();
            const category = categoryEl.value.trim();
            const method = methodEl?.value || 'cash';
            const dayOfMonth = dayEl.value.trim();

            console.log('[DEBUG] Form values:', { name, amount, category, method, dayOfMonth });

            // Validate name
            if (!name) {
                UI.showToast('Introdu numele cheltuielii', 'warning');
                console.log('[ERROR] Name validation failed');
                return;
            }

            // Validate amount
            if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
                UI.showToast('Introdu suma valida (număr > 0)', 'warning');
                console.log('[ERROR] Amount validation failed:', { amount, isNaN: isNaN(amount) });
                return;
            }

            // Validate category
            if (!category) {
                UI.showToast('Selectează categoria', 'warning');
                console.log('[ERROR] Category validation failed');
                return;
            }

            // Validate day
            const dayNum = parseInt(dayOfMonth);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                UI.showToast('Ziua trebuie să fie între 1 și 31', 'warning');
                console.log('[ERROR] Day validation failed:', dayOfMonth);
                return;
            }

            console.log('[DEBUG] All validations passed');

            // Save recurring expense
            const recurring = Accounting.addRecurringExpense(name, amount, category, method, dayOfMonth);
            console.log('[SUCCESS] Recurring expense created:', recurring);
            
            UI.showToast(`Cheltuiala lunară "${name}" adăugată (${amount} RON)`, 'success');

            // Reset form
            document.getElementById('recurringExpenseForm').reset();
            console.log('[INFO] Form reset');

            // Refresh the list in modal
            this.renderRecurringExpensesModal();
            console.log('[INFO] Modal list refreshed');

            // Run auto-sync to generate current month's expense if needed
            Accounting.syncRecurringExpensesForCurrentMonth();
            
            // Refresh accounting view
            this.renderAccounting();
            console.log('[SUCCESS] Accounting view refreshed');
            
            console.log('[COMPLETE] saveRecurringExpense() finished successfully');
        } catch (error) {
            console.error('[ERROR] saveRecurringExpense() failed:', error);
            UI.showToast('Eroare la salvare: ' + error.message, 'error');
        }
    },

    /**
     * Delete recurring expense
     */
    deleteRecurringExpense(recurringId) {
        if (!confirm('Ștergere cheltuiala lunară?')) return;

        const recurringExpenses = Accounting.getRecurringExpenses();
        const filtered = recurringExpenses.filter(r => r.id !== recurringId);
        Accounting.saveRecurringExpenses(filtered);

        UI.showToast('Cheltuiala lunară ștearsă', 'success');
        this.renderRecurringExpensesModal();
    },

    /**
     * Initial render
     */
    render() {
        this.renderDashboard();
    },

    /**
     * Update sync status display on dashboard
     */
    updateSyncStatus() {
        const status = Storage.verifyData();
        const syncStatus = document.getElementById('syncStatus');
        const syncTransactions = document.getElementById('syncTransactions');
        const syncClients = document.getElementById('syncClients');
        const syncTime = document.getElementById('syncTime');

        if (syncStatus) syncStatus.textContent = '✓ Activ';
        if (syncTransactions) syncTransactions.textContent = status.transactions;
        if (syncClients) syncClients.textContent = status.clients;
        
        // Format last sync time
        if (syncTime) {
            if (status.lastSync === 'never') {
                syncTime.textContent = 'Niciodată';
            } else {
                const lastSyncTime = new Date(status.lastSync);
                const now = new Date();
                const diffMs = now - lastSyncTime;
                const diffSec = Math.floor(diffMs / 1000);
                const diffMin = Math.floor(diffSec / 60);
                
                if (diffSec < 60) {
                    syncTime.textContent = 'Acum';
                } else if (diffMin < 60) {
                    syncTime.textContent = `Acum ${diffMin} min`;
                } else {
                    syncTime.textContent = lastSyncTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
                }
            }
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    
    // Setup sync status update button
    const btnSyncCheck = document.getElementById('btnSyncCheck');
    if (btnSyncCheck) {
        btnSyncCheck.addEventListener('click', () => {
            App.updateSyncStatus();
            UI.showToast('Sincronizare verificată', 'success');
        });
    }

    // Update sync status display every 30 seconds
    setInterval(() => {
        if (AppState.currentTab === 'dashboard') {
            App.updateSyncStatus();
        }
    }, 30000);
});

