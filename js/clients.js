/**
 * Clients Module - CRUD with auto-tagging and photo gallery
 */

const Clients = {
    data: [],

    /**
     * Initialize clients
     */
    init() {
        this.data = Storage.load(Storage.KEYS.CLIENTS, []);
    },

    /**
     * Get all clients
     */
    getAll() {
        return [...this.data];
    },

    /**
     * Get client by ID
     */
    getById(id) {
        return this.data.find(c => c.id === id);
    },

    /**
     * Calculate automatic status/tag
     * Priority: Platinum > VIP > Loyal > New > Standard
     */
    calculateTag(visits, totalSpent) {
        if (visits >= 16 || totalSpent >= 900) return 'platinum';
        if (visits >= 10 || totalSpent >= 600) return 'vip';
        if (visits >= 5 || totalSpent >= 300) return 'loyal';
        if (visits >= 1) return 'new';
        return 'standard';
    },

    /**
     * Create client
     */
    create(name, phone, email = '', notes = '') {
        // Validate phone is unique
        if (this.data.some(c => c.phone === phone)) {
            return { error: 'Telefon deja există' };
        }

        const client = {
            id: `cli-${Date.now()}`,
            name,
            phone,
            email,
            notes,
            visits: 0,
            totalSpent: 0,
            lastVisitAt: null,
            tag: 'standard',
            photos: [],
            mainPhotoId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.push(client);
        this.save();
        return client;
    },

    /**
     * Update client
     */
    update(id, name, phone, email = '', notes = '') {
        const client = this.data.find(c => c.id === id);
        if (!client) return null;

        // Check phone uniqueness (excluding self)
        if (phone !== client.phone && this.data.some(c => c.phone === phone && c.id !== id)) {
            return { error: 'Telefon deja există' };
        }

        client.name = name;
        client.phone = phone;
        client.email = email;
        client.notes = notes;
        client.updatedAt = new Date().toISOString();

        this.save();
        return client;
    },

    /**
     * Delete client
     */
    delete(id) {
        const index = this.data.findIndex(c => c.id === id);
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.save();
        return true;
    },

    /**
     * Update client statistics and auto-tag
     */
    updateStats(clientId, visits = null, totalSpent = null, lastVisitAt = null) {
        const client = this.data.find(c => c.id === clientId);
        if (!client) return null;

        if (visits !== null) client.visits = visits;
        if (totalSpent !== null) client.totalSpent = totalSpent;
        if (lastVisitAt !== null) client.lastVisitAt = lastVisitAt;

        // Recalculate tag
        client.tag = this.calculateTag(client.visits, client.totalSpent);
        client.updatedAt = new Date().toISOString();

        this.save();
        return client;
    },

    /**
     * Add photo to client
     */
    addPhoto(clientId, photoData) {
        const client = this.data.find(c => c.id === clientId);
        if (!client) return null;

        const photo = {
            id: `photo-${Date.now()}`,
            data: photoData, // Base64
            uploadedAt: new Date().toISOString()
        };

        if (!client.photos) client.photos = [];
        client.photos.push(photo);

        // Set as main if first photo
        if (client.photos.length === 1) {
            client.mainPhotoId = photo.id;
        }

        this.save();
        return photo;
    },

    /**
     * Remove photo from client
     */
    removePhoto(clientId, photoId) {
        const client = this.data.find(c => c.id === clientId);
        if (!client) return false;

        const index = client.photos.findIndex(p => p.id === photoId);
        if (index === -1) return false;

        client.photos.splice(index, 1);

        // If removed photo was main, set new main
        if (client.mainPhotoId === photoId) {
            client.mainPhotoId = client.photos.length > 0 ? client.photos[0].id : null;
        }

        this.save();
        return true;
    },

    /**
     * Set main photo
     */
    setMainPhoto(clientId, photoId) {
        const client = this.data.find(c => c.id === clientId);
        if (!client) return false;

        const photo = client.photos.find(p => p.id === photoId);
        if (!photo) return false;

        client.mainPhotoId = photoId;
        this.save();
        return true;
    },

    /**
     * Get main photo
     */
    getMainPhoto(clientId) {
        const client = this.data.find(c => c.id === clientId);
        if (!client || !client.mainPhotoId) return null;

        return client.photos.find(p => p.id === client.mainPhotoId);
    },

    /**
     * Filter clients
     */
    filter(tag = 'all', searchTerm = '') {
        let filtered = [...this.data];

        // Filter by tag
        if (tag && tag !== 'all') {
            filtered = filtered.filter(c => c.tag === tag);
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(term) ||
                c.phone.includes(term) ||
                (c.email && c.email.toLowerCase().includes(term))
            );
        }

        return filtered;
    },

    /**
     * Sort clients (VIP & top spenders first)
     */
    sortByPriority(clients = null) {
        const list = clients || this.data;
        return [...list].sort((a, b) => {
            // Priority order: platinum, vip, loyal, new, standard
            const tagOrder = { platinum: 0, vip: 1, loyal: 2, new: 3, standard: 4 };
            const tagDiff = (tagOrder[a.tag] || 5) - (tagOrder[b.tag] || 5);
            if (tagDiff !== 0) return tagDiff;

            // Then by total spent (descending)
            if (a.totalSpent !== b.totalSpent) {
                return b.totalSpent - a.totalSpent;
            }

            // Then by visits (descending)
            return b.visits - a.visits;
        });
    },

    /**
     * Save to storage
     */
    save() {
        Storage.save(Storage.KEYS.CLIENTS, this.data);
    }
};
