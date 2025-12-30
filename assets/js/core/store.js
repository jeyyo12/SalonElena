/**
 * Store - localStorage wrapper with seed data
 */
const Store = {
    PREFIX: 'salon:',

    load(key) {
        try {
            const stored = localStorage.getItem(this.PREFIX + key);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    save(key, data) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(data));
        } catch (e) {
            console.error('Store save error:', e);
        }
    },

    getSetting(key, defaultValue = null) {
        const settings = this.load('settings') || {};
        return settings[key] !== undefined ? settings[key] : defaultValue;
    },

    setSetting(key, value) {
        const settings = this.load('settings') || {};
        settings[key] = value;
        this.save('settings', settings);
    },

    getRoute() {
        return this.getSetting('route', 'dashboard');
    },

    saveRoute(route) {
        this.setSetting('route', route);
    },

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    initializeIfEmpty() {
        // Initialize settings
        if (!this.load('settings')) {
            this.save('settings', {
                salonName: 'Salon Elena',
                currency: 'RON',
                route: 'dashboard'
            });
        }

        // Initialize services
        if (!this.load('services')) {
            const services = [
                { id: this.generateId(), name: 'Tăiere Păr - Femei', category: 'Coafură', durationMin: 45, price: 45 },
                { id: this.generateId(), name: 'Tăiere Păr - Bărbați', category: 'Coafură', durationMin: 30, price: 30 },
                { id: this.generateId(), name: 'Vopsire Completă', category: 'Vopsit', durationMin: 120, price: 150 },
                { id: this.generateId(), name: 'Balayage/Highlights', category: 'Vopsit', durationMin: 90, price: 120 },
                { id: this.generateId(), name: 'Tratament Keratină', category: 'Tratament', durationMin: 60, price: 100 },
                { id: this.generateId(), name: 'Ondul Permanent', category: 'Ondulare', durationMin: 120, price: 110 },
                { id: this.generateId(), name: 'Coafare Eveniment', category: 'Coafură', durationMin: 60, price: 80 },
                { id: this.generateId(), name: 'Manichiură', category: 'Alte', durationMin: 30, price: 35 }
            ];
            this.save('services', services);
        }

        // Initialize appointments (today + some past days)
        if (!this.load('appointments')) {
            const today = this.getToday();
            const appointments = [
                {
                    id: this.generateId(),
                    date: today,
                    time: '09:00',
                    customerName: 'Adela Popescu',
                    customerPhone: '0724123456',
                    serviceId: 'id_service_1',
                    serviceNameSnapshot: 'Tăiere Păr - Femei',
                    durationMinSnapshot: 45,
                    priceSnapshot: 45,
                    status: 'done',
                    paid: true,
                    paymentMethod: 'cash',
                    notes: ''
                },
                {
                    id: this.generateId(),
                    date: today,
                    time: '10:00',
                    customerName: 'Maria Ionescu',
                    customerPhone: '0723456789',
                    serviceId: 'id_service_3',
                    serviceNameSnapshot: 'Vopsire Completă',
                    durationMinSnapshot: 120,
                    priceSnapshot: 150,
                    status: 'done',
                    paid: true,
                    paymentMethod: 'card',
                    notes: ''
                },
                {
                    id: this.generateId(),
                    date: today,
                    time: '12:00',
                    customerName: 'Elena Vasilescu',
                    customerPhone: '0722111222',
                    serviceId: 'id_service_1',
                    serviceNameSnapshot: 'Tăiere Păr - Femei',
                    durationMinSnapshot: 45,
                    priceSnapshot: 45,
                    status: 'done',
                    paid: false,
                    paymentMethod: null,
                    notes: 'Plata la următoarea vizită'
                },
                {
                    id: this.generateId(),
                    date: today,
                    time: '14:00',
                    customerName: 'Cristina Petrescu',
                    customerPhone: '0721333444',
                    serviceId: 'id_service_4',
                    serviceNameSnapshot: 'Balayage/Highlights',
                    durationMinSnapshot: 90,
                    priceSnapshot: 120,
                    status: 'scheduled',
                    paid: false,
                    paymentMethod: null,
                    notes: ''
                },
                {
                    id: this.generateId(),
                    date: today,
                    time: '16:00',
                    customerName: 'Roxana Mihai',
                    customerPhone: '0720555666',
                    serviceId: 'id_service_5',
                    serviceNameSnapshot: 'Tratament Keratină',
                    durationMinSnapshot: 60,
                    priceSnapshot: 100,
                    status: 'scheduled',
                    paid: true,
                    paymentMethod: 'transfer',
                    notes: 'Platit în avans'
                }
            ];
            this.save('appointments', appointments);
        }

        // Initialize expenses
        if (!this.load('expenses')) {
            const today = this.getToday();
            const monthStart = today.substring(0, 7); // YYYY-MM
            const expenses = [
                {
                    id: this.generateId(),
                    date: monthStart + '-01',
                    category: 'rent',
                    vendor: 'Proprietar Spațiu',
                    amount: 800,
                    notes: 'Chirie lunară'
                },
                {
                    id: this.generateId(),
                    date: monthStart + '-05',
                    category: 'products',
                    vendor: 'Salon Supply',
                    amount: 250,
                    notes: 'Vopsea, șampon, produse coafură'
                },
                {
                    id: this.generateId(),
                    date: monthStart + '-10',
                    category: 'utilities',
                    vendor: 'Enel',
                    amount: 120,
                    notes: 'Factură electricitate'
                },
                {
                    id: this.generateId(),
                    date: monthStart + '-12',
                    category: 'marketing',
                    vendor: 'Facebook Ads',
                    amount: 100,
                    notes: 'Publicitate online'
                },
                {
                    id: this.generateId(),
                    date: monthStart + '-15',
                    category: 'products',
                    vendor: 'Distribuitor Cosmetice',
                    amount: 180,
                    notes: 'Măști, tratamente, seruri'
                },
                {
                    id: this.generateId(),
                    date: monthStart + '-20',
                    category: 'utilities',
                    vendor: 'Apa & Canal',
                    amount: 60,
                    notes: 'Factură apă'
                }
            ];
            this.save('expenses', expenses);
        }
    },

    getToday() {
        const date = new Date();
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    },

    clearAll() {
        const keys = ['settings', 'services', 'appointments', 'expenses'];
        keys.forEach(key => localStorage.removeItem(this.PREFIX + key));
        this.initializeIfEmpty();
    }
};

export default Store;
