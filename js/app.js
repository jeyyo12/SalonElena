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
    transactionDateFilter: null,  // Will be set in init()
    historyPeriod: 'day',
    historyDate: null,  // Will be set in init()
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
        // GitHub Pages Detection & Routing
        this.setupGitHubPagesCompat();
        
        // CRITICAL FIX: Ensure overlay is properly hidden on startup
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            Logger.log('[INIT] Overlay reset to inactive state');
        }
        document.body.classList.remove('modal-open');
        
        // Set date values after UI is ready
        AppState.transactionDateFilter = UI.getTodayInputValue?.() || new Date().toISOString().split('T')[0];
        AppState.historyDate = UI.getTodayInputValue?.() || new Date().toISOString().split('T')[0];
        
        // Initialize auto-sync storage first
        Storage.init();
        
        this.loadData();
        this.setupEventListeners();
        
        // EVENT BUS: Listen for global data changes
        window.addEventListener('data:changed', (event) => {
            const reason = event.detail?.reason || 'unknown';
            console.log('[EVENT BUS] data:changed triggered by:', reason);
            this.recalcAndRenderAll();
        });
        
        // Render initial content (or use hash-based routing)
        const initialHash = window.location.hash?.substring(1);
        if (initialHash && ['dashboard', 'clients', 'appointments', 'transactions', 'accounting', 'history', 'services'].includes(initialHash)) {
            // Hash routing will handle this via setupHashRouting()
            console.log('[INIT] Initial hash detected, will be handled by hash routing:', initialHash);
        } else {
            // No hash, render default dashboard
            this.renderDashboard();
        }
        
        this.updateDateTime();
        
        // Update date/time every minute
        setInterval(() => this.updateDateTime(), 60000);

        // Late appointment detection every 60 seconds
        // Check if scheduled appointments have passed grace period (10 min)
        setInterval(() => {
            Appointments.autoDetectLateAppointments();
        }, 60000);
    },

    /**
     * GitHub Pages Compatibility:
     * Ensures proper routing and path resolution for GitHub Pages hosted at /SalonElena/
     */
    setupGitHubPagesCompat() {
        const pathname = window.location.pathname;
        const basePath = window.APP_BASE_PATH || './';
        
        console.log('[GITHUB PAGES COMPAT] Setup:');
        console.log('  - Current pathname:', pathname);
        console.log('  - Detected basePath:', basePath);
        console.log('  - Is GitHub Pages:', pathname.includes('/SalonElena/'));
        
        // If user tries to refresh on any tab, ensure we route to that tab
        // This is important because GitHub Pages routes all requests to index.html
        const searchParams = new URLSearchParams(window.location.search);
        const hashTab = window.location.hash?.substring(1); // Remove # prefix
        
        if (hashTab && ['dashboard', 'clients', 'appointments', 'transactions', 'accounting', 'history', 'services'].includes(hashTab)) {
            console.log('[GITHUB PAGES COMPAT] Routing to tab from hash:', hashTab);
            // Will be applied after DOM is ready - use silent switch to avoid hash update loop
            setTimeout(() => {
                this.switchTabSilent(hashTab);
            }, 100);
        }
    },

    /**
     * Load all data from storage
     */
    loadData() {
        Services.init();
        
        // CLEANUP: Remove "dfdfd" service if it exists
        Services.deleteByName('dfdfd');
        
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
        this.setupHashRouting();
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

    /**
     * Hash Routing for GitHub Pages
     * Allows navigation via URL hash (#tab-name)
     */
    setupHashRouting() {
        // Listen for hash changes (browser back/forward, manual URL changes)
        window.addEventListener('hashchange', () => {
            const hashTab = window.location.hash?.substring(1); // Remove # prefix
            const validTabs = ['dashboard', 'clients', 'appointments', 'transactions', 'accounting', 'history', 'services'];
            
            if (hashTab && validTabs.includes(hashTab)) {
                console.log('[HASH ROUTING] Detected hash change:', hashTab);
                // Route without updating hash again (prevent loop)
                this.switchTabSilent(hashTab);
            }
        });
        
        // Check initial hash on load
        const initialHash = window.location.hash?.substring(1);
        if (initialHash && ['dashboard', 'clients', 'appointments', 'transactions', 'accounting', 'history', 'services'].includes(initialHash)) {
            console.log('[HASH ROUTING] Initial hash:', initialHash);
            setTimeout(() => this.switchTabSilent(initialHash), 100);
        }
    },

    switchTab(tabName) {
        // Update URL hash for GitHub Pages compatibility (allows refresh/bookmarking)
        window.location.hash = `#${tabName}`;
        console.log('[APP] Switched to tab:', tabName, '| Hash:', window.location.hash);
        
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
                Logger.log('[APP] Switched to accounting tab');
                this.renderAccounting();
                break;
            case 'services':
                this.renderServices();
                break;
        }
    },

    /**
     * Switch tab silently (without updating hash to prevent loops)
     */
    switchTabSilent(tabName) {
        console.log('[APP] Silent tab switch:', tabName, '(no hash update)');
        
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
                Logger.log('[APP] Switched to accounting tab');
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

        // Auto-detect late appointments before rendering
        Appointments.autoDetectLateAppointments();

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
            const isLate = appt.status === 'late';
            const isCompleted = appt.status === 'completed';
            const isCancelled = appt.status === 'cancelled';

            // Status badge with styling
            let statusBadge = `<span class="appointment-status status-${appt.status}">${this.getStatusLabel(appt.status)}</span>`;
            if (isLate) {
                statusBadge = `<span class="appointment-status status-late status-late-glow">${this.getStatusLabel(appt.status)}</span>`;
            }

            // Action buttons for late
            let lateActions = '';
            if (isLate) {
                lateActions = `
                    <div class="late-actions">
                        <button class="btn btn-sm btn-success btn-late-action" data-appt-id="${appt.id}" data-action="checkin-appt">A venit</button>
                        <button class="btn btn-sm btn-warning btn-late-action" data-appt-id="${appt.id}" data-action="more-time-appt">+10 min</button>
                        <button class="btn btn-sm btn-danger btn-late-action" data-appt-id="${appt.id}" data-action="noshow-appt">Nu a venit</button>
                    </div>
                `;
            }

            return `
                <div class="appointment-card ${isLate ? 'card-late' : ''}">
                    <div class="appointment-time">${appt.time}</div>
                    <div class="appointment-info">
                        <div class="appointment-client">${client?.name || '-'}</div>
                        <div class="appointment-service">${service?.name || '-'} (${appt.duration} min)</div>
                    </div>
                    ${statusBadge}
                    <div class="appointment-actions">
                        ${lateActions}
                        <button class="btn btn-secondary btn-sm btn-edit" data-appt-id="${appt.id}">Edit</button>
                        <button class="btn btn-danger btn-sm btn-delete" data-appt-id="${appt.id}">Șterge</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add listeners for late actions
        list.querySelectorAll('.btn-late-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const apptId = e.target.dataset.apptId;
                const action = e.target.dataset.action;
                const appt = Appointments.getById(apptId);

                if (action === 'checkin-appt') {
                    Appointments.markForgottenCheckIn(apptId);
                    UI.showToast('Marcat: A venit (am uitat)', 'info');
                    window.dispatchEvent(new CustomEvent('data:changed', {
                        detail: { reason: 'appointment:checkin', appointmentId: apptId }
                    }));
                } else if (action === 'more-time-appt') {
                    Appointments.updateLateNotes(apptId, 10);
                    UI.showToast('Notă adăugată: +10 min întârziere', 'info');
                    window.dispatchEvent(new CustomEvent('data:changed', {
                        detail: { reason: 'appointment:moreTime', appointmentId: apptId }
                    }));
                } else if (action === 'noshow-appt') {
                    if (confirm('Marchez clienta ca nu a venit?')) {
                        Appointments.markNoShow(apptId);
                        UI.showToast('Marcat: Nu a venit', 'danger');
                        window.dispatchEvent(new CustomEvent('data:changed', {
                            detail: { reason: 'appointment:noshow', appointmentId: apptId }
                        }));
                    }
                }
            });
        });

        // Add listeners for edit/delete
        list.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openAppointmentModal(btn.dataset.apptId);
            });
        });

        list.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Ștergi programare?')) {
                    const apptId = btn.dataset.apptId;
                    Appointments.delete(apptId);
                    UI.showToast('Programare ștearsă', 'success');
                    window.dispatchEvent(new CustomEvent('data:changed', {
                        detail: { reason: 'appointment:deleted', appointmentId: apptId }
                    }));
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
                    const txId = btn.dataset.txId;
                    Transactions.delete(txId);
                    UI.showToast('Tranzacție ștearsă', 'success');
                    
                    // Emit event for global recalc
                    window.dispatchEvent(new CustomEvent('data:changed', {
                        detail: { reason: 'transaction:deleted', transactionId: txId }
                    }));
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

        // Auto-detect late appointments before rendering
        Appointments.autoDetectLateAppointments();

        const today = new Date();
        const summary = Transactions.getDailySummary(UI.getTodayInputValue());

        // Update KPI cards
        document.getElementById('kpiIncome').textContent = UI.formatCurrency(summary.income);
        document.getElementById('kpiExpenses').textContent = UI.formatCurrency(summary.expenses);
        document.getElementById('kpiProfit').textContent = UI.formatCurrency(summary.profit);
        document.getElementById('kpiClients').textContent = summary.clientsServed;

        // Render today's appointments (sorted with late first)
        let appointments = Appointments.getToday();
        appointments = Appointments.sortByTime(appointments);
        const apptContainer = document.getElementById('dashboardAppointments');
        
        if (appointments.length === 0) {
            apptContainer.innerHTML = '<p class="empty-state">Nu sunt programări astazi</p>';
        } else {
            apptContainer.innerHTML = appointments.map(appt => {
                const client = Clients.getById(appt.clientId);
                const service = Services.getById(appt.serviceId);
                const isCompleted = appt.status === 'completed';
                const isCancelled = appt.status === 'cancelled';
                const isLate = appt.status === 'late';
                const isForgottenCheckIn = appt.status === 'forgotten_checkin';
                const isNoShow = appt.status === 'no_show';

                let buttons = '';
                
                // LATE STATUS: Show action buttons for late appointments
                if (isLate) {
                    buttons += `
                        <div class="late-actions">
                            <button class="btn btn-sm btn-success" data-appt-id="${appt.id}" data-action="checkin-appt" title="A venit (am uitat să notez)">A venit</button>
                            <button class="btn btn-sm btn-warning" data-appt-id="${appt.id}" data-action="more-time-appt" title="Oferă mai mult timp">+10 min</button>
                            <button class="btn btn-sm btn-danger" data-appt-id="${appt.id}" data-action="noshow-appt" title="Nu a venit">Nu a venit</button>
                        </div>
                    `;
                }
                // Finalizează button (only if scheduled)
                else if (!isCompleted && !isCancelled) {
                    buttons += `<button class="btn btn-sm btn-primary" data-appt-id="${appt.id}" data-action="complete-appt" title="Finalizează programare">✓ Finalizează</button>`;
                }
                
                // Cancel button (for scheduled and forgotten check-in)
                if (!isCompleted && !isCancelled && (appt.status === 'scheduled' || isForgottenCheckIn)) {
                    buttons += `<button class="btn btn-sm btn-danger" data-appt-id="${appt.id}" data-action="cancel-appt" title="Anulează programare">✕ Anulează</button>`;
                }
                
                // View button (always)
                buttons += `<button class="btn btn-sm btn-secondary" data-appt-id="${appt.id}" data-action="view-appt" title="Vezi detalii">👁 Vezi</button>`;

                // Status badge with styling
                let statusBadge = `<span class="appointment-status status-${appt.status}">${this.getStatusLabel(appt.status)}</span>`;
                if (isLate) {
                    statusBadge = `<span class="appointment-status status-late status-late-glow">${this.getStatusLabel(appt.status)}</span>`;
                }

                return `
                    <div class="appointment-card ${isLate ? 'card-late' : ''}">
                        <div class="appointment-time">${appt.time}</div>
                        <div class="appointment-info">
                            <div class="appointment-client">${client?.name || '-'}</div>
                            <div class="appointment-service">${service?.name || '-'}</div>
                        </div>
                        <div class="appointment-actions">
                            ${statusBadge}
                            ${buttons}
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners for dashboard appointment buttons
            apptContainer.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const apptId = e.target.dataset.apptId;
                    const action = e.target.dataset.action;
                    const appt = Appointments.getById(apptId);
                    
                    if (action === 'complete-appt') {
                        this.openCompleteAppointmentModal(apptId);
                    } else if (action === 'cancel-appt') {
                        if (confirm('Sigur anulezi aceasta programare?')) {
                            Appointments.update(apptId, appt.clientId, appt.serviceId, 
                                appt.date, appt.time, appt.duration,
                                appt.notes, 'cancelled');
                            UI.showToast('Programare anulată', 'warning');
                            
                            window.dispatchEvent(new CustomEvent('data:changed', {
                                detail: { reason: 'appointment:cancelled', appointmentId: apptId }
                            }));
                        }
                    } else if (action === 'view-appt') {
                        this.openAppointmentFromDashboard(apptId);
                    } else if (action === 'checkin-appt') {
                        // Mark as forgotten check-in
                        Appointments.markForgottenCheckIn(apptId);
                        UI.showToast('Marcat: A venit (am uitat)', 'info');
                        
                        window.dispatchEvent(new CustomEvent('data:changed', {
                            detail: { reason: 'appointment:checkin', appointmentId: apptId }
                        }));
                    } else if (action === 'more-time-appt') {
                        // Update notes with +10 min
                        Appointments.updateLateNotes(apptId, 10);
                        UI.showToast('Notă adăugată: +10 min întârziere', 'info');
                        
                        window.dispatchEvent(new CustomEvent('data:changed', {
                            detail: { reason: 'appointment:moreTime', appointmentId: apptId }
                        }));
                    } else if (action === 'noshow-appt') {
                        if (confirm('Marchez clienta ca nu a venit?')) {
                            Appointments.markNoShow(apptId);
                            UI.showToast('Marcat: Nu a venit', 'danger');
                            
                            window.dispatchEvent(new CustomEvent('data:changed', {
                                detail: { reason: 'appointment:noshow', appointmentId: apptId }
                            }));
                        }
                    }
                });
            });
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
     * Get human-readable status label
     */
    getStatusLabel(status) {
        const labels = {
            scheduled: 'Programat',
            late: '⏰ Întârzie',
            forgotten_checkin: 'A venit (uitat)',
            no_show: 'Nu a venit',
            completed: 'Finalizat',
            cancelled: 'Anulat'
        };
        return labels[status] || status;
    },

    /**
     * Open complete appointment modal with payment details
     */
    openCompleteAppointmentModal(apptId) {
        const appointment = Appointments.getById(apptId);
        if (!appointment) return;

        const client = Clients.getById(appointment.clientId);
        const service = Services.getById(appointment.serviceId);

        // Store appointment ID for later use
        AppState.currentAppointmentId = apptId;

        // Populate summary
        document.getElementById('summaryClient').textContent = `👤 ${client?.name || '-'}`;
        document.getElementById('summaryService').textContent = `💇 ${service?.name || '-'}`;
        document.getElementById('summaryTime').textContent = `🕐 ${appointment.time}`;

        // Set default amount (service price)
        const defaultAmount = service?.price || 0;
        document.getElementById('completeAmount').value = defaultAmount;

        // Reset form
        document.getElementById('completeAppointmentForm').reset();
        document.getElementById('completePaymentMethod').value = '';

        UI.openModal('completeAppointmentModal');
    },

    /**
     * Complete appointment with payment
     */
    completeAppointmentWithPayment(apptId, amount, paymentMethod) {
        const appointment = Appointments.getById(apptId);
        if (!appointment) {
            UI.showToast('Programare nu găsită', 'error');
            return false;
        }

        // Don't complete if already completed or cancelled
        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
            UI.showToast('Programare deja finalizată sau anulată', 'warning');
            return false;
        }

        const client = Clients.getById(appointment.clientId);
        const service = Services.getById(appointment.serviceId);

        if (!client || !service) {
            UI.showToast('Date lipsă: client sau serviciu', 'error');
            return false;
        }

        const now = new Date().toISOString();
        amount = parseFloat(amount);

        // 1. MARK APPOINTMENT AS COMPLETED
        Appointments.update(
            apptId,
            appointment.clientId,
            appointment.serviceId,
            appointment.date,
            appointment.time,
            appointment.duration,
            appointment.notes,
            'completed'
        );

        // 2. CREATE OR UPDATE TRANSACTION
        const transaction = Transactions.createOrUpdateIncome(
            appointment.clientId,
            apptId,
            appointment.serviceId,
            amount,
            paymentMethod,
            service.name
        );

        // 3. UPDATE CLIENT STATS (Single source of truth: recalc from transactions)
        const allTransactions = Transactions.getAll();
        const clientIncomes = allTransactions.filter(t => 
            t.type === 'income' && 
            t.status === 'confirmed' &&
            t.clientId === client.id
        );

        const completedAppointments = Appointments.getByClient(client.id).filter(a => 
            a.status === 'completed'
        );

        // Recalculate client stats from source data
        client.visits = completedAppointments.length;
        client.totalSpent = clientIncomes.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        client.lastVisitAt = now;
        client.tag = Clients.calculateTag(client.visits, client.totalSpent);
        Clients.save();

        // 4. DEBUG LOG
        const todayStr = UI.getTodayInputValue();
        const todayTransactions = Transactions.getByDate(todayStr);
        const incomeToday = todayTransactions
            .filter(t => t.type === 'income' && t.status === 'confirmed')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const expenseToday = todayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const profitToday = incomeToday - expenseToday;

        console.log('[COMPLETE APPOINTMENT]', {
            appointmentId: apptId,
            amount: amount,
            paymentMethod: paymentMethod,
            clientId: appointment.clientId,
            serviceName: service.name,
            transactionId: transaction.id
        });

        console.log('[DAILY TOTALS]', {
            incomeToday: UI.formatCurrency(incomeToday),
            expenseToday: UI.formatCurrency(expenseToday),
            profitToday: UI.formatCurrency(profitToday),
            clientStats: {
                clientName: client.name,
                totalVisits: client.visits,
                totalSpent: UI.formatCurrency(client.totalSpent),
                clientTag: client.tag
            }
        });

        UI.showToast(`Programare finalizată - ${UI.formatCurrency(amount)} încasat`, 'success');

        // 5. EMIT EVENT BUS - triggers recalcAndRenderAll()
        window.dispatchEvent(new CustomEvent('data:changed', {
            detail: {
                reason: 'appointment:completed',
                appointmentId: apptId,
                transactionId: transaction.id
            }
        }));

        return true;
    },

    /**
     * Open appointment for viewing/editing
     */
    openAppointmentFromDashboard(apptId) {
        const appointment = Appointments.getById(apptId);
        if (!appointment) return;
        
        AppState.currentAppointmentId = apptId;
        this.openAppointmentModal(apptId, null);
    },

    /**
     * ==================== MODALS ====================
     */
    setupModals() {
        Logger.log('[INIT] Setting up modal handlers');
        
        // CRITICAL FIX: Ensure all modals are hidden on startup
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            Logger.log('[INIT] Modal reset:', modal.id);
        });
        
        UI.setupModalClose('clientModal');
        UI.setupModalTabs('clientModal');
        UI.setupModalClose('appointmentModal');
        UI.setupModalClose('serviceModal');
        UI.setupModalClose('expenseModal');
        UI.setupModalClose('recurringExpensesModal');
        UI.setupModalClose('completeAppointmentModal');
        
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

        // Complete Appointment Modal handlers
        const btnCompleteConfirm = document.getElementById('btnCompleteConfirm');
        if (btnCompleteConfirm) {
            btnCompleteConfirm.addEventListener('click', () => {
                const apptId = AppState.currentAppointmentId;
                const paymentMethod = document.getElementById('completePaymentMethod').value;
                const amount = document.getElementById('completeAmount').value;

                if (!paymentMethod) {
                    UI.showToast('Selectează metoda plață', 'warning');
                    return;
                }

                if (!amount || parseFloat(amount) <= 0) {
                    UI.showToast('Suma trebuie să fie mai mare decât 0', 'warning');
                    return;
                }

                if (this.completeAppointmentWithPayment(apptId, amount, paymentMethod)) {
                    UI.closeModal('completeAppointmentModal');
                }
            });
        }

        const btnCompleteCancel = document.getElementById('btnCompleteCancel');
        if (btnCompleteCancel) {
            btnCompleteCancel.addEventListener('click', () => {
                UI.closeModal('completeAppointmentModal');
            });
        }

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
        Logger.log('[ACCOUNTING] Setting up accounting tab');

        // Date filters - auto-update
        const dateStartInput = document.getElementById('accDateStart');
        const dateEndInput = document.getElementById('accDateEnd');
        
        // Set default date range (last 30 days)
        if (dateStartInput && !dateStartInput.value) {
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - 30);
            dateStartInput.value = start.toISOString().split('T')[0];
            dateEndInput.value = end.toISOString().split('T')[0];
        }
        
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
                    status: 'confirmed',
                    search: ''
                };
                // Reset UI
                if (dateStartInput) dateStartInput.value = '';
                if (dateEndInput) dateEndInput.value = '';
                if (typeSelect) typeSelect.value = 'all';
                if (statusSelect) statusSelect.value = 'confirmed';
                document.querySelectorAll('#accounting .checkbox-group-modern input[type="checkbox"].acc-payment-method').forEach(cb => cb.checked = false);
                if (categorySelect) categorySelect.selectedIndex = 0;
                if (searchInput) searchInput.value = '';
                this.renderAccounting();
            });
        }

        // CSV export
        const exportBtn = document.getElementById('btnExportAccounting');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const startDate = document.getElementById('accDateStart')?.value || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
                const endDate = document.getElementById('accDateEnd')?.value || new Date().toISOString().split('T')[0];
                const filters = AppState.accountingFilters;
                
                const txs = Accounting.getFiltered(startDate, endDate, {
                    type: filters.type,
                    status: filters.status,
                    paymentMethods: filters.paymentMethods,
                    categories: filters.categories,
                    search: filters.search
                });
                
                const filename = `Contabilitate_${startDate}_to_${endDate}.csv`;
                Accounting.exportToCSV(txs, filename);
            });
        }
    },

    renderAccounting() {
        if (AppState.currentTab !== 'accounting') return;

        Logger.log('[ACCOUNTING] Rendering accounting page');

        // Get date range
        const dateStartInput = document.getElementById('accDateStart');
        const dateEndInput = document.getElementById('accDateEnd');
        
        const startDate = dateStartInput?.value || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
        const endDate = dateEndInput?.value || new Date().toISOString().split('T')[0];

        // Build filters object
        const filters = {
            type: document.getElementById('accType')?.value || 'all',
            status: document.getElementById('accStatus')?.value || 'confirmed',
            paymentMethods: Array.from(document.querySelectorAll('#accounting .checkbox-group-modern input[type="checkbox"].acc-payment-method:checked')).map(cb => cb.value),
            categories: Array.from(document.querySelectorAll('#accounting select#accCategories option:checked')).map(opt => opt.value).filter(v => v),
            search: document.getElementById('accSearch')?.value || ''
        };

        // Get transactions
        const txs = Accounting.getFiltered(startDate, endDate, filters);
        const summary = Accounting.getSummaryForRange(startDate, endDate);

        // Populate category select with all available categories
        this.populateCategories();

        // Update KPI cards
        const incomeCard = document.getElementById('accIncomeTotal');
        if (incomeCard) incomeCard.textContent = UI.formatCurrency(summary.totalIncome);

        const expenseCard = document.getElementById('accExpenseTotal');
        if (expenseCard) expenseCard.textContent = UI.formatCurrency(summary.totalExpense);

        const profitCard = document.getElementById('accProfitTotal');
        if (profitCard) {
            profitCard.textContent = UI.formatCurrency(summary.profitNet);
            profitCard.classList.toggle('danger', summary.profitNet < 0);
        }

        const cashCard = document.getElementById('accCashTotal');
        if (cashCard) cashCard.textContent = UI.formatCurrency(summary.paymentMethods.cash);

        const cardCard = document.getElementById('accCardTotal');
        if (cardCard) cardCard.textContent = UI.formatCurrency(summary.paymentMethods.card);

        const transferCard = document.getElementById('accTransferTotal');
        if (transferCard) transferCard.textContent = UI.formatCurrency(summary.paymentMethods.transfer);

        // Render transaction list
        this.renderAccountingTransactionList(txs);

        // Render reports
        this.renderAccountingReports(startDate, endDate, summary);

        // Render tax estimator section
        this.setupTaxEstimator();
    },

    /**
     * Setup and render tax estimator section
     */
    setupTaxEstimator() {
        // Load config into UI
        const taxRegimeSelect = document.getElementById('taxRegime');
        const taxFiscalYearInput = document.getElementById('taxFiscalYear');

        if (taxRegimeSelect) taxRegimeSelect.value = TaxEstimator.config.regime;
        if (taxFiscalYearInput) taxFiscalYearInput.value = TaxEstimator.config.fiscalYear;

        // Load rate inputs
        document.getElementById('taxMicroRate').value = (TaxEstimator.config.micro_tax_rate * 100).toFixed(1);
        document.getElementById('taxProfitRate').value = (TaxEstimator.config.profit_tax_rate * 100).toFixed(1);
        document.getElementById('taxPfaIncomeRate').value = (TaxEstimator.config.pfa_income_tax_rate * 100).toFixed(1);
        document.getElementById('taxPfaCas').value = TaxEstimator.config.pfa_cas_monthly;
        document.getElementById('taxPfaCass').value = TaxEstimator.config.pfa_cass_monthly;

        // Load other configs
        document.getElementById('taxIsVATPayer').checked = TaxEstimator.config.isVATpayer;
        document.getElementById('taxEmployeeCount').value = TaxEstimator.config.employeeCount;
        document.getElementById('taxSalaryCost').value = TaxEstimator.config.estimatedSalaryCost;

        // Show/hide regime-specific configs
        this.updateTaxRegimeConfig();

        // Event listeners
        taxRegimeSelect?.addEventListener('change', () => {
            TaxEstimator.config.regime = taxRegimeSelect.value;
            this.updateTaxRegimeConfig();
        });

        document.getElementById('btnCalculateTaxes')?.addEventListener('click', () => {
            this.calculateAndRenderTaxes();
        });

        document.getElementById('btnExportTaxCSV')?.addEventListener('click', () => {
            const year = parseInt(document.getElementById('taxFiscalYear').value);
            TaxEstimator.downloadCSV(year);
            UI.showToast('Raport taxe exportat', 'success');
        });

        // Save config when inputs change
        const configInputs = document.querySelectorAll(
            '#taxMicroRate, #taxProfitRate, #taxPfaIncomeRate, #taxPfaCas, #taxPfaCass, #taxFiscalYear, #taxIsVATPayer, #taxEmployeeCount, #taxSalaryCost'
        );
        configInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveTaxConfig();
            });
        });
    },

    /**
     * Update visible config based on selected regime
     */
    updateTaxRegimeConfig() {
        const regime = document.getElementById('taxRegime').value;
        
        document.getElementById('taxConfigSrlMicro').classList.toggle('active', regime === 'srl_micro');
        document.getElementById('taxConfigSrlProfit').classList.toggle('active', regime === 'srl_profit');
        document.getElementById('taxConfigPFA').classList.toggle('active', regime === 'pfa');
    },

    /**
     * Save tax estimator config to TaxEstimator
     */
    saveTaxConfig() {
        TaxEstimator.config.regime = document.getElementById('taxRegime').value;
        TaxEstimator.config.fiscalYear = parseInt(document.getElementById('taxFiscalYear').value);
        TaxEstimator.config.micro_tax_rate = parseFloat(document.getElementById('taxMicroRate').value) / 100;
        TaxEstimator.config.profit_tax_rate = parseFloat(document.getElementById('taxProfitRate').value) / 100;
        TaxEstimator.config.pfa_income_tax_rate = parseFloat(document.getElementById('taxPfaIncomeRate').value) / 100;
        TaxEstimator.config.pfa_cas_monthly = parseFloat(document.getElementById('taxPfaCas').value);
        TaxEstimator.config.pfa_cass_monthly = parseFloat(document.getElementById('taxPfaCass').value);
        TaxEstimator.config.isVATpayer = document.getElementById('taxIsVATPayer').checked;
        TaxEstimator.config.employeeCount = parseInt(document.getElementById('taxEmployeeCount').value);
        TaxEstimator.config.estimatedSalaryCost = parseFloat(document.getElementById('taxSalaryCost').value);

        TaxEstimator.saveConfig();
    },

    /**
     * Calculate and render tax estimator results
     */
    calculateAndRenderTaxes() {
        // Save config first
        this.saveTaxConfig();

        // Get year from input
        const year = parseInt(document.getElementById('taxFiscalYear').value);

        // Calculate
        const summary = TaxEstimator.getSummary(year);

        // Show results
        const resultsContainer = document.getElementById('taxResultsContainer');
        resultsContainer.classList.add('active');
        resultsContainer.style.display = 'block';

        // Update summary cards
        document.getElementById('taxSummaryIncome').textContent = UI.formatCurrency(summary.income) + ' RON';
        document.getElementById('taxSummaryExpense').textContent = UI.formatCurrency(summary.expenses) + ' RON';
        document.getElementById('taxSummaryProfit').textContent = UI.formatCurrency(summary.profit) + ' RON';
        document.getElementById('taxSummaryTotal').textContent = UI.formatCurrency(summary.totalTax) + ' RON';

        // Update data quality
        document.getElementById('taxDataIncomeCount').textContent = summary.totals.incomeCount;
        document.getElementById('taxDataExpenseCount').textContent = summary.totals.expenseCount;
        document.getElementById('taxDataTotalCount').textContent = summary.totals.transactionCount;

        // Update breakdown
        const breakdownDiv = document.getElementById('taxBreakdownDetails');
        breakdownDiv.innerHTML = '';

        if (summary.regime === 'srl_micro') {
            breakdownDiv.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Venituri Brute</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.income)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Procent Impozit</div>
                    <div class="breakdown-item-value">${(TaxEstimator.config.micro_tax_rate * 100).toFixed(1)}%</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Impozit Anual</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.grossTax)} RON</div>
                </div>
            `;
        } else if (summary.regime === 'srl_profit') {
            breakdownDiv.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Venituri Anuale</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.income)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Cheltuieli Deductibile</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.expenses)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Profit Impozabil</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(Math.max(0, summary.profit))} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Procent Tax (16%)</div>
                    <div class="breakdown-item-value">${(TaxEstimator.config.profit_tax_rate * 100).toFixed(1)}%</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Impozit Anual</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.grossTax)} RON</div>
                </div>
            `;
        } else if (summary.regime === 'pfa') {
            breakdownDiv.innerHTML = `
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Profit Net</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(Math.max(0, summary.profit))} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Impozit Venit (${(TaxEstimator.config.pfa_income_tax_rate * 100).toFixed(1)}%)</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.grossTax)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">CAS anual (${TaxEstimator.config.pfa_cas_monthly} RON × 12)</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.casContribution)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">CASS anual (${TaxEstimator.config.pfa_cass_monthly} RON × 12)</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.cassContribution)} RON</div>
                </div>
                <div class="breakdown-item">
                    <div class="breakdown-item-label">Total Obligații</div>
                    <div class="breakdown-item-value">${UI.formatCurrency(summary.totalTax)} RON</div>
                </div>
            `;
        }

        // Update assumptions
        const assumptionsList = document.getElementById('taxAssumptionsList');
        assumptionsList.innerHTML = '';
        summary.assumptions.forEach(assumption => {
            const li = document.createElement('li');
            li.textContent = assumption;
            assumptionsList.appendChild(li);
        });

        Logger.log('[TAX ESTIMATOR] Calculations rendered for year:', year);
    },

    renderAccountingReports(startDate, endDate, summary) {
        const categorySelect = document.getElementById('accCategories');
        if (!categorySelect) return;

        const allCategories = Accounting.getAllCategories();
        const currentValues = Array.from(categorySelect.selectedOptions).map(opt => opt.value);

        categorySelect.innerHTML = '<option value="">-- Toate --</option>';
        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            option.selected = currentValues.includes(cat);
            categorySelect.appendChild(option);
        });
    },

    renderAccountingTransactionList(txs) {
        const listContainer = document.getElementById('acc-tab-list');
        if (!listContainer) return;

        const list = listContainer.querySelector('.accounting-transactions');
        if (!list) return;
        
        list.innerHTML = '';

        if (txs.length === 0) {
            list.innerHTML = '<div class="empty-state">Nu sunt tranzacții pentru filtrele selectate</div>';
            return;
        }

        txs.forEach(tx => {
            const item = document.createElement('div');
            item.className = `accounting-tx-item tx-${tx.type}`;
            
            const typeLabel = tx.type === 'income' ? 'Venit' : 'Cheltuiala';
            const sign = tx.type === 'income' ? '+' : '-';

            let description = tx.note;
            if (tx.serviceName) description += ` (${tx.serviceName})`;

            item.innerHTML = `
                <div class="acc-tx-date">${tx.dateTime.substring(0, 10)}</div>
                <div class="acc-tx-time">${tx.dateTime.substring(11, 16)}</div>
                <div class="acc-tx-desc">
                    <div class="acc-tx-label">${description || 'Fără descriere'}</div>
                    <div class="acc-tx-meta">${tx.category || 'General'}</div>
                </div>
                <span class="acc-tx-type">${typeLabel}</span>
                <span class="acc-tx-status">${tx.status || 'confirmed'}</span>
                <span class="acc-tx-method">${tx.paymentMethod || 'N/A'}</span>
                <span class="acc-tx-amount">${sign}${UI.formatCurrency(tx.amount)}</span>
                <button class="btn-icon-delete" onclick="App.deleteTransaction('${tx.id}', event)" title="Șterge" data-tooltip="Șterge tranzacție">×</button>
            `;
            list.appendChild(item);
        });
    },

    renderAccountingReports(startDate, endDate, summary) {
        // ===== DAILY BREAKDOWN =====
        const dailyBreakdown = Accounting.getDailyBreakdown(startDate, endDate);
        const breakdownContainer = document.getElementById('dayBreakdownAccounting');
        if (breakdownContainer) {
            breakdownContainer.innerHTML = '';
            
            if (dailyBreakdown.length === 0) {
                breakdownContainer.innerHTML = '<p class="empty-state">Nu există tranzacții pentru perioada selectată</p>';
            } else {
                // Header
                const headerRow = document.createElement('div');
                headerRow.className = 'daily-summary-row header';
                headerRow.innerHTML = `
                    <div class="col-date">Data</div>
                    <div class="col-income">Venituri</div>
                    <div class="col-expense">Cheltuieli</div>
                    <div class="col-profit">Profit</div>
                `;
                breakdownContainer.appendChild(headerRow);

                // Data rows
                dailyBreakdown.forEach(day => {
                    const profitClass = day.profit >= 0 ? 'profit-positive' : 'profit-negative';
                    const row = document.createElement('div');
                    row.className = 'daily-summary-row';
                    row.innerHTML = `
                        <div class="col-date">${day.date}</div>
                        <div class="col-income" style="color: var(--color-success);">+${UI.formatCurrency(day.income)}</div>
                        <div class="col-expense" style="color: var(--color-danger);">-${UI.formatCurrency(day.expense)}</div>
                        <div class="col-profit ${profitClass}">${day.profit >= 0 ? '+' : ''}${UI.formatCurrency(day.profit)}</div>
                    `;
                    breakdownContainer.appendChild(row);
                });
            }
        }

        // ===== TOP EXPENSE CATEGORIES =====
        const topCategories = Accounting.getTopExpenseCategories(startDate, endDate, 5);
        const topExpenseContainer = document.getElementById('topExpenseCategories');
        if (topExpenseContainer) {
            topExpenseContainer.innerHTML = '';
            if (topCategories.length === 0) {
                topExpenseContainer.innerHTML = '<p class="empty-state">Nu există cheltuieli</p>';
            } else {
                topCategories.forEach(item => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'report-item';
                    itemEl.innerHTML = `
                        <span class="report-item-name">${item.category}</span>
                        <span class="report-item-amount" style="color: var(--color-danger);">-${UI.formatCurrency(item.amount)}</span>
                    `;
                    topExpenseContainer.appendChild(itemEl);
                });
            }
        }

        // ===== TOP SERVICES =====
        const topServices = Accounting.getTopServices(startDate, endDate, 5);
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
                        <span class="report-item-name">${item.service || 'Serviciu'}</span>
                        <span class="report-item-amount" style="color: var(--color-success);">+${UI.formatCurrency(item.amount)}</span>
                    `;
                    topServicesContainer.appendChild(itemEl);
                });
            }
        }
    },

    deleteTransaction(txId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Store transaction ID for confirmation
        this._pendingDeleteTxId = txId;

        // Get transaction to show in confirmation
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        const tx = transactions.find(t => t.id === txId);

        if (!tx) return;

        // Show delete confirmation modal
        const modal = document.getElementById('deleteConfirmModal');
        const message = document.getElementById('deleteConfirmMessage');
        const cancelBtn = document.getElementById('deleteCancelBtn');
        const confirmBtn = document.getElementById('deleteConfirmBtn');

        message.innerHTML = `Ești sigur că vrei să ștergi tranzacția?<br><strong>${tx.note || 'Fără descriere'}</strong> - ${UI.formatCurrency(tx.amount)} RON`;

        // Remove old event listeners
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newConfirmBtn = confirmBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        // Close modal on cancel
        newCancelBtn.addEventListener('click', () => {
            UI.closeModal('deleteConfirmModal');
            this._pendingDeleteTxId = null;
        });

        // Perform delete on confirm
        newConfirmBtn.addEventListener('click', () => {
            Accounting.deleteTransaction(this._pendingDeleteTxId);
            UI.closeModal('deleteConfirmModal');
            this._pendingDeleteTxId = null;

            // Emit event bus to sync all sections
            window.dispatchEvent(new CustomEvent('data:changed', {
                detail: {
                    reason: 'transaction:deleted',
                    transactionId: txId,
                    keysChanged: ['transactions', 'clients', 'appointments']
                }
            }));

            UI.showToast('Tranzacție ștearsă', 'success');
            Logger.log('[TRANSACTION DELETE] Event emitted for global sync');
        });

        // Also close on close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            this._pendingDeleteTxId = null;
        });

        UI.showModal('deleteConfirmModal');
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
     * GLOBAL RECALCULATION & RENDERING
     * This is the single source of truth for all UI updates
     * Called when any data changes (appointments, transactions, clients)
     */
    recalcAndRenderAll() {
        console.log('[RECALC] Starting global recalculation and re-render...');

        // Reload DataStore to get latest data from Storage
        if (window.DataStore) {
            DataStore.reload();
        } else {
            this.loadData();
        }

        // Get current tab to avoid re-rendering unnecessary sections
        const currentTab = AppState.currentTab || 'dashboard';

        // Always update Dashboard (KPIs visible everywhere)
        if (currentTab === 'dashboard') {
            this.renderDashboard();
        }

        // Update relevant tab based on current view
        switch (currentTab) {
            case 'clients':
                this.renderClients();
                break;
            case 'appointments':
                this.renderAppointments();
                break;
            case 'transactions':
                this.renderTransactions();
                break;
            case 'accounting':
                this.renderAccounting();
                break;
            case 'history':
                this.renderHistory();
                break;
            case 'services':
                this.renderServices();
                break;
            default:
                this.renderDashboard();
        }

        console.log('[RECALC] Global recalculation complete');
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
    // CRITICAL FIX: Reset overlay and modal states before initialization
    console.log('[CRITICAL FIX] Resetting modal/overlay states on DOMContentLoaded');
    const overlay = document.getElementById('modalOverlay');
    const modals = document.querySelectorAll('.modal');
    
    if (overlay) {
        overlay.classList.remove('active');
        console.log('[MODAL FIX] Overlay reset to hidden state');
    } else {
        console.error('[ERROR] Modal overlay element not found in DOM!');
    }
    
    modals.forEach(modal => {
        modal.classList.remove('active');
        console.log('[MODAL FIX] Modal reset:', modal.id);
    });
    
    document.body.classList.remove('modal-open');
    
    // Now initialize the app
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

