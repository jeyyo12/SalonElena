/**
 * Toast Manager - Show toast notifications
 */
import DOM from '../core/dom.js';

const ToastManager = {
    show(message, type = 'info', duration = 3000) {
        const container = DOM.get('#toastContainer');

        const toast = DOM.create('div', `toast ${type}`);
        toast.textContent = message;

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.remove();
            }, duration);
        }

        return toast;
    },

    success(message, duration = 3000) {
        this.show(message, 'success', duration);
    },

    error(message, duration = 3000) {
        this.show(message, 'error', duration);
    },

    info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
};

export default ToastManager;
