/**
 * Finance Feature - Income, Expenses, Profit
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import ModalManager from '../ui/modalManager.js';
import ToastManager from '../ui/toastManager.js';
import NavigationManager from '../ui/navigationManager.js';
import Charts from '../ui/charts.js';

const FinanceFeature = {
    currentTab: 'income',
    currentFilters: {
        month: new Date().toISOString().substring(0, 7)
    },

    render(container) {
        const today = Store.getToday();
        const monthStart = today.substring(0, 7);
        const currency = Store.getSetting('currency', 'RON');

        const appointments = Store.load('appointments') || [];
        const expenses = Store.load('expenses') || [];

        const incomeMonth = appointments
            .filter(a => a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled')
            .reduce((sum, a) => sum + a.priceSnapshot, 0);

        const expensesMonth = expenses
            .filter(e => e.date.startsWith(monthStart))
            .reduce((sum, e) => sum + e.amount, 0);

        const html = `
            <div class="overview-grid" style="margin-bottom: 24px;">
                <div class="overview-card green">
                    <div class="overview-label">Venit (Luna)</div>
                    <div class="overview-value">${incomeMonth} ${currency}</div>
                </div>
                <div class="overview-card blue">
                    <div class="overview-label">Cheltuieli (Luna)</div>
                    <div class="overview-value">${expensesMonth} ${currency}</div>
                </div>
                <div class="overview-card yellow">
                    <div class="overview-label">Profit (Luna)</div>
                    <div class="overview-value">${incomeMonth - expensesMonth} ${currency}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-header">
                    <div style="display: flex; gap: 12px;">
                        <button class="btn btn-sm ${this.currentTab === 'income' ? 'btn-primary' : 'btn-secondary'}" data-tab="income">💰 Încasări</button>
                        <button class="btn btn-sm ${this.currentTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}" data-tab="expenses">📤 Cheltuieli</button>
                        <button class="btn btn-sm ${this.currentTab === 'summary' ? 'btn-primary' : 'btn-secondary'}" data-tab="summary">📊 Rezumat</button>
                    </div>
                </div>

                <div id="financeContent"></div>
            </div>
        `;

        container.innerHTML = html;
        this.renderTabContent();

        // Tab buttons
        const tabBtns = DOM.getAll('[data-tab]');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentTab = e.target.dataset.tab;
                this.renderTabContent();
            });
        });
    },

    bind(container) {
        // Event delegation for table actions
        const content = DOM.get('#financeContent');
        if (content) {
            content.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const id = e.target.closest('[data-id]')?.dataset.id;

                if (action === 'delete' && id) {
                    if (this.currentTab === 'expenses') {
                        this.handleDeleteExpense(id);
                    }
                }
            });
        }
    },

    renderTabContent() {
        const today = Store.getToday();
        const monthStart = this.currentFilters.month;
        const currency = Store.getSetting('currency', 'RON');

        if (this.currentTab === 'income') {
            const appointments = Store.load('appointments') || [];
            const incomeAppointments = appointments.filter(a => 
                a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled'
            ).sort((a, b) => b.date.localeCompare(a.date));

            const totalIncome = incomeAppointments.reduce((sum, a) => sum + a.priceSnapshot, 0);

            let html = `
                <div class="filter-bar">
                    <div class="filter-group">
                        <label class="filter-label">Lună</label>
                        <input type="month" id="incomeMonth" value="${monthStart}" class="filter-select">
                    </div>
                </div>
                <div style="margin-bottom: 16px; padding: 16px; background: #F0F9FF; border-radius: 10px; border-left: 4px solid #2563EB;">
                    <strong>Total Venit:</strong> ${totalIncome} ${currency}
                </div>
            `;

            if (incomeAppointments.length === 0) {
                html += '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Nicio încasare în această perioadă</p>';
            } else {
                html += `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Ora</th>
                                <th>Client</th>
                                <th>Serviciu</th>
                                <th>Preț</th>
                                <th>Metoda</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${incomeAppointments.map(apt => `
                                <tr>
                                    <td>${apt.date}</td>
                                    <td>${apt.time}</td>
                                    <td><strong>${apt.customerName}</strong></td>
                                    <td>${apt.serviceNameSnapshot}</td>
                                    <td>${apt.priceSnapshot} ${currency}</td>
                                    <td>${apt.paymentMethod || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            DOM.setHTML('#financeContent', html);

            // Month filter
            const monthInput = DOM.get('#incomeMonth');
            if (monthInput) {
                monthInput.addEventListener('change', (e) => {
                    this.currentFilters.month = e.target.value;
                    this.renderTabContent();
                });
            }
        } else if (this.currentTab === 'expenses') {
            const expenses = Store.load('expenses') || [];
            const monthExpenses = expenses
                .filter(e => e.date.startsWith(monthStart))
                .sort((a, b) => b.date.localeCompare(a.date));

            const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

            const categoryLabels = {
                rent: 'Chirie',
                products: 'Produse',
                utilities: 'Utilități',
                marketing: 'Marketing',
                transport: 'Transport',
                other: 'Altele'
            };

            let html = `
                <div class="section-header">
                    <h3 class="section-title">Cheltuieli</h3>
                    <button class="btn btn-primary btn-sm" id="btnAddExpense">+ Cheltuială Nouă</button>
                </div>
                <div class="filter-bar">
                    <div class="filter-group">
                        <label class="filter-label">Lună</label>
                        <input type="month" id="expenseMonth" value="${monthStart}" class="filter-select">
                    </div>
                </div>
                <div style="margin-bottom: 16px; padding: 16px; background: #FEF3C7; border-radius: 10px; border-left: 4px solid #F59E0B;">
                    <strong>Total Cheltuieli:</strong> ${totalExpenses} ${currency}
                </div>
            `;

            if (monthExpenses.length === 0) {
                html += '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Nicio cheltuială în această perioadă</p>';
            } else {
                html += `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Categorie</th>
                                <th>Furnizor</th>
                                <th>Sumă</th>
                                <th>Note</th>
                                <th>Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthExpenses.map(exp => `
                                <tr data-id="${exp.id}">
                                    <td>${exp.date}</td>
                                    <td>${categoryLabels[exp.category] || exp.category}</td>
                                    <td>${exp.vendor || '-'}</td>
                                    <td><strong>${exp.amount} ${currency}</strong></td>
                                    <td><span class="text-secondary">${exp.notes || '-'}</span></td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" data-action="delete">Șterge</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            DOM.setHTML('#financeContent', html);

            // Month filter
            const monthInput = DOM.get('#expenseMonth');
            if (monthInput) {
                monthInput.addEventListener('change', (e) => {
                    this.currentFilters.month = e.target.value;
                    this.renderTabContent();
                });
            }

            // Add expense button
            const addBtn = DOM.get('#btnAddExpense');
            if (addBtn) {
                addBtn.addEventListener('click', () => this.showAddExpenseForm());
            }
        } else if (this.currentTab === 'summary') {
            const appointments = Store.load('appointments') || [];
            const expenses = Store.load('expenses') || [];

            const incomeMonth = appointments
                .filter(a => a.date.startsWith(monthStart) && a.paid && a.status !== 'cancelled')
                .reduce((sum, a) => sum + a.priceSnapshot, 0);

            const expensesMonth = expenses
                .filter(e => e.date.startsWith(monthStart))
                .reduce((sum, e) => sum + e.amount, 0);

            // Expense categories breakdown
            const categoryLabels = {
                rent: 'Chirie',
                products: 'Produse',
                utilities: 'Utilități',
                marketing: 'Marketing',
                transport: 'Transport',
                other: 'Altele'
            };

            const categoryBreakdown = {};
            expenses
                .filter(e => e.date.startsWith(monthStart))
                .forEach(e => {
                    const cat = e.category || 'other';
                    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + e.amount;
                });

            const topCategories = Object.entries(categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, amount]) => ({
                    label: categoryLabels[cat],
                    value: amount
                }));

            let html = `
                <div class="filter-bar">
                    <div class="filter-group">
                        <label class="filter-label">Lună</label>
                        <input type="month" id="summaryMonth" value="${monthStart}" class="filter-select">
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom: 24px;">
                    <div style="padding: 20px; background: #DCFCE7; border-radius: 10px; border-left: 4px solid #10B981;">
                        <div style="font-size: 12px; color: #166534; margin-bottom: 8px;">VENIT</div>
                        <div style="font-size: 28px; font-weight: 700; color: #10B981;">${incomeMonth} ${currency}</div>
                    </div>
                    <div style="padding: 20px; background: #FECACA; border-radius: 10px; border-left: 4px solid #DC2626;">
                        <div style="font-size: 12px; color: #991B1B; margin-bottom: 8px;">CHELTUIELI</div>
                        <div style="font-size: 28px; font-weight: 700; color: #DC2626;">${expensesMonth} ${currency}</div>
                    </div>
                </div>

                <div style="padding: 20px; background: #F0F9FF; border-radius: 10px; border-left: 4px solid #2563EB; margin-bottom: 24px;">
                    <div style="font-size: 12px; color: #1E40AF; margin-bottom: 8px;">PROFIT</div>
                    <div style="font-size: 28px; font-weight: 700; color: #2563EB;">${incomeMonth - expensesMonth} ${currency}</div>
                </div>

                <h3 class="section-title" style="margin-bottom: 16px;">Top Categorii Cheltuieli</h3>
                <div class="chart-container" style="height: 250px;">
                    <canvas id="categoryChart" class="chart-canvas" width="400" height="250"></canvas>
                </div>
            `;

            DOM.setHTML('#financeContent', html);

            // Month filter
            const monthInput = DOM.get('#summaryMonth');
            if (monthInput) {
                monthInput.addEventListener('change', (e) => {
                    this.currentFilters.month = e.target.value;
                    this.renderTabContent();
                });
            }

            // Draw chart
            setTimeout(() => {
                const canvas = DOM.get('#categoryChart');
                if (canvas && topCategories.length > 0) {
                    Charts.drawBar(canvas, topCategories);
                }
            }, 100);
        }
    },

    showAddExpenseForm() {
        const categoryOptions = `
            <option value="rent">Chirie</option>
            <option value="products">Produse</option>
            <option value="utilities">Utilități</option>
            <option value="marketing">Marketing</option>
            <option value="transport">Transport</option>
            <option value="other">Altele</option>
        `;

        const body = `
            <form id="expenseForm">
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="expDate" value="${Store.getToday()}" required>
                </div>
                <div class="form-group">
                    <label>Categorie *</label>
                    <select id="expCategory" required>${categoryOptions}</select>
                </div>
                <div class="form-group">
                    <label>Furnizor</label>
                    <input type="text" id="expVendor" placeholder="Nume furnizor">
                </div>
                <div class="form-group">
                    <label>Sumă *</label>
                    <input type="number" id="expAmount" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label>Note</label>
                    <textarea id="expNotes" placeholder="Descriere suplimentară"></textarea>
                </div>
            </form>
        `;

        const self = this;
        ModalManager.open({
            title: 'Adaugă Cheltuială',
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
                    onClick: () => self.saveExpense()
                }
            ]
        });
    },

    saveExpense() {
        const date = DOM.get('#expDate').value;
        const category = DOM.get('#expCategory').value;
        const vendor = DOM.get('#expVendor').value.trim();
        const amount = parseFloat(DOM.get('#expAmount').value);
        const notes = DOM.get('#expNotes').value.trim();

        if (!date || !category || !amount) {
            ToastManager.error('Completează câmpurile obligatorii');
            return;
        }

        const expense = {
            id: Store.generateId(),
            date,
            category,
            vendor,
            amount,
            notes
        };

        const expenses = Store.load('expenses') || [];
        expenses.push(expense);
        Store.save('expenses', expenses);

        ModalManager.close();
        ToastManager.success('Cheltuială adăugată');
        this.renderTabContent();
    },

    handleDeleteExpense(id) {
        ModalManager.confirm({
            title: 'Șterge Cheltuială',
            message: 'Sunteți sigur că doriți să ștergeți această cheltuială?'
        }).then(confirmed => {
            if (confirmed) {
                const expenses = Store.load('expenses') || [];
                const filtered = expenses.filter(e => e.id !== id);
                Store.save('expenses', filtered);
                ToastManager.success('Cheltuială ștearsă');
                this.renderTabContent();
            }
        });
    }
};

export default FinanceFeature;
