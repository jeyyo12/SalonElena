/**
 * History/Reports Module
 * Handles data analysis, summaries, and exports for date ranges
 */

const History = {
    data: [],

    init() {
        this.data = Transactions.data || [];
    },

    /**
     * Get all transactions
     */
    getAll() {
        return this.data;
    },

    /**
     * Filter transactions by date range (inclusive: start 00:00 to end 23:59:59)
     */
    filterByDateRange(startDate, endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return this.data.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= start && txDate <= end;
        });
    },

    /**
     * Get summary for a date range: {incomeTotal, expenseTotal, profit, clientsServed, txCount}
     */
    getSummaryForRange(startDate, endDate) {
        const transactions = this.filterByDateRange(startDate, endDate);

        const incomeTotal = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const expenseTotal = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const clientsSet = new Set();
        transactions.forEach(tx => {
            if (tx.type === 'income' && tx.clientId) {
                clientsSet.add(tx.clientId);
            }
        });

        return {
            incomeTotal,
            expenseTotal,
            profit: incomeTotal - expenseTotal,
            clientsServed: clientsSet.size,
            txCount: transactions.length,
            transactions
        };
    },

    /**
     * Group transactions by day
     * Returns array of {date, income, expenses, profit, clients, txCount, transactions}
     */
    groupByDay(transactions) {
        const grouped = {};

        transactions.forEach(tx => {
            const dateStr = tx.date.split('T')[0];
            if (!grouped[dateStr]) {
                grouped[dateStr] = {
                    date: dateStr,
                    incomeTotal: 0,
                    expenseTotal: 0,
                    clientsSet: new Set(),
                    transactions: []
                };
            }

            if (tx.type === 'income') {
                grouped[dateStr].incomeTotal += tx.amount;
                if (tx.clientId) {
                    grouped[dateStr].clientsSet.add(tx.clientId);
                }
            } else if (tx.type === 'expense') {
                grouped[dateStr].expenseTotal += tx.amount;
            }

            grouped[dateStr].transactions.push(tx);
        });

        // Convert to array and calculate totals
        return Object.values(grouped)
            .map(day => ({
                date: day.date,
                income: day.incomeTotal,
                expenses: day.expenseTotal,
                profit: day.incomeTotal - day.expenseTotal,
                clients: day.clientsSet.size,
                txCount: day.transactions.length,
                transactions: day.transactions
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    /**
     * Get week range (Monday to Sunday)
     * Returns {startDate, endDate, weekStart, weekEnd}
     */
    getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return {
            startDate: monday,
            endDate: sunday,
            weekStart: monday.toISOString().split('T')[0],
            weekEnd: sunday.toISOString().split('T')[0]
        };
    },

    /**
     * Get week display string (e.g., "Dec 23 - Dec 29, 2024")
     */
    getWeekDisplayString(date) {
        const range = this.getWeekRange(date);
        const formatter = new Intl.DateTimeFormat('ro-RO', { month: 'short', day: 'numeric', year: 'numeric' });
        const start = formatter.format(new Date(range.weekStart));
        const end = formatter.format(new Date(range.weekEnd));
        return `${start} - ${end}`;
    },

    /**
     * Get month range
     * Returns {startDate, endDate}
     */
    getMonthRange(year, month) {
        const startDate = new Date(year, month, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        return {
            startDate,
            endDate,
            year,
            month
        };
    },

    /**
     * Get month display string
     */
    getMonthDisplayString(year, month) {
        const monthNames = [
            'Ianuarie', 'Februarie', 'Martie', 'Aprilie',
            'Mai', 'Iunie', 'Iulie', 'August',
            'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
        ];
        return `${monthNames[month]} ${year}`;
    },

    /**
     * Search transactions by term (client name or service name)
     */
    searchTransactions(transactions, searchTerm) {
        if (!searchTerm) return transactions;

        const term = searchTerm.toLowerCase();
        return transactions.filter(tx => {
            const clientName = tx.clientId ? (Clients.getById(tx.clientId)?.name || '').toLowerCase() : '';
            const serviceName = tx.serviceName ? tx.serviceName.toLowerCase() : '';
            const note = tx.note ? tx.note.toLowerCase() : '';

            return clientName.includes(term) || serviceName.includes(term) || note.includes(term);
        });
    },

    /**
     * Export transactions to CSV
     */
    exportToCSV(transactions, filename = 'transactions.csv') {
        let csv = 'Data,Tip,Descriere,Suma (RON)\n';

        transactions.forEach(tx => {
            const date = new Date(tx.date).toLocaleDateString('ro-RO');
            const type = tx.type === 'income' ? 'Venit' : 'Cheltuiala';
            let description = '';

            if (tx.type === 'income' && tx.clientId) {
                const client = Clients.getById(tx.clientId);
                description = `${client?.name || 'Unknown'} - ${tx.serviceName || 'Service'}`;
            } else if (tx.type === 'expense') {
                description = tx.note || 'Expense';
            }

            const amount = tx.amount.toFixed(2).replace('.', ',');
            csv += `"${date}","${type}","${description}","${amount}"\n`;
        });

        // Trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Auto-init when page loads
History.init();
