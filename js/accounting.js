/**
 * Accounting Module
 * Professional financial management with categories, reporting, and export
 */

const Accounting = {
    transactions: [],
    categories: [],

    init() {
        this.loadTransactions();
        this.loadCategories();
        this.initDefaultCategories();
    },

    /**
     * Load transactions from localStorage
     */
    loadTransactions() {
        const key = 'transactions';
        const data = localStorage.getItem(key);
        this.transactions = data ? JSON.parse(data) : [];
    },

    /**
     * Save transactions to localStorage
     */
    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    },

    /**
     * Load categories from localStorage
     */
    loadCategories() {
        const key = 'categories';
        const data = localStorage.getItem(key);
        this.categories = data ? JSON.parse(data) : [];
        return this.categories;
    },

    /**
     * Save categories to localStorage
     */
    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    },

    /**
     * Initialize default categories
     */
    initDefaultCategories() {
        if (this.categories.length > 0) return;

        const defaultCategories = [
            // Income
            { id: `cat-${Date.now()}-1`, type: 'income', name: 'Tuns', color: '#9D4EDD' },
            { id: `cat-${Date.now()}-2`, type: 'income', name: 'Coafat', color: '#7B2CBF' },
            { id: `cat-${Date.now()}-3`, type: 'income', name: 'Vopsit', color: '#E6B8A2' },
            { id: `cat-${Date.now()}-4`, type: 'income', name: 'Tratament', color: '#C8A24A' },
            // Expense
            { id: `cat-${Date.now()}-5`, type: 'expense', name: 'Produse', color: '#2EE59D' },
            { id: `cat-${Date.now()}-6`, type: 'expense', name: 'Consumabile', color: '#F7C948' },
            { id: `cat-${Date.now()}-7`, type: 'expense', name: 'Chirie', color: '#FF5C7A' },
            { id: `cat-${Date.now()}-8`, type: 'expense', name: 'Utilități', color: '#00D9FF' },
            { id: `cat-${Date.now()}-9`, type: 'expense', name: 'Marketing', color: '#FF006E' },
            { id: `cat-${Date.now()}-10`, type: 'expense', name: 'Transport', color: '#8338EC' },
            { id: `cat-${Date.now()}-11`, type: 'expense', name: 'Diverse', color: '#FFBE0B' }
        ];

        this.categories = defaultCategories;
        this.saveCategories();
    },

    /**
     * Add transaction
     */
    addTransaction(tx) {
        const transaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: tx.type, // income | expense
            date: tx.date, // YYYY-MM-DD
            time: tx.time || '00:00',
            amount: parseFloat(tx.amount) || 0,
            currency: tx.currency || 'RON',
            categoryId: tx.categoryId || null,
            clientId: tx.clientId || null,
            appointmentId: tx.appointmentId || null,
            serviceName: tx.serviceName || '',
            paymentMethod: tx.paymentMethod || 'cash',
            note: tx.note || '',
            status: tx.status || 'confirmed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        return transaction;
    },

    /**
     * Update transaction
     */
    updateTransaction(txId, patch) {
        const tx = this.transactions.find(t => t.id === txId);
        if (!tx) return { error: 'Transaction not found' };

        Object.assign(tx, patch, { updatedAt: new Date().toISOString() });
        this.saveTransactions();
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
        return { success: true };
    },

    /**
     * AUTOMATION: Create income from completed appointment
     * Called when appointment marked as complete
     * Prevents duplicate income creation via isPaid flag
     */
    createIncomeFromCompletedAppointment(appointmentId) {
        // Check if appointment exists and not already paid
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        const appointment = appointments.find(a => a.id === appointmentId);

        if (!appointment) {
            console.warn('Appointment not found:', appointmentId);
            return { error: 'Appointment not found' };
        }

        // Prevent duplicate income transactions
        if (appointment.isPaid === true) {
            console.warn('Appointment already paid:', appointmentId);
            return { warning: 'Appointment already paid - no duplicate created' };
        }

        // Check if income transaction already exists for this appointment
        const existingIncome = this.transactions.find(
            t => t.appointmentId === appointmentId && t.type === 'income' && t.status === 'confirmed'
        );

        if (existingIncome) {
            console.warn('Income already exists for appointment:', appointmentId);
            return { warning: 'Income already recorded for this appointment' };
        }

        // Find default income category
        const defaultIncomeCategory = this.categories.find(c => c.type === 'income');
        const categoryId = defaultIncomeCategory ? defaultIncomeCategory.id : null;

        // Create income transaction
        const incomeTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'income',
            date: appointment.dateTime.split('T')[0], // Extract date part
            time: appointment.dateTime.split('T')[1]?.substring(0, 5) || '12:00',
            amount: parseFloat(appointment.price) || 0,
            currency: 'RON',
            categoryId: categoryId,
            clientId: appointment.clientId,
            appointmentId: appointment.id,
            serviceName: appointment.serviceName || 'Serviciu salon',
            paymentMethod: 'cash', // Default, can be overridden
            note: `Auto-created from completed appointment`,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add transaction
        this.transactions.push(incomeTransaction);
        this.saveTransactions();

        // Mark appointment as paid
        appointment.isPaid = true;
        const updatedAppointments = appointments.map(a => a.id === appointmentId ? appointment : a);
        localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

        // Update Appointment object in memory if loaded
        if (typeof Appointments !== 'undefined') {
            Appointments.appointments = updatedAppointments;
        }

        // Update client stats
        if (appointment.clientId && typeof Clients !== 'undefined') {
            const client = Clients.getById(appointment.clientId);
            if (client) {
                const visits = (client.visits || 0) + 1;
                const totalSpent = (client.totalSpent || 0) + parseFloat(appointment.price);
                Clients.updateStats(appointment.clientId, visits, totalSpent, new Date().toISOString());
            }
        }

        return {
            success: true,
            transaction: incomeTransaction,
            message: `Income ${incomeTransaction.amount} RON created from appointment`
        };
    },

    /**
     * Get transactions with advanced filtering
     */
    getFilteredTransactions(filters = {}) {
        let result = [...this.transactions];

        // Date range (support both dateStart/dateEnd and dateFrom/dateTo)
        const dateStart = filters.dateStart || filters.dateFrom;
        const dateEnd = filters.dateEnd || filters.dateTo;

        if (dateStart) {
            const start = new Date(dateStart);
            start.setHours(0, 0, 0, 0);
            result = result.filter(t => new Date(`${t.date}T${t.time}`) >= start);
        }

        if (dateEnd) {
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59, 999);
            result = result.filter(t => new Date(`${t.date}T${t.time}`) <= end);
        }

        // Type
        if (filters.type && filters.type !== 'all') {
            result = result.filter(t => t.type === filters.type);
        }

        // Payment method (support both paymentMethods and paymentMethod)
        const paymentMethods = filters.paymentMethods || filters.paymentMethod || [];
        if (paymentMethods && paymentMethods.length > 0) {
            result = result.filter(t => paymentMethods.includes(t.paymentMethod));
        }

        // Categories
        if (filters.categories && filters.categories.length > 0) {
            result = result.filter(t => filters.categories.includes(t.categoryId));
        }

        // Status - ignore void by default
        if (filters.status && filters.status !== 'all') {
            result = result.filter(t => t.status === filters.status);
        } else {
            // Default: exclude void transactions
            result = result.filter(t => t.status !== 'void');
        }

        // Search in note, clientId, serviceName
        if (filters.search) {
            const term = filters.search.toLowerCase();
            result = result.filter(t => {
                const client = t.clientId ? (Clients.getById(t.clientId)?.name || '').toLowerCase() : '';
                const note = (t.note || '').toLowerCase();
                const service = (t.serviceName || '').toLowerCase();
                return client.includes(term) || note.includes(term) || service.includes(term);
            });
        }

        return result;
    },

    /**
     * Get summary for date range with filters
     */
    getRangeSummary(filters = {}) {
        const txs = this.getFilteredTransactions(filters);

        const incomeTotal = txs
            .filter(t => t.type === 'income' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenseTotal = txs
            .filter(t => t.type === 'expense' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

        const clientsSet = new Set();
        txs.forEach(t => {
            if (t.type === 'income' && t.clientId && t.status === 'confirmed') {
                clientsSet.add(t.clientId);
            }
        });

        // Cash vs Card
        const cashTotal = txs
            .filter(t => t.paymentMethod === 'cash' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

        const cardTotal = txs
            .filter(t => t.paymentMethod === 'card' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

        const transferTotal = txs
            .filter(t => t.paymentMethod === 'transfer' && t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            incomeTotal,
            expenseTotal,
            profit: incomeTotal - expenseTotal,
            txCount: txs.filter(t => t.status === 'confirmed').length,
            clientsServed: clientsSet.size,
            cashTotal,
            cardTotal,
            transferTotal,
            transactions: txs
        };
    },

    /**
     * Group transactions by day
     */
    groupByDay(transactions) {
        const grouped = {};

        transactions.forEach(tx => {
            if (!grouped[tx.date]) {
                grouped[tx.date] = {
                    date: tx.date,
                    incomeTotal: 0,
                    expenseTotal: 0,
                    transactions: []
                };
            }

            if (tx.type === 'income' && tx.status === 'confirmed') {
                grouped[tx.date].incomeTotal += tx.amount;
            } else if (tx.type === 'expense' && tx.status === 'confirmed') {
                grouped[tx.date].expenseTotal += tx.amount;
            }

            grouped[tx.date].transactions.push(tx);
        });

        return Object.values(grouped)
            .map(day => ({
                date: day.date,
                income: day.incomeTotal,
                expenses: day.expenseTotal,
                profit: day.incomeTotal - day.expenseTotal,
                txCount: day.transactions.length,
                transactions: day.transactions
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
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
        return category;
    },

    /**
     * Delete category
     */
    deleteCategory(categoryId) {
        const index = this.categories.findIndex(c => c.id === categoryId);
        if (index === -1) return { error: 'Category not found' };
        this.categories.splice(index, 1);
        this.saveCategories();
        return { success: true };
    },

    /**
     * Top categories by expense
     */
    getTopExpenseCategories(transactions, limit = 5) {
        const categoryMap = {};

        transactions
            .filter(t => t.type === 'expense' && t.status === 'confirmed')
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
                amount
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Top services by income
     */
    getTopServices(transactions, limit = 5) {
        const serviceMap = {};

        transactions
            .filter(t => t.type === 'income' && t.status === 'confirmed' && t.serviceName)
            .forEach(t => {
                if (!serviceMap[t.serviceName]) {
                    serviceMap[t.serviceName] = 0;
                }
                serviceMap[t.serviceName] += t.amount;
            });

        return Object.entries(serviceMap)
            .map(([name, amount]) => ({ serviceName: name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    },

    /**
     * Export to CSV
     */
    exportCsv(transactions, filename) {
        let csv = 'Data,Oră,Tip,Descriere,Categorie,Metodă Plată,Suma (RON),Status\n';

        transactions.forEach(tx => {
            const date = tx.date;
            const time = tx.time;
            const type = tx.type === 'income' ? 'VENIT' : 'CHELTUIALA';
            const client = tx.clientId ? (Clients.getById(tx.clientId)?.name || '') : '';
            const service = tx.serviceName || '';
            const description = (client + ' ' + service).trim();
            const category = this.getCategory(tx.categoryId)?.name || '-';
            const method = tx.paymentMethod;
            const amount = tx.amount.toFixed(2).replace('.', ',');
            const status = tx.status;

            csv += `"${date}","${time}","${type}","${description}","${category}","${method}","${amount}","${status}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename || 'accounting.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * ==================== AUTO-SYNC FUNCTIONS ====================
     */

    /**
     * Sync income from completed appointments
     * Called automatically whenever appointments change
     */
    syncIncomeFromAppointments() {
        console.log('[ACCOUNTING] Starting syncIncomeFromAppointments');
        const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        let syncCount = 0;

        appointments.forEach(appointment => {
            // Skip if appointment not completed
            if (appointment.status !== 'completed') return;

            // Skip if already paid (has isPaid flag and corresponding income transaction)
            const existingIncome = this.transactions.find(
                t => t.appointmentId === appointment.id && 
                     t.type === 'income' && 
                     t.status === 'confirmed'
            );

            if (existingIncome) {
                console.log(`[ACCOUNTING] Income already exists for appointment ${appointment.id}`);
                return;
            }

            // Create income transaction
            const incomeTransaction = {
                id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'income',
                date: appointment.dateTime.split('T')[0],
                time: appointment.dateTime.split('T')[1]?.substring(0, 5) || '12:00',
                amount: parseFloat(appointment.price) || 0,
                currency: 'RON',
                categoryId: null, // Income doesn't use categories
                clientId: appointment.clientId || null,
                appointmentId: appointment.id,
                serviceName: appointment.serviceName || 'Serviciu salon',
                paymentMethod: appointment.paymentMethod || 'cash',
                note: `Auto-sync din programare completată: ${appointment.serviceName || 'Serviciu'}`,
                status: 'confirmed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.transactions.push(incomeTransaction);
            syncCount++;
            console.log(`[ACCOUNTING] Created income from appointment ${appointment.id}:`, incomeTransaction.amount, 'RON');
        });

        if (syncCount > 0) {
            this.saveTransactions();
            console.log(`[ACCOUNTING] Synced ${syncCount} new income transactions from appointments`);
        }
    },

    /**
     * Sync expenses from daily expenses (if they exist in another storage key)
     * Called automatically from other modules
     */
    syncExpensesFromDailyExpenses() {
        console.log('[ACCOUNTING] Starting syncExpensesFromDailyExpenses');
        const dailyExpenses = JSON.parse(localStorage.getItem('dailyExpenses') || '[]');
        let syncCount = 0;

        dailyExpenses.forEach(dailyExpense => {
            // Check if expense transaction already exists with this source ID
            const existingExpense = this.transactions.find(
                t => t.sourceId === dailyExpense.id && 
                     t.type === 'expense' && 
                     t.status === 'confirmed'
            );

            if (existingExpense) {
                console.log(`[ACCOUNTING] Expense already synced from daily expense ${dailyExpense.id}`);
                return;
            }

            // Find expense category or use default
            const expenseCategory = this.categories.find(c => c.type === 'expense' && c.name === (dailyExpense.category || 'Diverse'));
            const categoryId = expenseCategory ? expenseCategory.id : null;

            // Create expense transaction
            const expenseTransaction = {
                id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'expense',
                date: (dailyExpense.date || new Date().toISOString().split('T')[0]),
                time: dailyExpense.time || '12:00',
                amount: parseFloat(dailyExpense.amount) || 0,
                currency: 'RON',
                categoryId: categoryId,
                clientId: null,
                appointmentId: null,
                serviceName: '',
                paymentMethod: dailyExpense.paymentMethod || 'cash',
                note: `Auto-sync din cheltuieli zilnice: ${dailyExpense.description || ''}`,
                status: 'confirmed',
                sourceId: dailyExpense.id, // Track source for deduplication
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.transactions.push(expenseTransaction);
            syncCount++;
            console.log(`[ACCOUNTING] Created expense from daily expense ${dailyExpense.id}:`, expenseTransaction.amount, 'RON');
        });

        if (syncCount > 0) {
            this.saveTransactions();
            console.log(`[ACCOUNTING] Synced ${syncCount} new expense transactions from daily expenses`);
        }
    },

    /**
     * Load or create recurring expenses structure
     */
    getRecurringExpenses() {
        const key = 'recurringExpenses';
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    /**
     * Save recurring expenses
     */
    saveRecurringExpenses(recurringExpenses) {
        localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpenses));
    },

    /**
     * Add recurring expense template
     */
    addRecurringExpense(name, amount, categoryName, paymentMethod, dayOfMonth = 1) {
        const recurringExpenses = this.getRecurringExpenses();
        
        const expenseCategory = this.categories.find(c => c.type === 'expense' && c.name === categoryName);
        const categoryId = expenseCategory ? expenseCategory.id : null;

        const recurring = {
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            amount: parseFloat(amount),
            category: categoryName,
            categoryId,
            paymentMethod,
            frequency: 'monthly',
            dayOfMonth: parseInt(dayOfMonth),
            active: true,
            createdAt: new Date().toISOString()
        };

        recurringExpenses.push(recurring);
        this.saveRecurringExpenses(recurringExpenses);
        return recurring;
    },

    /**
     * Generate monthly recurring expenses if they don't exist
     */
    syncRecurringExpensesForCurrentMonth() {
        console.log('[ACCOUNTING] Starting syncRecurringExpensesForCurrentMonth');
        const recurringExpenses = this.getRecurringExpenses();
        let syncCount = 0;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();

        recurringExpenses.forEach(recurring => {
            if (!recurring.active || recurring.frequency !== 'monthly') return;

            // Calculate actual day (handle month-end dates)
            const dayOfMonth = Math.min(recurring.dayOfMonth, lastDayOfMonth);
            const expectedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;

            // Check if expense already exists for this month
            const existingExpense = this.transactions.find(
                t => t.recurringExpenseId === recurring.id &&
                     t.date.substring(0, 7) === expectedDate.substring(0, 7) && // Same month
                     t.type === 'expense' &&
                     t.status === 'confirmed'
            );

            if (existingExpense) {
                console.log(`[ACCOUNTING] Recurring expense already synced for ${recurring.name} in ${expectedDate.substring(0, 7)}`);
                return;
            }

            // Only create if we haven't passed the day yet, or if today is on/after the day
            const expenseDay = new Date(`${expectedDate}T12:00:00`);
            if (expenseDay > today) {
                console.log(`[ACCOUNTING] Recurring expense ${recurring.name} not due yet (${expectedDate})`);
                return;
            }

            // Create recurring expense transaction
            const expenseTransaction = {
                id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'expense',
                date: expectedDate,
                time: '12:00',
                amount: recurring.amount,
                currency: 'RON',
                categoryId: recurring.categoryId,
                clientId: null,
                appointmentId: null,
                serviceName: '',
                paymentMethod: recurring.paymentMethod || 'cash',
                note: `Auto-sync recurență lunară: ${recurring.name}`,
                status: 'confirmed',
                recurringExpenseId: recurring.id, // Track source for deduplication
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.transactions.push(expenseTransaction);
            syncCount++;
            console.log(`[ACCOUNTING] Created recurring expense ${recurring.name}: ${expenseTransaction.amount} RON`);
        });

        if (syncCount > 0) {
            this.saveTransactions();
            console.log(`[ACCOUNTING] Synced ${syncCount} new recurring expense transactions`);
        }
    },

    /**
     * Full accounting sync - call this when data changes
     */
    fullSync() {
        console.log('[ACCOUNTING] === FULL ACCOUNTING SYNC START ===');
        this.syncIncomeFromAppointments();
        this.syncExpensesFromDailyExpenses();
        this.syncRecurringExpensesForCurrentMonth();
        console.log('[ACCOUNTING] === FULL ACCOUNTING SYNC COMPLETE ===');
    }
};

Accounting.init();
