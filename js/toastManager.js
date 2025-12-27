/**
 * Premium Toast Notification System
 * Bottom-right corner, auto-hide, smooth animations
 * Event-driven integration with payment system
 */

const ToastManager = {
    // Configuration
    config: {
        defaultDuration: 4000,           // ms before auto-hide
        maxToasts: 3,                    // max simultaneous toasts
        animationDuration: 300           // ms for show/hide animation
    },

    // State
    toasts: [],
    _toastRoot: null,

    /**
     * Initialize Toast Manager
     * Creates or gets toast-root container
     */
    init() {
        // Get or create toast root
        this._toastRoot = document.getElementById('toast-root');
        if (!this._toastRoot) {
            this._toastRoot = document.createElement('div');
            this._toastRoot.id = 'toast-root';
            this._toastRoot.className = 'toast-bottom-right';
            document.body.appendChild(this._toastRoot);
        }

        // Listen for payment confirmation events
        window.addEventListener('ui:payment-confirmed', (e) => {
            this.showPaymentConfirmed(e.detail);
        });

        Logger.log('[ToastManager] Initialized');
    },

    /**
     * Show toast with custom content
     */
    show(options = {}) {
        const {
            type = 'info',           // info, success, warning, error, income
            title = '',
            message = '',
            amount = null,
            paymentMethod = null,
            duration = this.config.defaultDuration,
            icon = '✓'
        } = options;

        // Create toast element
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toast = this._createToastElement(toastId, {
            type,
            title,
            message,
            amount,
            paymentMethod,
            icon
        });

        // Add to DOM
        this._toastRoot.appendChild(toast);
        this.toasts.push(toastId);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Handle close button
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.remove(toastId));
        }

        // Auto-hide
        const timeoutId = setTimeout(() => {
            this.remove(toastId);
        }, duration);

        // Store for cleanup
        toast._timeoutId = timeoutId;

        // Enforce max toasts
        if (this.toasts.length > this.config.maxToasts) {
            const oldestId = this.toasts.shift();
            const oldToast = document.getElementById(oldestId);
            if (oldToast) {
                this._animateOut(oldestId, () => {
                    oldToast.remove();
                });
            }
        }

        Logger.log(`[TOAST] Shown: ${title}`, options);
        return toastId;
    },

    /**
     * Show payment confirmation toast
     */
    showPaymentConfirmed(detail) {
        const {
            transactionId,
            appointmentId,
            clientName,
            serviceName,
            amount,
            paymentMethod,
            dateTime
        } = detail;

        // Determine payment method badge
        const paymentBadges = {
            cash: '💵 CASH',
            card: '💳 CARD',
            transfer: '🏦 TRANSFER'
        };
        const paymentBadge = paymentBadges[paymentMethod] || paymentMethod;

        // Create message
        const message = `${clientName} • ${serviceName}`;

        this.show({
            type: 'income',
            title: 'Încăsare confirmată',
            message: message,
            amount: amount,
            paymentMethod: paymentBadge,
            icon: '✅',
            duration: this.config.defaultDuration
        });

        Logger.log('[TOAST] Payment confirmed', detail);
    },

    /**
     * Create toast element with premium styling
     */
    _createToastElement(toastId, options) {
        const {
            type,
            title,
            message,
            amount,
            paymentMethod,
            icon
        } = options;

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast-item toast-${type}`;

        // HTML structure
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icon}</div>
                <div class="toast-body">
                    <div class="toast-title">${this._escapeHtml(title)}</div>
                    ${message ? `<div class="toast-message">${this._escapeHtml(message)}</div>` : ''}
                    ${amount ? `<div class="toast-amount">+${this._formatCurrency(amount)} RON</div>` : ''}
                    ${paymentMethod ? `<div class="toast-badge">${paymentMethod}</div>` : ''}
                </div>
                <button class="toast-close" aria-label="Close" title="Închide">✕</button>
            </div>
        `;

        return toast;
    },

    /**
     * Animate out and remove toast
     */
    _animateOut(toastId, callback) {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        // Clear auto-hide timeout
        if (toast._timeoutId) {
            clearTimeout(toast._timeoutId);
        }

        // Remove from tracking
        this.toasts = this.toasts.filter(id => id !== toastId);

        // Animate out
        toast.classList.remove('show');

        // Remove after animation
        const timeout = setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
            if (callback) callback();
        }, this.config.animationDuration);

        toast._timeoutId = timeout;
    },

    /**
     * Remove toast by ID
     */
    remove(toastId) {
        this._animateOut(toastId);
    },

    /**
     * Clear all toasts
     */
    clearAll() {
        this.toasts.forEach(toastId => {
            const toast = document.getElementById(toastId);
            if (toast) toast.remove();
        });
        this.toasts = [];
    },

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Format currency value
     */
    _formatCurrency(value) {
        return parseFloat(value).toLocaleString('ro-RO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
};

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ToastManager.init();
    });
} else {
    ToastManager.init();
}
