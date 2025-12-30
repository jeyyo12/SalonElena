/**
 * Appointments Feature
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import ModalManager from '../ui/modalManager.js';
import ToastManager from '../ui/toastManager.js';
import NavigationManager from '../ui/navigationManager.js';

const AppointmentsFeature = {
    currentFilters: {
        daterange: 'all',
        status: 'all',
        paid: 'all',
        search: ''
    },

    render(container) {
        const today = Store.getToday();
        const appointments = Store.load('appointments') || [];
        const currency = Store.getSetting('currency', 'RON');

        // Calculate totals
        const monthStart = today.substring(0, 7);
        const totalMonth = appointments
            .filter(a => a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled')
            .reduce((sum, a) => sum + a.priceSnapshot, 0);

        const totalToday = appointments
            .filter(a => a.date === today && a.paid && a.status !== 'cancelled')
            .reduce((sum, a) => sum + a.priceSnapshot, 0);

        let html = `
            <div class="section-header" style="margin-bottom: 20px;">
                <h2 class="section-title">Programări</h2>
                <div style="display: flex; gap: 12px;">
                    <span style="font-size: 14px; color: var(--color-text-secondary);">
                        <strong>Azi:</strong> ${totalToday} ${currency}
                    </span>
                    <span style="font-size: 14px; color: var(--color-text-secondary);">
                        <strong>Luna:</strong> ${totalMonth} ${currency}
                    </span>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Programări</h3>
                    <button class="btn btn-primary" id="btnAddAppointment">+ Programare Nouă</button>
                </div>

                <div class="filter-bar">
                    <div class="filter-group">
                        <label class="filter-label">Perioada</label>
                        <select id="filterDateRange" class="filter-select">
                            <option value="all">Toate</option>
                            <option value="today">Azi</option>
                            <option value="month">Luna Curentă</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Status</label>
                        <select id="filterStatus" class="filter-select">
                            <option value="all">Toate</option>
                            <option value="scheduled">Programate</option>
                            <option value="done">Finalizate</option>
                            <option value="cancelled">Anulate</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Plată</label>
                        <select id="filterPaid" class="filter-select">
                            <option value="all">Toate</option>
                            <option value="paid">Plătite</option>
                            <option value="unpaid">Neplătite</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Căutare</label>
                        <input type="text" id="filterSearch" placeholder="Nume/Telefon" class="filter-input">
                    </div>
                </div>

                <div id="appointmentsTable"></div>
            </div>
        `;

        container.innerHTML = html;
        this.renderTable();
    },

    bind(container) {
        // Add appointment button
        const addBtn = DOM.get('#btnAddAppointment');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddForm());
        }

        // Filters
        ['filterDateRange', 'filterStatus', 'filterPaid', 'filterSearch'].forEach(id => {
            const el = DOM.get(`#${id}`);
            if (el) {
                el.addEventListener('change', (e) => {
                    this.currentFilters[id.replace('filter', '').toLowerCase()] = e.target.value;
                    this.renderTable();
                });
                if (el.id === 'filterSearch') {
                    el.addEventListener('input', (e) => {
                        this.currentFilters['search'] = e.target.value;
                        this.renderTable();
                    });
                }
            }
        });

        // Table event delegation
        const table = DOM.get('#appointmentsTable');
        if (table) {
            table.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const id = e.target.closest('[data-id]')?.dataset.id;

                if (action === 'delete' && id) {
                    this.handleDelete(id);
                } else if (action === 'mark-done' && id) {
                    this.handleMarkDone(id);
                } else if (action === 'mark-paid' && id) {
                    this.handleMarkPaid(id);
                } else if (action === 'edit' && id) {
                    this.showEditForm(id);
                }
            });
        }
    },

    renderTable() {
        const today = Store.getToday();
        const monthStart = today.substring(0, 7);
        let appointments = Store.load('appointments') || [];

        // Apply filters
        const filters = this.currentFilters;

        if (filters.daterange === 'today') {
            appointments = appointments.filter(a => a.date === today);
        } else if (filters.daterange === 'month') {
            appointments = appointments.filter(a => a.date.startsWith(monthStart));
        }

        if (filters.status !== 'all') {
            appointments = appointments.filter(a => a.status === filters.status);
        }

        if (filters.paid !== 'all') {
            appointments = appointments.filter(a => 
                filters.paid === 'paid' ? a.paid : !a.paid
            );
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            appointments = appointments.filter(a =>
                a.customerName.toLowerCase().includes(search) ||
                (a.customerPhone && a.customerPhone.includes(search))
            );
        }

        // Sort by date and time
        appointments.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            return dateCompare !== 0 ? dateCompare : b.time.localeCompare(a.time);
        });

        let html = '';

        if (appointments.length === 0) {
            html = '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Nicio programare găsită</p>';
        } else {
            html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Ora</th>
                            <th>Client</th>
                            <th>Serviciu</th>
                            <th>Preț</th>
                            <th>Status</th>
                            <th>Plată</th>
                            <th>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointments.map(apt => {
                            const statusBadge = apt.status === 'done' ? 'success' : 
                                              apt.status === 'cancelled' ? 'cancelled' : 'pending';
                            const statusLabel = apt.status === 'done' ? 'Finalizată' :
                                              apt.status === 'cancelled' ? 'Anulată' : 'Programată';
                            const paidLabel = apt.paid ? 'Plătit' : 'Neplătit';
                            const paidBadge = apt.paid ? 'success' : 'pending';

                            return `
                                <tr data-id="${apt.id}">
                                    <td>${apt.date}</td>
                                    <td>${apt.time}</td>
                                    <td>
                                        <strong>${apt.customerName}</strong><br>
                                        <span class="text-secondary">${apt.customerPhone || '-'}</span>
                                    </td>
                                    <td>${apt.serviceNameSnapshot}</td>
                                    <td>${apt.priceSnapshot} RON</td>
                                    <td><span class="badge ${statusBadge}">${statusLabel}</span></td>
                                    <td><span class="badge ${paidBadge}">${paidLabel}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" data-action="edit" style="margin: 0 2px;">Editează</button>
                                        ${apt.status === 'scheduled' ? '<button class="btn btn-sm btn-secondary" data-action="mark-done">Finalizează</button>' : ''}
                                        ${!apt.paid && apt.status !== 'cancelled' ? '<button class="btn btn-sm btn-secondary" data-action="mark-paid">Plătit</button>' : ''}
                                        <button class="btn btn-sm btn-danger" data-action="delete">Șterge</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        DOM.setHTML('#appointmentsTable', html);
    },

    showAddForm() {
        const services = Store.load('services') || [];
        const appointments = Store.load('appointments') || [];
        
        // Extract unique customer names
        const uniqueCustomers = [...new Set(appointments.map(a => a.customerName))];

        const serviceOptions = services.map(s => `<option value="${s.id}" data-duration="${s.durationMin}" data-price="${s.price}">${s.name}</option>`).join('');
        const customerOptions = uniqueCustomers.map(c => `<option value="${c}">${c}</option>`).join('');

        const body = `
            <form id="appointmentForm">
                <div class="form-group">
                    <label>Client *</label>
                    <input type="text" id="aptCustomerName" placeholder="Nume client" list="customerList" required>
                    <datalist id="customerList">
                        ${customerOptions}
                    </datalist>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" id="aptCustomerPhone" placeholder="+40 7xx xxx xxx">
                </div>
                <div class="form-group">
                    <label>Serviciu *</label>
                    <select id="aptService" required>
                        <option value="">-- Selectează --</option>
                        ${serviceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="aptDate" value="${Store.getToday()}" required>
                </div>
                <div class="form-group">
                    <label>Ora *</label>
                    <input type="time" id="aptTime" required>
                </div>
                <div class="form-group">
                    <label>Preț</label>
                    <input type="number" id="aptPrice" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Note</label>
                    <textarea id="aptNotes" placeholder="Note suplimentare"></textarea>
                </div>
            </form>
        `;

        const self = this;
        ModalManager.open({
            title: 'Adaugă Programare Nouă',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Salvează',
                    class: 'btn-primary',
                    onClick: () => self.saveAppointment()
                }
            ]
        });

        // Auto-fill price when service is selected
        setTimeout(() => {
            const serviceSelect = DOM.get('#aptService');
            if (serviceSelect) {
                serviceSelect.addEventListener('change', () => {
                    const selected = serviceSelect.options[serviceSelect.selectedIndex];
                    const price = selected.dataset.price;
                    DOM.get('#aptPrice').value = price || '';
                });
            }
        }, 100);
    },

    showEditForm(id) {
        const appointments = Store.load('appointments') || [];
        const apt = appointments.find(a => a.id === id);
        if (!apt) return;

        const services = Store.load('services') || [];
        const serviceOptions = services.map(s => `<option value="${s.id}" data-duration="${s.durationMin}" data-price="${s.price}" ${s.id === apt.serviceId ? 'selected' : ''}>${s.name}</option>`).join('');

        const body = `
            <form id="appointmentForm">
                <div class="form-group">
                    <label>Client *</label>
                    <input type="text" id="aptCustomerName" value="${apt.customerName}" required>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" id="aptCustomerPhone" value="${apt.customerPhone || ''}">
                </div>
                <div class="form-group">
                    <label>Serviciu *</label>
                    <select id="aptService" required>${serviceOptions}</select>
                </div>
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="aptDate" value="${apt.date}" required>
                </div>
                <div class="form-group">
                    <label>Ora *</label>
                    <input type="time" id="aptTime" value="${apt.time}" required>
                </div>
                <div class="form-group">
                    <label>Preț</label>
                    <input type="number" id="aptPrice" step="0.01" min="0" value="${apt.priceSnapshot}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="aptStatus">
                        <option value="scheduled" ${apt.status === 'scheduled' ? 'selected' : ''}>Programată</option>
                        <option value="done" ${apt.status === 'done' ? 'selected' : ''}>Finalizată</option>
                        <option value="cancelled" ${apt.status === 'cancelled' ? 'selected' : ''}>Anulată</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Note</label>
                    <textarea id="aptNotes">${apt.notes || ''}</textarea>
                </div>
            </form>
        `;

        const self = this;
        ModalManager.open({
            title: 'Editează Programare',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Salvează',
                    class: 'btn-primary',
                    onClick: () => self.updateAppointment(id)
                }
            ]
        });
    },

    saveAppointment() {
        const services = Store.load('services') || [];
        const customerName = DOM.get('#aptCustomerName').value.trim();
        const customerPhone = DOM.get('#aptCustomerPhone').value.trim();
        const serviceId = DOM.get('#aptService').value;
        const date = DOM.get('#aptDate').value;
        const time = DOM.get('#aptTime').value;
        const price = parseFloat(DOM.get('#aptPrice').value) || 0;
        const notes = DOM.get('#aptNotes').value.trim();

        if (!customerName || !serviceId || !date || !time) {
            ToastManager.error('Completează câmpurile obligatorii');
            return;
        }

        const service = services.find(s => s.id === serviceId);
        if (!service) {
            ToastManager.error('Serviciu invalid');
            return;
        }

        const appointment = {
            id: Store.generateId(),
            date,
            time,
            customerName,
            customerPhone,
            serviceId,
            serviceNameSnapshot: service.name,
            durationMinSnapshot: service.durationMin,
            priceSnapshot: price || service.price,
            status: 'scheduled',
            paid: false,
            paymentMethod: null,
            notes
        };

        const appointments = Store.load('appointments') || [];
        appointments.push(appointment);
        Store.save('appointments', appointments);

        ModalManager.close();
        ToastManager.success('Programare adăugată');
        NavigationManager.renderView('appointments');
    },

    updateAppointment(id) {
        const services = Store.load('services') || [];
        const appointments = Store.load('appointments') || [];

        const customerName = DOM.get('#aptCustomerName').value.trim();
        const customerPhone = DOM.get('#aptCustomerPhone').value.trim();
        const serviceId = DOM.get('#aptService').value;
        const date = DOM.get('#aptDate').value;
        const time = DOM.get('#aptTime').value;
        const price = parseFloat(DOM.get('#aptPrice').value) || 0;
        const status = DOM.get('#aptStatus').value;
        const notes = DOM.get('#aptNotes').value.trim();

        if (!customerName || !serviceId || !date || !time) {
            ToastManager.error('Completează câmpurile obligatorii');
            return;
        }

        const service = services.find(s => s.id === serviceId);
        if (!service) {
            ToastManager.error('Serviciu invalid');
            return;
        }

        const apt = appointments.find(a => a.id === id);
        if (!apt) return;

        apt.customerName = customerName;
        apt.customerPhone = customerPhone;
        apt.serviceId = serviceId;
        apt.serviceNameSnapshot = service.name;
        apt.durationMinSnapshot = service.durationMin;
        apt.priceSnapshot = price || service.price;
        apt.date = date;
        apt.time = time;
        apt.status = status;
        apt.notes = notes;

        Store.save('appointments', appointments);
        ModalManager.close();
        ToastManager.success('Programare actualizată');
        NavigationManager.renderView('appointments');
    },

    handleDelete(id) {
        ModalManager.confirm({
            title: 'Șterge Programare',
            message: 'Sunteți sigur că doriți să ștergeți această programare?'
        }).then(confirmed => {
            if (confirmed) {
                const appointments = Store.load('appointments') || [];
                const filtered = appointments.filter(a => a.id !== id);
                Store.save('appointments', filtered);
                ToastManager.success('Programare ștearsă');
                this.renderTable();
            }
        });
    },

    handleMarkDone(id) {
        const appointments = Store.load('appointments') || [];
        const apt = appointments.find(a => a.id === id);
        if (!apt) return;

        apt.status = 'done';
        Store.save('appointments', appointments);
        ToastManager.success('Programare marcată ca finalizată');
        this.renderTable();
    },

    handleMarkPaid(id) {
        const self = this;
        const body = `
            <form>
                <div class="form-group">
                    <label>Metoda Plată *</label>
                    <select id="paymentMethod" required>
                        <option value="cash">Numerar</option>
                        <option value="card">Card</option>
                        <option value="transfer">Transfer Bancar</option>
                    </select>
                </div>
            </form>
        `;

        ModalManager.open({
            title: 'Marchează ca Plătit',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Confirmă',
                    class: 'btn-primary',
                    onClick: () => {
                        const method = DOM.get('#paymentMethod').value;
                        const appointments = Store.load('appointments') || [];
                        const apt = appointments.find(a => a.id === id);
                        if (apt) {
                            apt.paid = true;
                            apt.paymentMethod = method;
                            Store.save('appointments', appointments);
                            ModalManager.close();
                            ToastManager.success('Programare marcată ca plătită');
                            self.renderTable();
                        }
                    }
                }
            ]
        });
    }
};

export default AppointmentsFeature;
