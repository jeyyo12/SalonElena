/**
 * Services Module - CRUD operations for services
 */

const Services = {
    data: [],

    /**
     * Initialize services
     */
    init() {
        this.data = Storage.load(Storage.KEYS.SERVICES, Storage._getDefaultServices());
    },

    /**
     * Get all services
     */
    getAll() {
        return [...this.data];
    },

    /**
     * Get service by ID
     */
    getById(id) {
        return this.data.find(s => s.id === id);
    },

    /**
     * Create service
     */
    create(name, category, price, duration) {
        const service = {
            id: `srv-${Date.now()}`,
            name,
            category,
            price: parseFloat(price),
            duration: parseInt(duration),
            createdAt: new Date().toISOString()
        };

        this.data.push(service);
        this.save();
        return service;
    },

    /**
     * Update service
     */
    update(id, name, category, price, duration) {
        const service = this.data.find(s => s.id === id);
        if (!service) return null;

        service.name = name;
        service.category = category;
        service.price = parseFloat(price);
        service.duration = parseInt(duration);
        service.updatedAt = new Date().toISOString();

        this.save();
        return service;
    },

    /**
     * Delete service
     */
    delete(id) {
        const index = this.data.findIndex(s => s.id === id);
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.save();
        return true;
    },

    /**
     * Delete service by name (cleanup function)
     */
    deleteByName(name) {
        const initialLength = this.data.length;
        this.data = this.data.filter(s => s.name !== name);
        if (this.data.length < initialLength) {
            this.save();
            return true;
        }
        return false;
    },

    /**
     * Get services by category
     */
    getByCategory(category) {
        return this.data.filter(s => s.category === category);
    },

    /**
     * Save to storage
     */
    save() {
        Storage.save(Storage.KEYS.SERVICES, this.data);
    }
};
