/**
 * Dashboard Feature
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import Charts from '../ui/charts.js';
import ModalManager from '../ui/modalManager.js';
import ToastManager from '../ui/toastManager.js';
import NavigationManager from '../ui/navigationManager.js';

const DashboardFeature = {
    render(container) {
        const today = Store.getToday();
        const appointments = Store.load('appointments') || [];
        const expenses = Store.load('expenses') || [];
        const currency = Store.getSetting('currency', 'RON');

        // Calculate metrics
        const incomeToday = appointments
            .filter(a => a.date === today && a.paid && a.status !== 'cancelled')
            .reduce((sum, a) => sum + a.priceSnapshot, 0);

        const monthStart = today.substring(0, 7);
        const incomeMonth = appointments
            .filter(a => a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled')
            .reduce((sum, a) => sum + a.priceSnapshot, 0);

        const expensesMonth = expenses
            .filter(e => e.date.startsWith(monthStart))
            .reduce((sum, e) => sum + e.amount, 0);

        const profitMonth = incomeMonth - expensesMonth;

        const html = `
            <div class="overview-grid">
                <div class="overview-card orange">
                    <div class="overview-label">Venit Azi</div>
                    <div class="overview-value">${incomeToday} ${currency}</div>
                </div>
                <div class="overview-card green">
                    <div class="overview-label">Venit Luna</div>
                    <div class="overview-value">${incomeMonth} ${currency}</div>
                </div>
                <div class="overview-card blue">
                    <div class="overview-label">Cheltuieli Luna</div>
                    <div class="overview-value">${expensesMonth} ${currency}</div>
                </div>
                <div class="overview-card yellow">
                    <div class="overview-label">Profit Luna</div>
                    <div class="overview-value">${profitMonth} ${currency}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Acțiuni Rapide</h3>
                </div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-primary" id="btnWalkIn">⚡ Programare Rapidă Walk-In</button>
                </div>
            </div>

            <div class="grid-2">
                <div class="section">
                    <div class="section-header">
                        <h3 class="section-title">Programări Azi</h3>
                        <input type="date" id="scheduleDate" value="${today}" class="filter-select">
                    </div>
                    <div id="daySchedule" class="timeline"></div>
                </div>

                <div class="section">
                    <h3 class="section-title">Venit Zilnic (Luna)</h3>
                    <div class="chart-container">
                        <canvas id="revenueChart" class="chart-canvas" width="400" height="250"></canvas>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">Cheltuieli pe Categorii</h3>
                <div class="chart-container">
                    <canvas id="expensesChart" class="chart-canvas" width="400" height="250"></canvas>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.renderDaySchedule(today);
        this.renderCharts(today);

        // Schedule date picker
        const dateInput = DOM.get('#scheduleDate');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.renderDaySchedule(e.target.value);
            });
        }
    },

    renderDaySchedule(date) {
        const appointments = Store.load('appointments') || [];
        const dayAppointments = appointments.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));

        if (dayAppointments.length === 0) {
            DOM.setHTML('#daySchedule', '<p style="text-align: center; color: var(--color-text-secondary); padding: 20px;">Nicio programare în această zi</p>');
            return;
        }

        let html = '';
        let currentHour = null;

        dayAppointments.forEach(apt => {
            const hour = apt.time.split(':')[0];

            if (currentHour !== hour) {
                if (currentHour !== null) html += '</div></div>';
                html += `<div class="timeline-hour"><div class="timeline-time">${hour}:00</div><div class="timeline-appointments">`;
                currentHour = hour;
            }

            html += `
                <div class="timeline-appointment">
                    <div class="timeline-appointment-name">${apt.customerName}</div>
                    <div class="timeline-appointment-service">${apt.serviceNameSnapshot} • ${apt.priceSnapshot} RON</div>
                </div>
            `;
        });

        if (currentHour !== null) html += '</div></div>';

        DOM.setHTML('#daySchedule', html);
    },

    renderCharts(today) {
        const monthStart = today.substring(0, 7);
        const appointments = Store.load('appointments') || [];
        const expenses = Store.load('expenses') || [];

        // Daily revenue chart
        const dailyRevenue = {};
        appointments
            .filter(a => a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled')
            .forEach(a => {
                dailyRevenue[a.date] = (dailyRevenue[a.date] || 0) + a.priceSnapshot;
            });

        const revenueData = Object.entries(dailyRevenue)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({
                label: new Date(date).getDate().toString(),
                value
            }));

        const revenueCanvas = DOM.get('#revenueChart');
        if (revenueCanvas && revenueData.length > 0) {
            Charts.drawLine(revenueCanvas, revenueData);
        }

        // Expenses by category
        const categoryCounts = {
            rent: 0,
            products: 0,
            utilities: 0,
            marketing: 0,
            transport: 0,
            other: 0
        };

        expenses
            .filter(e => e.date.startsWith(monthStart))
            .forEach(e => {
                categoryCounts[e.category || 'other'] += e.amount;
            });

        const categoryLabels = {
            rent: 'Chirie',
            products: 'Produse',
            utilities: 'Utilități',
            marketing: 'Marketing',
            transport: 'Transport',
            other: 'Altele'
        };

        const expensesData = Object.entries(categoryCounts)
            .filter(([, value]) => value > 0)
            .map(([cat, value]) => ({
                label: categoryLabels[cat],
                value
            }));

        const expensesCanvas = DOM.get('#expensesChart');
        if (expensesCanvas && expensesData.length > 0) {
            Charts.drawBar(expensesCanvas, expensesData);
        }
    },

    bind(container) {
        // Walk-in button
        const walkInBtn = DOM.get('#btnWalkIn');
        if (walkInBtn) {
            walkInBtn.addEventListener('click', () => this.showWalkInForm());
        }
    },

    showWalkInForm() {
        const services = Store.load('services') || [];
        const serviceOptions = services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name} - ${s.price} RON</option>`).join('');

        const body = `
            <form id="walkInForm">
                <div class="form-group">
                    <label>Nume Client *</label>
                    <input type="text" id="wiClientName" placeholder="Ex: Maria" required autofocus>
                </div>
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" id="wiClientPhone" placeholder="+40 7xx xxx xxx">
                </div>
                <div class="form-group">
                    <label>Serviciu *</label>
                    <select id="wiService" required>
                        <option value="">-- Selectează --</option>
                        ${serviceOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Preț</label>
                    <input type="number" id="wiPrice" step="0.01" min="0" readonly>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="wiPaidNow">
                        <span>Plătit acum</span>
                    </label>
                </div>
            </form>
        `;

        ModalManager.open({
            title: '⚡ Programare Rapidă Walk-In',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Finalizează',
                    class: 'btn-primary',
                    onClick: () => this.saveWalkIn()
                }
            ]
        });

        // Auto-fill price
        setTimeout(() => {
            const serviceSelect = DOM.get('#wiService');
            if (serviceSelect) {
                serviceSelect.addEventListener('change', () => {
                    const selected = serviceSelect.options[serviceSelect.selectedIndex];
                    DOM.get('#wiPrice').value = selected.dataset.price || '';
                });
            }
        }, 100);
    },

    saveWalkIn() {
        const services = Store.load('services') || [];
        const today = Store.getToday();
        const now = new Date();
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hour}:${minute}`;

        const clientName = DOM.get('#wiClientName').value.trim();
        const clientPhone = DOM.get('#wiClientPhone').value.trim();
        const serviceId = DOM.get('#wiService').value;
        const price = parseFloat(DOM.get('#wiPrice').value) || 0;
        const paidNow = DOM.get('#wiPaidNow').checked;

        if (!clientName || !serviceId) {
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
            date: today,
            time: currentTime,
            customerName: clientName,
            customerPhone: clientPhone,
            serviceId,
            serviceNameSnapshot: service.name,
            durationMinSnapshot: service.durationMin,
            priceSnapshot: price || service.price,
            status: 'done',
            paid: paidNow,
            paymentMethod: paidNow ? 'cash' : null,
            notes: 'Walk-in client'
        };

        const appointments = Store.load('appointments') || [];
        appointments.push(appointment);
        Store.save('appointments', appointments);

        ModalManager.close();
        ToastManager.success(`${clientName} - Programare înregistrată!`);
        NavigationManager.renderView('dashboard');
    }
};

export default DashboardFeature;
