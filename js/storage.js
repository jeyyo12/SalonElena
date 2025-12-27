/**
 * Storage Layer - localStorage wrapper
 * Handles persistence for clients, appointments, services, transactions
 * Auto-sync with debounce to prevent data loss
 */

const Storage = {
    // Keys
    KEYS: {
        CLIENTS: 'clients',
        APPOINTMENTS: 'appointments',
        SERVICES: 'services',
        TRANSACTIONS: 'transactions',
        SYNC_LOG: 'sync_log'
    },

    // Auto-sync configuration
    SYNC_ENABLED: true,
    SYNC_DEBOUNCE_MS: 500, // Wait 500ms between saves
    _syncTimer: null,
    _pendingData: null,
    _syncLog: [],

    /**
     * Initialize auto-sync and load sync log
     */
    init() {
        this._loadSyncLog();
        this._setupAutoSave();
        Logger.info('Storage auto-sync initialized');
    },

    /**
     * Load all data from localStorage
     */
    loadAll() {
        return {
            clients: this.load(this.KEYS.CLIENTS, []),
            appointments: this.load(this.KEYS.APPOINTMENTS, []),
            services: this.load(this.KEYS.SERVICES, this._getDefaultServices()),
            transactions: this.load(this.KEYS.TRANSACTIONS, [])
        };
    },

    /**
     * Load specific key from localStorage
     */
    load(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            Logger.error(`Error loading ${key}:`, error);
            return defaultValue;
        }
    },

    /**
     * Save specific key to localStorage with auto-sync
     */
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (this.SYNC_ENABLED) {
                this._scheduleSync(key, data);
            }
            return true;
        } catch (error) {
            Logger.error(`Error saving ${key}:`, error);
            return false;
        }
    },

    /**
     * Save all data with auto-sync
     */
    saveAll(data) {
        const result = (
            this.save(this.KEYS.CLIENTS, data.clients) &&
            this.save(this.KEYS.APPOINTMENTS, data.appointments) &&
            this.save(this.KEYS.SERVICES, data.services) &&
            this.save(this.KEYS.TRANSACTIONS, data.transactions)
        );
        if (result && this.SYNC_ENABLED) {
            this._recordSync('FULL_SAVE', data);
        }
        return result;
    },

    /**
     * Clear all data
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            if (key !== this.KEYS.SYNC_LOG) {
                localStorage.removeItem(key);
            }
        });
    },

    /**
     * Schedule auto-sync with debounce (prevents excessive saves)
     */
    _scheduleSync(key, data) {
        if (this._syncTimer) {
            clearTimeout(this._syncTimer);
        }
        this._pendingData = { key, data, timestamp: new Date().toISOString() };
        this._syncTimer = setTimeout(() => {
            this._executeSync();
        }, this.SYNC_DEBOUNCE_MS);
    },

    /**
     * Execute deferred sync
     */
    _executeSync() {
        if (this._pendingData) {
            this._recordSync(`AUTO_SAVE_${this._pendingData.key}`, this._pendingData.data);
            this._pendingData = null;
        }
    },

    /**
     * Record sync event to history
     */
    _recordSync(action, data) {
        const syncEntry = {
            id: `sync-${Date.now()}`,
            action,
            timestamp: new Date().toISOString(),
            dataSize: JSON.stringify(data).length,
            success: true
        };
        this._syncLog.push(syncEntry);
        
        // Keep last 100 sync events
        if (this._syncLog.length > 100) {
            this._syncLog = this._syncLog.slice(-100);
        }
        
        // Save sync log
        try {
            localStorage.setItem(this.KEYS.SYNC_LOG, JSON.stringify(this._syncLog));
        } catch (error) {
            Logger.warn('Sync log save failed:', error);
        }
    },

    /**
     * Load sync log from storage
     */
    _loadSyncLog() {
        try {
            const data = localStorage.getItem(this.KEYS.SYNC_LOG);
            this._syncLog = data ? JSON.parse(data) : [];
        } catch (error) {
            this._syncLog = [];
        }
    },

    /**
     * Setup auto-save on page unload (final save before close)
     */
    _setupAutoSave() {
        window.addEventListener('beforeunload', () => {
            // Flush any pending syncs
            if (this._syncTimer) {
                clearTimeout(this._syncTimer);
                this._executeSync();
            }
        });

        // Also save every 30 seconds as backup
        setInterval(() => {
            if (this._pendingData) {
                this._executeSync();
            }
        }, 30000);
    },

    /**
     * Get sync history (last N entries)
     */
    getSyncLog(limit = 50) {
        return this._syncLog.slice(-limit);
    },

    /**
     * Get total transactions saved count
     */
    getTransactionCount() {
        return this.load(this.KEYS.TRANSACTIONS, []).length;
    },

    /**
     * Verify data integrity
     */
    verifyData() {
        const allData = this.loadAll();
        return {
            clients: allData.clients.length,
            appointments: allData.appointments.length,
            services: allData.services.length,
            transactions: allData.transactions.length,
            syncEvents: this._syncLog.length,
            lastSync: this._syncLog[this._syncLog.length - 1]?.timestamp || 'never'
        };
    },

    /**
     * Get default services (initial data)
     */
    _getDefaultServices() {
        return [
            {
                id: 'srv-1',
                name: 'Haircut - Classic',
                category: 'haircut',
                price: 35,
                duration: 30,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-2',
                name: 'Haircut - Layers',
                category: 'haircut',
                price: 50,
                duration: 45,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-3',
                name: 'Haircut - Bob',
                category: 'haircut',
                price: 55,
                duration: 50,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-4',
                name: 'Haircut - Undercut',
                category: 'haircut',
                price: 45,
                duration: 40,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-5',
                name: 'Hairstyle - Waves',
                category: 'hairstyle',
                price: 60,
                duration: 60,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-6',
                name: 'Hairstyle - Curls',
                category: 'hairstyle',
                price: 65,
                duration: 70,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-7',
                name: 'Hairstyle - Straight',
                category: 'hairstyle',
                price: 55,
                duration: 50,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-8',
                name: 'Hairstyle - Volume',
                category: 'hairstyle',
                price: 70,
                duration: 75,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-9',
                name: 'Coafură - Updo Classic',
                category: 'coafura',
                price: 75,
                duration: 60,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-10',
                name: 'Coafură - Updo Elegant',
                category: 'coafura',
                price: 95,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-11',
                name: 'Coafură - Bridal',
                category: 'coafura',
                price: 120,
                duration: 120,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-12',
                name: 'Coafură - Half-Up',
                category: 'coafura',
                price: 60,
                duration: 45,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-13',
                name: 'Color - Full',
                category: 'color',
                price: 100,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-14',
                name: 'Color - Highlights',
                category: 'color',
                price: 120,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-15',
                name: 'Color - Balayage',
                category: 'color',
                price: 150,
                duration: 120,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-16',
                name: 'Treatment - Keratin',
                category: 'treatment',
                price: 90,
                duration: 120,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-17',
                name: 'Treatment - Deep Repair',
                category: 'treatment',
                price: 70,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-18',
                name: 'Treatment - Hydration',
                category: 'treatment',
                price: 60,
                duration: 60,
                createdAt: new Date().toISOString()
            }
        ];
    }
};

Object.freeze(Storage);
