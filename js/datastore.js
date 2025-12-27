/**
 * DataStore - Central Single Source of Truth
 * Handles all data operations with automatic sync and event propagation
 * Prevents duplicate transactions, maintains referential integrity
 */

const DataStore = {
    // Data cache
    _data: {
        clients: [],
        appointments: [],
        services: [],
        transactions: []
    },

    // Event listeners registry
    _listeners: [],

    /**
     * Initialize DataStore and load all data from Storage
     */
    init() {
        this.reload();
        Logger.log('[DataStore INIT] Central data store initialized');
    },

    /**
     * Reload all data from Storage
     */
    reload() {
        this._data = Storage.loadAll();
        Logger.log('[DataStore RELOAD] Data reloaded from storage');
    },

    /**
     * Get all data
     */
    getAll() {
        return JSON.parse(JSON.stringify(this._data));
    },

    // ===== CLIENTS =====

    /**
     * Get all clients
     */
    getClients() {
        return JSON.parse(JSON.stringify(this._data.clients));
    },

    /**
     * Get single client
     */
    getClient(clientId) {
        return JSON.parse(JSON.stringify(this._data.clients.find(c => c.id === clientId)));
    },

    /**
     * Get clients with stats recalculated
     */
    getClientsWithStats() {
        return this._data.clients.map(client => {
            const clientTransactions = this._data.transactions.filter(t =>
                t.clientId === client.id && (t.status === 'confirmed' || !t.status) && t.type === 'income'
            );
            const updatedClient = { ...client };
            updatedClient.totalSpent = clientTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            updatedClient.tag = Clients.calculateTag(client.visits || 0, updatedClient.totalSpent);
            return updatedClient;
        });
    },

    /**
     * Save or update client
     */
    saveClient(client) {
        const index = this._data.clients.findIndex(c => c.id === client.id);
        if (index >= 0) {
            this._data.clients[index] = { ...this._data.clients[index], ...client };
        } else {
            this._data.clients.push(client);
        }
        Storage.save(Storage.KEYS.CLIENTS, this._data.clients);
        this._emitChange('client:saved', { clientId: client.id });
    },

    /**
     * Delete client (soft delete)
     */
    deleteClient(clientId) {
        const index = this._data.clients.findIndex(c => c.id === clientId);
        if (index >= 0) {
            this._data.clients[index].deleted = true;
            this._data.clients[index].deletedAt = new Date().toISOString();
            Storage.save(Storage.KEYS.CLIENTS, this._data.clients);
            this._emitChange('client:deleted', { clientId });
            return true;
        }
        return false;
    },

    // ===== APPOINTMENTS =====

    /**
     * Get all appointments
     */
    getAppointments() {
        return JSON.parse(JSON.stringify(this._data.appointments));
    },

    /**
     * Get single appointment
     */
    getAppointment(appointmentId) {
        return JSON.parse(JSON.stringify(this._data.appointments.find(a => a.id === appointmentId)));
    },

    /**
     * Save or update appointment
     */
    saveAppointment(appointment) {
        const index = this._data.appointments.findIndex(a => a.id === appointment.id);
        if (index >= 0) {
            this._data.appointments[index] = { ...this._data.appointments[index], ...appointment };
        } else {
            this._data.appointments.push(appointment);
        }
        Storage.save(Storage.KEYS.APPOINTMENTS, this._data.appointments);
        this._emitChange('appointment:saved', { appointmentId: appointment.id });
    },

    /**
     * Delete appointment (soft delete)
     */
    deleteAppointment(appointmentId) {
        const index = this._data.appointments.findIndex(a => a.id === appointmentId);
        if (index >= 0) {
            this._data.appointments[index].status = 'canceled';
            this._data.appointments[index].canceledAt = new Date().toISOString();
            Storage.save(Storage.KEYS.APPOINTMENTS, this._data.appointments);
            this._emitChange('appointment:deleted', { appointmentId });
            return true;
        }
        return false;
    },

    // ===== SERVICES =====

    /**
     * Get all services
     */
    getServices() {
        return JSON.parse(JSON.stringify(this._data.services));
    },

    /**
     * Save or update service
     */
    saveService(service) {
        const index = this._data.services.findIndex(s => s.id === service.id);
        if (index >= 0) {
            this._data.services[index] = { ...this._data.services[index], ...service };
        } else {
            this._data.services.push(service);
        }
        Storage.save(Storage.KEYS.SERVICES, this._data.services);
        this._emitChange('service:saved', { serviceId: service.id });
    },

    /**
     * Delete service
     */
    deleteService(serviceId) {
        const index = this._data.services.findIndex(s => s.id === serviceId);
        if (index >= 0) {
            this._data.services.splice(index, 1);
            Storage.save(Storage.KEYS.SERVICES, this._data.services);
            this._emitChange('service:deleted', { serviceId });
            return true;
        }
        return false;
    },

    // ===== TRANSACTIONS =====

    /**
     * Get all transactions
     */
    getTransactions() {
        return JSON.parse(JSON.stringify(this._data.transactions));
    },

    /**
     * Get active transactions (non-void)
     */
    getActiveTransactions() {
        return this._data.transactions
            .filter(t => t.status !== 'void')
            .map(t => JSON.parse(JSON.stringify(t)));
    },

    /**
     * Get single transaction
     */
    getTransaction(transactionId) {
        return JSON.parse(JSON.stringify(this._data.transactions.find(t => t.id === transactionId)));
    },

    /**
     * Get transactions by client
     */
    getTransactionsByClient(clientId) {
        return this._data.transactions
            .filter(t => t.clientId === clientId && t.status !== 'void')
            .map(t => JSON.parse(JSON.stringify(t)));
    },

    /**
     * Create or update transaction (prevents duplicates)
     */
    createOrUpdateTransaction(transaction) {
        // Check for existing transaction with same appointmentId + income
        if (transaction.appointmentId && transaction.type === 'income') {
            const existing = this._data.transactions.find(t =>
                t.appointmentId === transaction.appointmentId &&
                t.type === 'income' &&
                t.status !== 'void'
            );

            if (existing) {
                // Update existing
                Object.assign(existing, transaction);
                existing.updatedAt = new Date().toISOString();
                Storage.save(Storage.KEYS.TRANSACTIONS, this._data.transactions);
                this._emitChange('transaction:updated', { transactionId: existing.id });
                Logger.log(`[DataStore] Transaction updated: ${existing.id}`);
                return existing.id;
            }
        }

        // Create new
        const index = this._data.transactions.findIndex(t => t.id === transaction.id);
        if (index >= 0) {
            this._data.transactions[index] = { ...this._data.transactions[index], ...transaction };
        } else {
            this._data.transactions.push(transaction);
        }
        Storage.save(Storage.KEYS.TRANSACTIONS, this._data.transactions);
        this._emitChange('transaction:created', { transactionId: transaction.id });
        Logger.log(`[DataStore] Transaction created: ${transaction.id}`);
        return transaction.id;
    },

    /**
     * Delete transaction (mark as void)
     */
    deleteTransaction(transactionId) {
        const transaction = this._data.transactions.find(t => t.id === transactionId);
        if (!transaction) return false;

        transaction.status = 'void';
        transaction.updatedAt = new Date().toISOString();
        Storage.save(Storage.KEYS.TRANSACTIONS, this._data.transactions);

        // Recalculate affected client stats
        if (transaction.clientId) {
            this._recalculateClientStats(transaction.clientId);
        }

        this._emitChange('transaction:deleted', { transactionId });
        Logger.log(`[DataStore] Transaction voided: ${transactionId}`);
        return true;
    },

    /**
     * Recalculate client stats from source data
     */
    _recalculateClientStats(clientId) {
        const client = this._data.clients.find(c => c.id === clientId);
        if (!client) return;

        // Count completed appointments
        const completedAppointments = this._data.appointments.filter(a =>
            a.clientId === clientId && a.status === 'completed'
        );
        client.visits = completedAppointments.length;

        // Sum income transactions
        const incomeTransactions = this._data.transactions.filter(t =>
            t.clientId === clientId &&
            t.type === 'income' &&
            (t.status === 'confirmed' || !t.status) &&
            t.status !== 'void'
        );
        client.totalSpent = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        // Recalculate tag
        client.tag = Clients.calculateTag(client.visits, client.totalSpent);
        client.updatedAt = new Date().toISOString();

        Storage.save(Storage.KEYS.CLIENTS, this._data.clients);
        Logger.log(`[DataStore] Client stats recalculated: ${clientId} (visits: ${client.visits}, totalSpent: ${client.totalSpent})`);
    },

    /**
     * Recalculate all data (full sync)
     */
    recalculateAll() {
        // Update client stats for all clients
        this._data.clients.forEach(client => {
            const completedAppointments = this._data.appointments.filter(a =>
                a.clientId === client.id && a.status === 'completed'
            );
            client.visits = completedAppointments.length;

            const incomeTransactions = this._data.transactions.filter(t =>
                t.clientId === client.id &&
                t.type === 'income' &&
                (t.status === 'confirmed' || !t.status) &&
                t.status !== 'void'
            );
            client.totalSpent = incomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
            client.tag = Clients.calculateTag(client.visits, client.totalSpent);
            client.updatedAt = new Date().toISOString();
        });

        Storage.save(Storage.KEYS.CLIENTS, this._data.clients);
        this._emitChange('data:recalculated', { reason: 'full-sync' });
        Logger.log('[DataStore] Full data recalculation complete');
    },

    /**
     * Handle storage event from other tabs
     */
    onStorageChange(event) {
        if (event.key === Storage.KEYS.CLIENTS ||
            event.key === Storage.KEYS.APPOINTMENTS ||
            event.key === Storage.KEYS.SERVICES ||
            event.key === Storage.KEYS.TRANSACTIONS) {
            this.reload();
            this._emitChange('storage:synced', { storageKey: event.key });
            Logger.log(`[DataStore STORAGE SYNC] ${event.key} synced from other tab`);
        }
    },

    /**
     * Register change listener
     */
    onChange(callback) {
        this._listeners.push(callback);
    },

    /**
     * Emit change event to all listeners
     */
    _emitChange(reason, detail = {}) {
        // Emit custom event
        window.dispatchEvent(new CustomEvent('data:changed', {
            detail: {
                reason,
                ...detail,
                timestamp: new Date().toISOString()
            }
        }));

        // Call registered listeners
        this._listeners.forEach(cb => {
            try {
                cb({ reason, ...detail });
            } catch (err) {
                Logger.error('[DataStore] Listener error:', err);
            }
        });
    }
};

// Auto-initialize DataStore when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DataStore.init();
    });
} else {
    DataStore.init();
}

// Listen for storage events from other tabs
window.addEventListener('storage', (event) => {
    DataStore.onStorageChange(event);
});
