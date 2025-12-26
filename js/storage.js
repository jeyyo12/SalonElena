/**
 * Storage Layer - localStorage wrapper
 * Handles persistence for clients, appointments, services, transactions
 */

const Storage = {
    // Keys
    KEYS: {
        CLIENTS: 'clients',
        APPOINTMENTS: 'appointments',
        SERVICES: 'services',
        TRANSACTIONS: 'transactions'
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
     * Save specific key to localStorage
     */
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            Logger.error(`Error saving ${key}:`, error);
            return false;
        }
    },

    /**
     * Save all data
     */
    saveAll(data) {
        return (
            this.save(this.KEYS.CLIENTS, data.clients) &&
            this.save(this.KEYS.APPOINTMENTS, data.appointments) &&
            this.save(this.KEYS.SERVICES, data.services) &&
            this.save(this.KEYS.TRANSACTIONS, data.transactions)
        );
    },

    /**
     * Clear all data
     */
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },

    /**
     * Get default services (initial data)
     */
    _getDefaultServices() {
        return [
            {
                id: 'srv-1',
                name: 'Tuns Vârfuri',
                category: 'tuns',
                price: 30,
                duration: 30,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-2',
                name: 'Tuns Bob',
                category: 'tuns',
                price: 60,
                duration: 60,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-3',
                name: 'Tuns în Scări',
                category: 'tuns',
                price: 80,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-4',
                name: 'Coafat Bucle',
                category: 'coafat',
                price: 50,
                duration: 60,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-5',
                name: 'Coafat Întins',
                category: 'coafat',
                price: 45,
                duration: 45,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-6',
                name: 'Updo',
                category: 'coafat',
                price: 70,
                duration: 75,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-7',
                name: 'Balayage',
                category: 'vopsit',
                price: 150,
                duration: 120,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-8',
                name: 'Highlights',
                category: 'vopsit',
                price: 120,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-9',
                name: 'Colorare Completă',
                category: 'vopsit',
                price: 100,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-10',
                name: 'Tratament Keratin',
                category: 'tratament',
                price: 90,
                duration: 120,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-11',
                name: 'Tratament Reparare',
                category: 'tratament',
                price: 70,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-12',
                name: 'Tratament Hidratare',
                category: 'tratament',
                price: 60,
                duration: 60,
                createdAt: new Date().toISOString()
            },
            {
                id: 'srv-13',
                name: 'Tuns Barbati',
                category: 'tuns-barbati',
                price: 25,
                duration: 20,
                createdAt: new Date().toISOString()
            }
        ];
    }
};

Object.freeze(Storage);
