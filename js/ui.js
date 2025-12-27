/**
 * UI Utilities - modals, toasts, form management
 */

const UI = {
    /**
     * Show toast notification
     */
    showToast(message, type = 'success', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    },

    /**
     * Open modal
     */
    openModal(modalId, data = null) {
        Logger.log('[OPEN] Opening modal:', modalId);
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');
        
        if (!modal) {
            Logger.error('[ERROR] Modal not found:', modalId);
            return;
        }
        
        if (!overlay) {
            Logger.error('[ERROR] Overlay not found');
            return;
        }
        
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Reset tabs to first
        const tabs = modal.querySelectorAll('.modal-tab');
        const contents = modal.querySelectorAll('.modal-tab-content');
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        if (tabs[0]) tabs[0].classList.add('active');
        if (contents[0]) contents[0].classList.add('active');
        
        Logger.log('[OPEN] Modal opened successfully');
    },

    /**
     * Close modal
     */
    closeModal(modalId) {
        Logger.log('[CLOSE] Closing modal:', modalId);
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');
        
        if (!modal) {
            Logger.error('[ERROR] Modal not found:', modalId);
            return;
        }
        
        modal.classList.remove('active');
        Logger.log('[CLOSE] Removed active class from modal:', modalId);
        
        // Check if any modal is still open
        const openModals = document.querySelectorAll('.modal.active');
        Logger.log('[CLOSE] Active modals remaining:', openModals.length);
        
        if (openModals.length === 0) {
            if (overlay) {
                overlay.classList.remove('active');
                Logger.log('[CLOSE] Overlay deactivated - no more open modals');
            }
            document.body.classList.remove('modal-open');
            Logger.log('[CLOSE] modal-open class removed from body');
        } else {
            Logger.log('[CLOSE] Other modals still open, keeping overlay active');
        }
        Logger.log('[CLOSE] Modal closed successfully');
    },

    /**
     * Setup modal close handlers
     */
    setupModalClose(modalId) {
        const modal = document.getElementById(modalId);
        const overlay = document.getElementById('modalOverlay');
        
        if (!modal || !overlay) {
            Logger.error('[ERROR] Modal or overlay not found for:', modalId);
            return;
        }
        
        Logger.log('[SETUP] Setting up close handlers for modal:', modalId);
        
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            Logger.log('[SETUP] Close button found');
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                Logger.log('[EVENT] Close button clicked');
                this.closeModal(modalId);
            });
        } else {
            Logger.warn('[WARNING] Close button not found for modal:', modalId);
        }

        // Close on overlay click (but not on modal content click)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                Logger.log('[EVENT] Overlay clicked');
                // Close all modals
                document.querySelectorAll('.modal.active').forEach(m => {
                    this.closeModal(m.id);
                });
            }
        });

        // Modal content should not close modal
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        Logger.log('[SETUP] Close handlers setup complete for:', modalId);
    },

    /**
     * Setup modal tabs
     */
    setupModalTabs(modalId) {
        const modal = document.getElementById(modalId);
        const tabs = modal.querySelectorAll('.modal-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.modalTab;
                
                // Remove active from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.modal-tab-content').forEach(c => {
                    c.classList.remove('active');
                });
                
                // Add active to clicked tab
                tab.classList.add('active');
                const content = modal.querySelector(`[data-tab-content="${tabName}"]`);
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    },

    /**
     * Format date to DD.MM.YYYY
     */
    formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    },

    /**
     * Format date and time
     */
    formatDateTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    },

    /**
     * Format time HH:MM
     */
    formatTime(timeStr) {
        if (!timeStr) return '-';
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
        return `${amount.toFixed(2)} RON`;
    },

    /**
     * Parse date from input (YYYY-MM-DD) to ISO string
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        return new Date(dateStr).toISOString();
    },

    /**
     * Get initials from name
     */
    getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    },

    /**
     * Validate email
     */
    validateEmail(email) {
        if (!email) return true; // optional field
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validate phone (11 digits)
     */
    validatePhone(phone) {
        const regex = /^\d{11}$/;
        return regex.test(phone.replace(/\D/g, ''));
    },

    /**
     * Get date string for HTML input (YYYY-MM-DD)
     */
    getDateInputValue(date) {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Get today's date string (YYYY-MM-DD)
     */
    getTodayInputValue() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Check if two dates are the same day
     */
    isSameDay(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    },

    /**
     * Get days difference
     */
    getDaysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Check if date is today
     */
    isToday(date) {
        return this.isSameDay(new Date(), new Date(date));
    },

    /**
     * Check if date is tomorrow
     */
    isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.isSameDay(tomorrow, new Date(date));
    },

    /**
     * Check if date is within this week
     */
    isThisWeek(date) {
        const d = new Date(date);
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek;
        const startOfWeek = new Date(today.setDate(diff));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        return d >= startOfWeek && d <= endOfWeek;
    },

    /**
     * Convert Base64 to Blob
     */
    base64ToBlob(base64, type = 'image/jpeg') {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type });
    },

    /**
     * Get badge CSS class for client status
     */
    getBadgeClass(status) {
        const classMap = {
            platinum: 'badge-platinum',
            vip: 'badge-vip',
            loyal: 'badge-loyal',
            new: 'badge-new'
        };
        return classMap[status] || '';
    },

    /**
     * Get status label
     */
    getStatusLabel(status) {
        const labels = {
            platinum: 'PLATINUM',
            vip: 'VIP',
            loyal: 'LOYAL',
            new: 'NEW',
            standard: 'STANDARD'
        };
        return labels[status] || status.toUpperCase();
    }
};

Object.freeze(UI);
