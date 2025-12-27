/**
 * Accounting Module - Professional Financial Management
 * Single source of truth: localStorage("transactions")
 * Normalized transaction model with full audit trail
 */

const Accounting = {
    transactions: [],
    categories: [],

    /**
     * Initialize accounting module
     */
    init() {
        this.loadTransactions();
        this.loadCategories();
        this.initDefaultCategories();
        Logger.log('[ACCOUNTING] Module initialized');
    },

    /**
     * Load transactions from localStorage (SINGLE SOURCE OF TRUTH)
     */
    loadTransactions() {
        try {
            const data = localStorage.getItem('transactions');
            this.transactions = data ? JSON.parse(data) : [];
            Logger.log(`[ACCOUNTING] Loaded ${this.transactions.length} transactions`);
        } catch (error) {
            Logger.error('[ACCOUNTING] Failed to load transactions:', error);
            this.transactions = [];
        }
    },

    /**
     * Save transactions to localStorage
     */
    saveTransactions() {
        try {
            localStorage.setItem('transactions', JSON.stringify(this.transactions));
        } catch (error) {
            Logger.error('[ACCOUNTING] Failed to save transactions:', error);
        }
    },

    /**
     * Load categories from localStorage
     */
    loadCategories() {
        try {
            const data = localStorage.getItem('categories');
            this.categories = data ? JSON.parse(data) : [];
        } catch (error) {
            Logger.error('[ACCOUNTING] Failed to load categories:', error);
            this.categories = [];
        }
    },

    /**
     * Save categories to localStorage
     */
    saveCategories() {
        try {
            localStorage.setItem('categories', JSON.stringify(this.categories));
        } catch (error) {
            Logger.error('[ACCOUNTING] Failed to save categories:', error);
        }
    },

    /**
     * Initialize default categories if empty
     */
    initDefaultCategories() {
        if (this.categories.length > 0) return;

        const defaultCategories = [
            // Expense Categories
            { id: `cat-prod`, type: 'expense', name: 'Produse', color: '#2EE59D' },
            { id: `cat-cons`, type: 'expense', name: 'Consumabile', color: '#F7C948' },
            { id: `cat-rent`, type: 'expense', name: 'Chirie', color: '#FF5C7A' },
            { id: `cat-util`, type: 'expense', name: 'Utilități', color: '#00D9FF' },
            { id: `cat-mkt`, type: 'expense', name: 'Marketing', color: '#FF006E' },
            { id: `cat-trans`, type: 'expense', name: 'Transport', color: '#8338EC' },
            { id: `cat-other`, type: 'expense', name: 'Diverse', color: '#FFBE0B' }
        ];

        this.categories = defaultCategories;
        this.saveCategories();
    },

    /**
     * Normalize transaction to standard model
     */
    normalizeTransaction(tx) {
        if (!tx.id) {
            tx.id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!tx.type) tx.type = 'expense';
        if (!tx.status) tx.status = 'confirmed';
        if (!tx.currency) tx.currency = 'RON';
        if (!tx.paymentMethod) tx.paymentMethod = 'cash';
        if (!tx.amount) tx.amount = 0;
        if (!tx.note) tx.note = '';
        if (!tx.createdAt) tx.createdAt = new Date().toISOString();
        if (!tx.updatedAt) tx.updatedAt = new Date().toISOString();

        return tx;
    },

    /**
     * Add transaction with deduplication
     */
    addTransaction(txData) {
        // Normalize
        const tx = this.normalizeTransaction({ ...txData });

        // Prevent duplicate - check sourceId or appointmentId
        if (tx.sourceId) {
            const exists = this.transactions.find(t => t.sourceId === tx.sourceId && t.type === tx.type);
            if (exists) {
                Logger.warn('[ACCOUNTING] Transaction with sourceId already exists:', tx.sourceId);
                return { error: 'Transaction already exists', duplicate: exists };
            }
        }

        if (tx.appointmentId) {
            const exists = this.transactions.find(
                t => t.appointmentId === tx.appointmentId && t.type === tx.type && t.status === 'confirmed'
            );
            if (exists) {
                Logger.warn('[ACCOUNTING] Income already exists for appointment:', tx.appointmentId);
                return { warning: 'Income already recorded for this appointment', duplicate: exists };
            }
        }

        this.transactions.push(tx);
        this.saveTransactions();
        Logger.log(`[ACCOUNTING] Added ${tx.type} transaction: ${tx.amount} RON`);
        return tx;
    },

    /**
     * Update transaction
     */
    updateTransaction(txId, patch) {
        const tx = this.transactions.find(t => t.id === txId);
        if (!tx) return { error: 'Transaction not found' };

        Object.assign(tx, patch, { updatedAt: new Date().toISOString() });
        this.saveTransactions();
        Logger.log('[ACCOUNTING] Updated transaction:', txId);
        return tx;
    },

    /**
     * Delete transaction
     */
    deleteTransaction(txId) {
        const index = this.transactions.findIndex(t => t.id === txId);
        if (index === -1) return { error: 'Transaction not found' };

        this.transactions.splice(index, 1);
        this.saveTransactions();
        Logger.log('[ACCOUNTING] Deleted transaction:', txId);
        return { success: true };
    },

    /**
     * Get transactions with advanced filtering
     * Includes only status="confirmed" by default
     */
    getFilteredTransactions(filters = {}) {
        let result = [...this.transactions];

        // Status filter - default: confirmed only
        if (filters.status && filters.status !== 'all') {
            result = result.filter(t => t.status === filters.status);
        } else {
            result = result.filter(t => t.status === 'confirmed');
        }

        // Type filter
        if (filters.type && filters.type !== 'all') {
            result = result.filter(t => t.type === filters.type);
        }

        // Date range (timezone-safe: 00:00 to 23:59:59)
        if (filters.dateFrom) {
            const start = new Date(filters.dateFrom);
            start.setHours(0, 0, 0, 0);
            result = result.filter(t => {
                const txDateTime = new Date(`${t.date}T${t.time || '00:00'}:00`);
                return txDateTime >= start;
            });
        }

        if (filters.dateTo) {
            const end = new Date(filters.dateTo);
            end.setHours(23, 59, 59, 999);
            result = result.filter(t => {
                const txDateTime = new Date(`${t.date}T${t.time || '00:00'}:00`);
                return txDateTime <= end;
            });
        }

        // Payment method filter
        const paymentMethods = filters.paymentMethods || [];
        if (paymentMethods.length > 0) {
            result = result.filter(t => paymentMethods.includes(t.paymentMethod));
        }

        // Category filter (for expenses)
        const categories = filters.categories || [];
        if (categories.length > 0) {
            result = result.filter(t => categories.includes(t.categoryId));
        }

        // Search in note, client name, service name
        if (filters.search) {
            const term = filters.search.toLowerCase();
            result = result.filter(t => {
                const client = t.clientId && typeof Clients !== 'undefined' 
                    ? (Clients.getById(t.clientId)?.name || '').toLowerCase() 
                    : '';
                const note = (t.note || '').toLowerCase();
                const service = (t.serviceName || '').toLowerCase();
                return client.includes(term) || note.includes(term) || service.includes(term);
            });
        }

        // Sort by date descending
        result.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
            const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
            return dateB - dateA;
        });

        return result;
    },

    /**
     * Get summary for date range with filters
     * SINGLE SOURCE OF TRUTH: Only counts confirmed transactions
     */
    getRangeSummary(filters = {}) {
        const txs = this.getFilteredTransactions(filters);

        // Calculate totals - ONLY confirmed
        const incomeTotal = txs
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenseTotal = txs
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const profit = incomeTotal - expenseTotal;

        // Payment method totals
        const cashTotal = txs
            .filter(t => t.paymentMethod === 'cash')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const cardTotal = txs
            .filter(t => t.paymentMethod === 'card')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const transferTotal = txs
            .filter(t => t.paymentMethod === 'transfer')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Unique clients served
        const clientsSet = new Set();
        txs.forEach(t => {
            if (t.type === 'income' && t.clientId) {
                clientsSet.add(t.clientId);
            }
        });

        return {
            incomeTotal: parseFloat(incomeTotal.toFixed(2)),
            expenseTotal: parseFloat(expenseTotal.toFixed(2)),
            profit: parseFloat(profit.toFixed(2)),
            txCount: txs.length,
            clientsServed: clientsSet.size,
            cashTotal: parseFloat(cashTotal.toFixed(2)),
            cardTotal: parseFloat(cardTotal.toFixed(2)),
            transferTotal: parseFloat(transferTotal.toFixed(2)),
            transactions: txs
        };
    },

    /**
     * Group transactions by day for reporting
     */
    groupByDay(transactions) {
        const grouped = {};

        transactions.forEach(tx => {
            if (!grouped[tx.date]) {
                grouped[tx.date] = {
                    date: tx.date,
                    income: 0,
                    expenses: 0,
                    transactions: []
                };
            }

            if (tx.type === 'income') {
                grouped[tx.date].income += tx.amount;
            } else if (tx.type === 'expense') {
                grouped[tx.date].expenses += tx.amount;
            }

            grouped[tx.date].transactions.push(tx);
        });

        return Object.values(grouped)
            .map(day => ({
                date: day.date,
                income: parseFloat(day.income.toFixed(2)),
                expenses: parseFloat(day.expenses.toFixed(2)),
                profit: parseFloat((day.income - day.expenses).toFixed(2)),
                txCount: day.transactions.length,
                transactions: day.transactions
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /**
     * Get top expense categories
     */
    getTopExpenseCategories(transactions, limit = 5) {
        const categoryMap = {};

        transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                if (!categoryMap[t.categoryId]) {
                    categoryMap[t.categoryId] = 0;
                }
                categoryMap[t.categoryId] += t.amount;
            });

        return Object.entries(categoryMap)
            .map(([catId, amount]) => ({
                categoryId: catId,
                categoryName: this.getCategory(catId)?.name || 'Unknown',
                amount: parseFloat(amount.toFixed(2))
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Get top services by income
     */
    getTopServices(transactions, limit = 5) {
        const serviceMap = {};

        transactions
            .filter(t => t.type === 'income' && t.serviceName)
            .forEach(t => {
                if (!serviceMap[t.serviceName]) {
                    serviceMap[t.serviceName] = 0;
                }
                serviceMap[t.serviceName] += t.amount;
            });

        return Object.entries(serviceMap)
            .map(([name, amount]) => ({ serviceName: name, amount: parseFloat(amount.toFixed(2)) }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Get category by ID
     */
    getCategory(categoryId) {
        return this.categories.find(c => c.id === categoryId);
    },

    /**
     * Add category
     */
    addCategory(name, type, color) {
        const category = {
            id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            name,
            color
        };
        this.categories.push(category);
        this.saveCategories();
        Logger.log(`[ACCOUNTING] Added category: ${name}`);
        return category;
    },

    /**
     * Delete category
     */
    deleteCategory(categoryId) {
        const index = this.categories.findIndex(c => c.id === categoryId);
        if (index === -1) return { error: 'Category not found' };

        // Don't allow deletion if expenses use this category
        const usageCount = this.transactions.filter(t => t.categoryId === categoryId).length;
        if (usageCount > 0) {
            return { error: `Category used by ${usageCount} transactions` };
        }

        this.categories.splice(index, 1);
        this.saveCategories();
        Logger.log('[ACCOUNTING] Deleted category:', categoryId);
        return { success: true };
    },

    /**
     * Export transactions to CSV
     */
    exportCsv(transactions, filename = 'accounting.csv') {
        const headers = ['Data', 'Oră', 'Tip', 'Descriere', 'Categorie', 'Metodă Plată', 'Suma (RON)', 'Status'];
        const rows = [];

        transactions.forEach(tx => {
            const client = tx.clientId && typeof Clients !== 'undefined' ? Clients.getById(tx.clientId)?.name : '';
            const description = `${client} ${tx.serviceName || tx.note}`.trim();
            const category = this.getCategory(tx.categoryId)?.name || '-';
            const type = tx.type === 'income' ? 'VENIT' : 'CHELTUIALA';
            const amount = tx.amount.toFixed(2).replace('.', ',');

            rows.push([
                tx.date,
                tx.time,
                type,
                `"${description}"`,
                category,
                tx.paymentMethod,
                amount,
                tx.status
            ]);
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Auto-sync: Sync income from completed appointments
     */
    syncIncomeFromAppointments() {
        try {
            const appointments = Storage.load(Storage.KEYS.APPOINTMENTS, []);
            let syncCount = 0;

            appointments.forEach(appt => {
                if (appt.status !== 'completed') return;

                // Check if income already exists for this appointment
                const existingIncome = this.transactions.find(
                    t => t.appointmentId === appt.id && t.type === 'income' && t.status === 'confirmed'
                );
                if (existingIncome) return;

                // Create income transaction
                const incomeTransaction = {
                    type: 'income',
                    date: appt.date || new Date().toISOString().split('T')[0],
                    time: appt.time || '12:00',
                    amount: parseFloat(appt.price) || 0,
                    clientId: appt.clientId,
                    serviceName: appt.serviceName || 'Serviciu',
                    appointmentId: appt.id,
                    paymentMethod: appt.paymentMethod || 'cash',
                    note: `Auto-sync din programare: ${appt.serviceName || 'Serviciu'}`,
                    status: 'confirmed'
                };

                this.addTransaction(incomeTransaction);
                syncCount++;
            });

            if (syncCount > 0) {
                Logger.log(`[ACCOUNTING] Auto-synced ${syncCount} income from appointments`);
            }
        } catch (error) {
            Logger.error('[ACCOUNTING] Error in syncIncomeFromAppointments:', error);
        }
    },

    /**
     * Full accounting sync
     */
    fullSync() {
        Logger.log('[ACCOUNTING] === FULL SYNC START ===');
        this.syncIncomeFromAppointments();
        Logger.log('[ACCOUNTING] === FULL SYNC COMPLETE ===');
    }
};

// Initialize accounting module
Accounting.init();
