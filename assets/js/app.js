/**
 * Main App - Initialize the SPA with History API support
 * 
 * HISTORY API ARCHITECTURE:
 * 1. When user clicks nav or modal opens → navigate()/open() calls pushState
 * 2. When user presses Back button → browser fires popstate event
 * 3. popstate handler checks: is modal open?
 *    - YES: Close the modal (don't navigate away)
 *    - NO: Allow normal route navigation
 * 4. This prevents page change when modal is open
 * 
 * FLOW WITH MODAL:
 * - User clicks "Open Appointments" → open() pushes {modal: id}
 * - User presses Back → popstate fires with state.modal
 * - Handler calls ModalManager.closeTop() → closes modal, stays on page
 * 
 * FLOW WITHOUT MODAL:
 * - User clicks "Programări" → navigate() pushes {route: appointments}
 * - User presses Back → popstate fires with state.route
 * - Handler calls navigate(savedRoute) → changes page normally
 */
import Store from './core/store.js';
import NavigationManager from './ui/navigationManager.js';
import ModalManager from './ui/modalManager.js';

const app = {
    init() {
        // Initialize store with default data if empty
        Store.initializeIfEmpty();

        // Initialize navigation manager
        NavigationManager.init();

        // =================================================================
        // HISTORY API: Central popstate handler for modal + route management
        // =================================================================
        window.addEventListener('popstate', (event) => {
            // Case 1: Modal was in history state → close the modal
            if (event.state?.modal) {
                const closed = ModalManager.closeTop();
                // Stay on current page (don't navigate)
                return;
            }

            // Case 2: No modal in state → normal route navigation
            // If a modal is somehow still open (edge case), close it first
            if (ModalManager.isOpen()) {
                ModalManager.closeAll();
            }

            // Navigate to the route from history state, or default to dashboard
            const route = event.state?.route || 'dashboard';
            NavigationManager.renderView(route);
            
            // Update UI state to match route
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                if (item.dataset.route === route) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                appointments: 'Programări',
                finance: 'Finanțe',
                services: 'Servicii',
                settings: 'Setări'
            };
            const pageTitle = document.getElementById('pageTitle');
            if (pageTitle) {
                pageTitle.textContent = titles[route] || 'Dashboard';
            }

            // Save route
            Store.saveRoute(route);
            NavigationManager.currentRoute = route;
        });
    }
};

export default app;

