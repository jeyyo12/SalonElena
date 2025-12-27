/**
 * Transactions Module - Income/Expense management
 */

const Transactions = {
    data: [],

    /**
     * Initialize transactions
     */
    init() {
        this.data = Storage.load(Storage.KEYS.TRANSACTIONS, []);
    },

    /**
     * Get all transactions
     */
    getAll() {
        return [...this.data];
    },

    /**
     * Create or update income transaction from appointment payment
     * If transaction for appointmentId already exists, update it instead of creating duplicate
     */
    createOrUpdateIncome(clientId, appointmentId, serviceId, amount, paymentMethod = 'cash', serviceName = '') {
        const now = new Date().toISOString();
        amount = parseFloat(amount);

        // Check if transaction already exists for this appointment
        const existingTx = this.data.find(t => t.appointmentId === appointmentId && t.type === 'income');

        if (existingTx) {
            // Update existing transaction
            existingTx.amount = amount;
            existingTx.paymentMethod = paymentMethod;
            existingTx.status = 'confirmed';
            existingTx.updatedAt = now;
            existingTx.dateTime = now;
            console.log('[TRANSACTION] Updated existing income:', existingTx.id);
        } else {
            // Create new transaction
            const transaction = {
                id: `tx-${Date.now()}`,
                type: 'income',
                status: 'confirmed',
                dateTime: now,
                amount: amount,
                currency: 'RON',
                paymentMethod: paymentMethod, // cash, card, transfer
                clientId,
                appointmentId,
                serviceId,
                serviceName: serviceName || 'Serviciu',
                note: '',
                source: 'appointment',
                createdAt: now,
                updatedAt: now
            };

            this.data.push(transaction);
            console.log('[TRANSACTION] Created new income:', transaction.id);
        }

        this.save();
        return existingTx || this.data[this.data.length - 1];
    },

    /**
     * Create income transaction from appointment payment (legacy, uses createOrUpdateIncome)
     */
    createIncome(clientId, appointmentId, serviceId, amount, method = 'cash', description = '') {
        return this.createOrUpdateIncome(clientId, appointmentId, serviceId, amount, method, description);
    },

    /**
     * Create expense transaction (manual)
     */
    createExpense(description, amount) {
        const transaction = {
            id: `tx-${Date.now()}`,
            type: 'expense',
            description,
            amount: parseFloat(amount),
            date: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        this.data.push(transaction);
        this.save();
        return transaction;
    },

    /**
     * Delete transaction
     */
    delete(id) {
        const index = this.data.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.save();
        return true;
    },

    /**
     * Get transactions by date (YYYY-MM-DD)
     * Uses dateTime field if available, falls back to date
     */
    getByDate(dateStr) {
        return this.data.filter(t => {
            // Use dateTime if available (new format), otherwise use date
            const dateField = t.dateTime || t.date;
            const txDate = dateField.split('T')[0];
            return txDate === dateStr;
        });
    },

    /**
     * Get transactions by date range
     */
    getByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return this.data.filter(t => {
            const dateField = t.dateTime || t.date;
            const txTime = new Date(dateField).getTime();
            return txTime >= start && txTime <= end;
        });
    },

    /**
     * Get daily summary for specific date
     * Only counts transactions with status="confirmed" (or legacy data without status)
     */
    getDailySummary(dateStr) {
        const dayTransactions = this.getByDate(dateStr);
        
        const income = dayTransactions
            .filter(t => t.type === 'income' && (t.status === 'confirmed' || !t.status))
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenses = dayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const profit = income - expenses;

        // Get unique clients served
        const clientsServed = new Set(
            dayTransactions
                .filter(t => t.type === 'income' && t.clientId)
                .map(t => t.clientId)
        ).size;

        return {
            date: dateStr,
            income,
            expenses,
            profit,
            clientsServed,
            transactionCount: dayTransactions.length,
            transactions: dayTransactions
        };
    },

    /**
     * Filter transactions by type
     */
    filterByType(transactions, type = 'all') {
        if (type === 'all') return transactions;
        return transactions.filter(t => t.type === type);
    },

    /**
     * Sort transactions by date (newest first)
     */
    sortByDate(transactions = null) {
        const list = transactions || this.data;
        return [...list].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
    },

    /**
     * Get monthly summary
     */
    getMonthlySummary(year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = this.getByDateRange(startDate, endDate);
        
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            year,
            month,
            income,
            expenses,
            profit: income - expenses,
            transactionCount: transactions.length
        };
    },

    /**
     * Save to storage
     */
    save() {
        Storage.save(Storage.KEYS.TRANSACTIONS, this.data);
    }
};
