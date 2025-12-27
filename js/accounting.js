/**
 * Accounting Module - Solid transaction logic, reporting, and analysis
 * Single Source of Truth: localStorage("transactions")
 */

const Accounting = {
    // Transaction model normalization
    TRANSACTION_DEFAULTS: {
        currency: 'RON',
        status: 'confirmed'
    },

    /**
     * Initialize accounting module
     */
    init() {
        this.normalizeTransactions();
    },

    /**
     * Normalize all transactions to standard model
     * - Ensures all required fields exist
     * - Converts old format to new format
     */
    normalizeTransactions() {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        let modified = false;

        const normalized = transactions.map(tx => {
            const normalized = {
                id: tx.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: tx.type || 'expense', // income | expense
                status: tx.status || 'confirmed', // confirmed | void
                dateTime: tx.dateTime || tx.date || new Date().toISOString(),
                amount: parseFloat(tx.amount) || 0,
                currency: tx.currency || 'RON',
                category: tx.category || tx.categoryId || 'General',
                paymentMethod: tx.paymentMethod || tx.method || 'cash', // cash | card | transfer
                note: tx.note || tx.description || '',
                
                // Optional fields
                clientId: tx.clientId || null,
                serviceName: tx.serviceName || null,
                appointmentId: tx.appointmentId || null,
                
                // Audit fields
                createdAt: tx.createdAt || new Date().toISOString(),
                updatedAt: tx.updatedAt || new Date().toISOString(),
                source: tx.source || 'manual', // manual | appointment | recurring
                sourceId: tx.sourceId || null // for dedup
            };

            // Mark if something changed
            if (JSON.stringify(tx) !== JSON.stringify(normalized)) {
                modified = true;
            }

            return normalized;
        });

        if (modified) {
            Storage.save(Storage.KEYS.TRANSACTIONS, normalized);
        }

        return normalized;
    },

    /**
     * Add transaction with dedup prevention
     */
    addTransaction(txData) {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);

        // Check for duplicate
        if (txData.sourceId) {
            const exists = transactions.find(t => t.sourceId === txData.sourceId && t.status === 'confirmed');
            if (exists) {
                Logger.warn(`[ACCOUNTING] Duplicate transaction prevented: ${txData.sourceId}`);
                return exists;
            }
        }

        // Create normalized transaction
        const tx = {
            id: txData.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: txData.type || 'expense',
            status: txData.status || 'confirmed',
            dateTime: txData.dateTime || txData.date || new Date().toISOString(),
            amount: parseFloat(txData.amount) || 0,
            currency: txData.currency || 'RON',
            category: txData.category || 'General',
            paymentMethod: txData.paymentMethod || 'cash',
            note: txData.note || txData.description || '',
            clientId: txData.clientId || null,
            serviceName: txData.serviceName || null,
            appointmentId: txData.appointmentId || null,
            createdAt: txData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: txData.source || 'manual',
            sourceId: txData.sourceId || null
        };

        transactions.push(tx);
        Storage.save(Storage.KEYS.TRANSACTIONS, transactions);
        Logger.log(`[ACCOUNTING] Transaction added: ${tx.id} (${tx.type} ${tx.amount} RON)`);

        return tx;
    },

    /**
     * Delete transaction (mark as void for audit trail)
     */
    deleteTransaction(txId) {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        const tx = transactions.find(t => t.id === txId);

        if (!tx) return false;

        // Mark as void instead of deleting
        tx.status = 'void';
        tx.updatedAt = new Date().toISOString();

        Storage.save(Storage.KEYS.TRANSACTIONS, transactions);
        Logger.log(`[ACCOUNTING] Transaction voided: ${txId}`);

        return true;
    },

    /**
     * Update transaction
     */
    updateTransaction(txId, updates) {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        const tx = transactions.find(t => t.id === txId);

        if (!tx) return null;

        Object.assign(tx, updates, { updatedAt: new Date().toISOString() });
        Storage.save(Storage.KEYS.TRANSACTIONS, transactions);
        Logger.log(`[ACCOUNTING] Transaction updated: ${txId}`);

        return tx;
    },

    /**
     * Get all confirmed transactions
     */
    getConfirmedTransactions() {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        return transactions.filter(t => t.status === 'confirmed');
    },

    /**
     * Get transactions by date range with timezone-safe boundaries
     * @param {Date|string} startDate - Start date (inclusive 00:00:00)
     * @param {Date|string} endDate - End date (inclusive 23:59:59)
     */
    getByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const startTime = start.getTime();

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTime = end.getTime();

        const transactions = this.getConfirmedTransactions();
        return transactions.filter(t => {
            const txTime = new Date(t.dateTime).getTime();
            return txTime >= startTime && txTime <= endTime;
        });
    },

    /**
     * Get summary for date range
     * Returns: totalIncome, totalExpense, profitNet, byPaymentMethod, byCategory
     */
    getSummaryForRange(startDate, endDate) {
        const txs = this.getByDateRange(startDate, endDate);

        const summary = {
            totalIncome: 0,
            totalExpense: 0,
            profitNet: 0,
            transactionCount: txs.length,
            paymentMethods: {
                cash: 0,
                card: 0,
                transfer: 0
            },
            byCategory: {},
            byDay: {},
            transactions: txs
        };

        txs.forEach(tx => {
            if (tx.type === 'income') {
                summary.totalIncome += tx.amount;
            } else if (tx.type === 'expense') {
                summary.totalExpense += tx.amount;

                // Category breakdown
                const cat = tx.category || 'Uncategorized';
                if (!summary.byCategory[cat]) {
                    summary.byCategory[cat] = 0;
                }
                summary.byCategory[cat] += tx.amount;
            }

            // Payment method totals
            if (tx.paymentMethod && summary.paymentMethods[tx.paymentMethod] !== undefined) {
                summary.paymentMethods[tx.paymentMethod] += tx.amount;
            }

            // Daily breakdown
            const day = tx.dateTime.split('T')[0];
            if (!summary.byDay[day]) {
                summary.byDay[day] = { income: 0, expense: 0 };
            }
            if (tx.type === 'income') {
                summary.byDay[day].income += tx.amount;
            } else {
                summary.byDay[day].expense += tx.amount;
            }
        });

        summary.profitNet = summary.totalIncome - summary.totalExpense;

        return summary;
    },

    /**
     * Filter transactions by criteria
     */
    filterTransactions(transactions, filters = {}) {
        let result = [...transactions];

        // By type
        if (filters.type && filters.type !== 'all') {
            result = result.filter(t => t.type === filters.type);
        }

        // By status
        if (filters.status && filters.status !== 'all') {
            result = result.filter(t => t.status === filters.status);
        }

        // By payment method
        if (filters.paymentMethods && filters.paymentMethods.length > 0) {
            result = result.filter(t => filters.paymentMethods.includes(t.paymentMethod));
        }

        // By category
        if (filters.categories && filters.categories.length > 0) {
            result = result.filter(t => filters.categories.includes(t.category));
        }

        // By search term (note, client, service)
        if (filters.search && filters.search.trim()) {
            const term = filters.search.toLowerCase();
            result = result.filter(t =>
                (t.note && t.note.toLowerCase().includes(term)) ||
                (t.serviceName && t.serviceName.toLowerCase().includes(term)) ||
                (t.clientId && t.clientId.toLowerCase().includes(term))
            );
        }

        // Sort by dateTime descending
        result.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

        return result;
    },

    /**
     * Get transactions for specific period with filters applied
     */
    getFiltered(startDate, endDate, filters = {}) {
        const txs = this.getByDateRange(startDate, endDate);
        return this.filterTransactions(txs, filters);
    },

    /**
     * Get daily breakdown for chart/reporting
     */
    getDailyBreakdown(startDate, endDate) {
        const summary = this.getSummaryForRange(startDate, endDate);
        const days = Object.keys(summary.byDay).sort();

        return days.map(day => ({
            date: day,
            income: summary.byDay[day].income,
            expense: summary.byDay[day].expense,
            profit: summary.byDay[day].income - summary.byDay[day].expense
        }));
    },

    /**
     * Get top expense categories
     */
    getTopExpenseCategories(startDate, endDate, limit = 5) {
        const summary = this.getSummaryForRange(startDate, endDate);

        return Object.entries(summary.byCategory)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Get income by service
     */
    getTopServices(startDate, endDate, limit = 5) {
        const txs = this.getByDateRange(startDate, endDate);
        const incomeByService = {};

        txs.filter(t => t.type === 'income').forEach(tx => {
            const service = tx.serviceName || 'Other';
            if (!incomeByService[service]) {
                incomeByService[service] = 0;
            }
            incomeByService[service] += tx.amount;
        });

        return Object.entries(incomeByService)
            .map(([service, amount]) => ({ service, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Get all categories used
     */
    getAllCategories() {
        const transactions = this.getConfirmedTransactions();
        const categories = new Set();

        transactions.forEach(tx => {
            if (tx.category) {
                categories.add(tx.category);
            }
        });

        return Array.from(categories).sort();
    },

    /**
     * Export to CSV
     */
    exportToCSV(transactions, filename = 'accounting-report.csv') {
        if (transactions.length === 0) {
            UI.showToast('Nu sunt tranzacții pentru export', 'warning');
            return;
        }

        // CSV header
        const headers = ['Data', 'Tip', 'Sumă', 'Categorie', 'Metoda Plată', 'Status', 'Notă', 'Client/Serviciu'];
        const rows = transactions.map(tx => [
            tx.dateTime.substring(0, 10),
            tx.type === 'income' ? 'Venit' : 'Cheltuiala',
            tx.amount.toFixed(2),
            tx.category || '-',
            this._formatPaymentMethod(tx.paymentMethod),
            tx.status,
            `"${tx.note.replace(/"/g, '""')}"`,
            tx.clientId ? `Client: ${tx.clientId}` : (tx.serviceName ? `Service: ${tx.serviceName}` : '-')
        ]);

        // Build CSV
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => {
                if (typeof cell === 'string' && cell.includes(',')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',') + '\n';
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Logger.log(`[ACCOUNTING] Exported ${transactions.length} transactions to ${filename}`);
        UI.showToast(`Export realizat: ${transactions.length} tranzacții`, 'success');
    },

    /**
     * Sync income from completed appointments
     */
    syncIncomeFromAppointments() {
        const appointments = Appointments.getAll();
        const txs = this.getConfirmedTransactions();

        appointments.forEach(appt => {
            if (appt.status === 'completed' && !appt.isVoid) {
                // Check if already synced
                const exists = txs.find(t => t.appointmentId === appt.id && t.source === 'appointment');
                if (exists) return;

                // Get service price
                const service = Services.getById(appt.serviceId);
                if (!service) return;

                // Create income transaction
                this.addTransaction({
                    type: 'income',
                    dateTime: appt.date,
                    amount: service.price,
                    category: 'Services',
                    paymentMethod: 'cash',
                    serviceName: service.name,
                    clientId: appt.clientId,
                    appointmentId: appt.id,
                    source: 'appointment',
                    sourceId: `appt-${appt.id}`
                });
            }
        });

        Logger.log('[ACCOUNTING] Sync completed appointments to income');
    },

    /**
     * Helper: format payment method
     */
    _formatPaymentMethod(method) {
        const map = {
            'cash': 'Numerar',
            'card': 'Card',
            'transfer': 'Transfer'
        };
        return map[method] || method;
    }
};

// Auto-initialize
Accounting.init();
