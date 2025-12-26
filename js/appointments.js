/**
 * Appointments Module - CRUD with conflict prevention
 */

const Appointments = {
    data: [],

    /**
     * Initialize appointments
     */
    init() {
        this.data = Storage.load(Storage.KEYS.APPOINTMENTS, []);
    },

    /**
     * Get all appointments
     */
    getAll() {
        return [...this.data];
    },

    /**
     * Get appointment by ID
     */
    getById(id) {
        return this.data.find(a => a.id === id);
    },

    /**
     * Convert time string (HH:MM) to minutes since midnight
     */
    _timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    },

    /**
     * Check if two appointments conflict
     * Returns true if they overlap
     */
    _checkConflict(start1, duration1, start2, duration2) {
        const end1 = start1 + duration1;
        const end2 = start2 + duration2;
        
        // No conflict if one ends before other starts
        return !(end1 <= start2 || end2 <= start1);
    },

    /**
     * Check for scheduling conflicts
     */
    checkConflict(dateStr, timeStr, duration) {
        const startMinutes = this._timeToMinutes(timeStr);

        // Find appointments on same day
        const sameDay = this.data.filter(a => {
            const aDate = a.date.split('T')[0];
            const checkDate = dateStr.split('T')[0];
            return aDate === checkDate && a.status !== 'cancelled';
        });

        // Check if any overlap
        for (const appt of sameDay) {
            const apptStart = this._timeToMinutes(appt.time);
            const apptDuration = appt.duration || 60;

            if (this._checkConflict(startMinutes, duration, apptStart, apptDuration)) {
                return true; // Conflict found
            }
        }

        return false; // No conflict
    },

    /**
     * Create appointment
     */
    create(clientId, serviceId, dateStr, timeStr, duration, notes = '', status = 'scheduled') {
        // Check for conflicts
        if (status === 'scheduled' && this.checkConflict(dateStr, timeStr, duration)) {
            return { error: 'Interval deja ocupat' };
        }

        const appointment = {
            id: `appt-${Date.now()}`,
            clientId,
            serviceId,
            date: new Date(dateStr).toISOString(),
            time: timeStr,
            duration: parseInt(duration) || 60,
            notes,
            status, // scheduled, completed, cancelled
            isPaid: false,
            paymentAmount: 0,
            paymentMethod: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.data.push(appointment);
        this.save();
        return appointment;
    },

    /**
     * Update appointment
     */
    update(id, clientId, serviceId, dateStr, timeStr, duration, notes = '', status = 'scheduled') {
        const appt = this.data.find(a => a.id === id);
        if (!appt) return null;

        // Check conflict (excluding self)
        const tempTime = this._timeToMinutes(timeStr);
        const originalTime = this._timeToMinutes(appt.time);
        const originalDate = appt.date.split('T')[0];
        const newDate = dateStr.split('T')[0];
        
        if ((newDate !== originalDate || timeStr !== appt.time) && status === 'scheduled') {
            if (this.checkConflict(dateStr, timeStr, duration)) {
                return { error: 'Interval deja ocupat' };
            }
        }

        appt.clientId = clientId;
        appt.serviceId = serviceId;
        appt.date = new Date(dateStr).toISOString();
        appt.time = timeStr;
        appt.duration = parseInt(duration) || 60;
        appt.notes = notes;
        appt.status = status;
        appt.updatedAt = new Date().toISOString();

        this.save();
        return appt;
    },

    /**
     * Delete appointment
     */
    delete(id) {
        const index = this.data.findIndex(a => a.id === id);
        if (index === -1) return false;

        this.data.splice(index, 1);
        this.save();
        return true;
    },

    /**
     * Mark appointment as completed and record payment
     */
    completeWithPayment(appointmentId, amount, method = 'cash') {
        const appt = this.data.find(a => a.id === appointmentId);
        if (!appt) return null;

        appt.status = 'completed';
        appt.isPaid = true;
        appt.paymentAmount = parseFloat(amount);
        appt.paymentMethod = method;
        appt.updatedAt = new Date().toISOString();

        this.save();
        return appt;
    },

    /**
     * Get appointments by client
     */
    getByClient(clientId) {
        return this.data.filter(a => a.clientId === clientId);
    },

    /**
     * Get appointments by date range
     */
    getByDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();

        return this.data.filter(a => {
            const apptTime = new Date(a.date).getTime();
            return apptTime >= start && apptTime <= end;
        });
    },

    /**
     * Get appointments for today
     */
    getToday() {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        return this.data.filter(a => {
            const apptDateStr = a.date.split('T')[0]; // Extract YYYY-MM-DD from ISO string
            return apptDateStr === dateStr;
        });
    },

    /**
     * Get appointments for tomorrow
     */
    getTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        
        return this.data.filter(a => {
            const apptDateStr = a.date.split('T')[0];
            return apptDateStr === dateStr;
        });
    },

    /**
     * Get appointments for this week
     */
    getThisWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const startStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
        const endStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

        return this.data.filter(a => {
            const apptDateStr = a.date.split('T')[0];
            return apptDateStr >= startStr && apptDateStr < endStr;
        });
    },

    /**
     * Sort appointments by time
     */
    sortByTime(appointments = null) {
        const list = appointments || this.data;
        return [...list].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const timeA = this._timeToMinutes(a.time);
            const timeB = this._timeToMinutes(b.time);
            return timeA - timeB;
        });
    },

    /**
     * Save to storage
     */
    save() {
        Storage.save(Storage.KEYS.APPOINTMENTS, this.data);
    }
};
