/**
 * Modal Manager - Robust modal stack with History API integration
 * 
 * ARCHITECTURE:
 * - Maintains a stack of open modals (modale pot fi nested)
 * - Each modal open() adds a history entry via pushState
 * - popstate handler closes top modal without triggering navigate()
 * - Prevents infinite loops and double-closes
 */
import DOM from '../core/dom.js';

const ModalManager = {
    /**
     * Stack of open modals
     * Each entry: { id: string, element: HTMLElement, buttons: Array, options: Object }
     */
    modalStack: [],

    /**
     * Flag to prevent closing same modal twice via popstate
     */
    isClosingViaHistory: false,

    /**
     * Open a modal with given content
     * @param {Object} options - { title, body, buttons, id (optional) }
     */
    open(options = {}) {
        const { title = '', body = '', buttons = [], id = null } = options;

        // Generate unique modal ID if not provided
        const modalId = id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create modal element
        const overlay = DOM.get('#modalOverlay');
        const container = DOM.get('#modalContainer');

        const modal = DOM.create('div', 'modal is-open');
        let html = '<div class="modal-header">';
        html += `<h3 class="modal-title">${title}</h3>`;
        html += '<button class="modal-close" data-action="close">×</button>';
        html += '</div>';
        html += `<div class="modal-body">${body}</div>`;

        if (buttons.length > 0) {
            html += '<div class="modal-footer">';
            buttons.forEach(btn => {
                const classes = ['btn', btn.class || 'btn-secondary'].join(' ');
                html += `<button class="${classes}" data-action="button">${btn.text}</button>`;
            });
            html += '</div>';
        }

        modal.innerHTML = html;
        modal.dataset.modalId = modalId;

        // Add to container
        container.appendChild(modal);

        // Show overlay
        if (!DOM.hasClass(overlay, 'is-open')) {
            DOM.addClass(overlay, 'is-open');
        }

        // Trigger reflow for animation
        modal.offsetHeight;
        DOM.addClass(modal, 'is-open');

        // Store in stack
        this.modalStack.push({
            id: modalId,
            element: modal,
            buttons,
            title
        });

        // Bind close button
        const closeBtn = modal.querySelector('[data-action="close"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close(modalId));
        }

        // Bind action buttons
        const actionBtns = modal.querySelectorAll('[data-action="button"]');
        actionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const callback = buttons[index]?.onClick;
                if (callback) callback();
            });
        });

        // Push history state ONLY if this is the first modal or a new one
        // This allows back button to close the modal
        if (!this.isClosingViaHistory) {
            window.history.pushState(
                { modal: modalId, timestamp: Date.now() },
                '',
                window.location.href
            );
        }

        return modalId;
    },

    /**
     * Close a specific modal by ID, or close top modal if no ID given
     * @param {string} modalId - Optional modal ID to close
     */
    close(modalId) {
        // If no ID provided, close the top modal
        if (!modalId && this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            modalId = topModal.id;
        }

        if (!modalId) return;

        // Find and remove from stack
        const index = this.modalStack.findIndex(m => m.id === modalId);
        if (index === -1) return;

        const modalEntry = this.modalStack[index];
        this.modalStack.splice(index, 1);

        // Remove element from DOM
        const element = modalEntry.element;
        if (element) {
            DOM.removeClass(element, 'is-open');
            
            // Wait for animation before removing
            setTimeout(() => {
                if (element.parentElement) {
                    element.remove();
                }
            }, 200);
        }

        // Hide overlay if no more modals
        if (this.modalStack.length === 0) {
            const overlay = DOM.get('#modalOverlay');
            DOM.removeClass(overlay, 'is-open');
        }
    },

    /**
     * Close the topmost modal in the stack
     * Called from popstate handler when user presses Back
     */
    closeTop() {
        if (this.modalStack.length === 0) return false;

        this.isClosingViaHistory = true;
        const topModal = this.modalStack[this.modalStack.length - 1];
        this.close(topModal.id);
        this.isClosingViaHistory = false;

        return true; // Indicates that a modal was closed
    },

    /**
     * Check if any modal is currently open
     * @returns {boolean}
     */
    isOpen() {
        return this.modalStack.length > 0;
    },

    /**
     * Get count of open modals
     * @returns {number}
     */
    getOpenCount() {
        return this.modalStack.length;
    },

    /**
     * Get top modal info (for debugging)
     * @returns {Object|null}
     */
    getTopModal() {
        return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
    },

    /**
     * Promise-based confirm dialog
     * Returns Promise<boolean>
     */
    confirm({ title = '', message = '' } = {}) {
        return new Promise((resolve) => {
            this.open({
                title,
                body: `<p style="margin-bottom: 0; color: var(--color-text-secondary);">${message}</p>`,
                buttons: [
                    {
                        text: 'Anulează',
                        class: 'btn-secondary',
                        onClick: () => {
                            this.closeTop();
                            resolve(false);
                        }
                    },
                    {
                        text: 'Confirmă',
                        class: 'btn-primary',
                        onClick: () => {
                            this.closeTop();
                            resolve(true);
                        }
                    }
                ]
            });
        });
    },

    /**
     * Clear all open modals (careful - use only for emergency)
     */
    closeAll() {
        while (this.modalStack.length > 0) {
            this.closeTop();
        }
    }
};

export default ModalManager;
