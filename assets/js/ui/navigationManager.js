/**
 * Navigation Manager - SPA routing with event delegation & History API
 * 
 * INTEGRATION WITH HISTORY API:
 * - navigate() uses pushState to change route
 * - popstate handler is managed by app.js
 * - If modal is open, Back button closes modal (handled by app.js)
 * - Only navigates if modalManager reports no open modals
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import ModalManager from './modalManager.js';
import DashboardFeature from '../features/dashboard.js';
import AppointmentsFeature from '../features/appointments.js';
import FinanceFeature from '../features/finance.js';
import ServicesFeature from '../features/services.js';
import SettingsFeature from '../features/settings.js';

const NavigationManager = {
    currentRoute: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const sidebarNav = DOM.get('#sidebarNav');
        if (!sidebarNav) return;

        // Event delegation: UN SINGUR click listener pe sidebar
        sidebarNav.addEventListener('click', (e) => {
            e.preventDefault();
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const route = navItem.dataset.route;
                if (route) {
                    // Close any open modals before navigating
                    if (ModalManager.isOpen()) {
                        ModalManager.closeAll();
                    }
                    this.navigate(route);
                }
            }
        });

        // Load persisted route or start from dashboard
        const savedRoute = Store.getRoute();
        this.navigate(savedRoute);
    },

    /**
     * Navigate to a route and update history
     * This is called explicitly (not by popstate)
     * @param {string} route - Route name (dashboard, appointments, etc.)
     */
    navigate(route) {
        // Don't navigate if modal is open (should not happen due to UI lock)
        if (ModalManager.isOpen()) {
            return;
        }

        // Update nav items active state
        const navItems = DOM.getAll('.nav-item');
        navItems.forEach(item => {
            if (item.dataset.route === route) {
                DOM.addClass(item, 'active');
            } else {
                DOM.removeClass(item, 'active');
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

        const pageTitle = DOM.get('#pageTitle');
        if (pageTitle) {
            pageTitle.textContent = titles[route] || 'Dashboard';
        }

        // Save route to localStorage
        Store.saveRoute(route);
        this.currentRoute = route;

        // Push to history stack with route state
        window.history.pushState(
            { route, timestamp: Date.now() },
            '',
            window.location.href
        );

        // Render the view
        this.renderView(route);
    },

    /**
     * Render view for a specific route (INTERNAL - called by navigate/popstate)
     * @param {string} route - Route name
     */
    renderView(route) {
        const viewContainer = DOM.get('#view');
        if (!viewContainer) return;

        // Get feature module
        let featureModule = null;

        switch (route) {
            case 'dashboard':
                featureModule = DashboardFeature;
                break;
            case 'appointments':
                featureModule = AppointmentsFeature;
                break;
            case 'finance':
                featureModule = FinanceFeature;
                break;
            case 'services':
                featureModule = ServicesFeature;
                break;
            case 'settings':
                featureModule = SettingsFeature;
                break;
            default:
                featureModule = DashboardFeature;
        }

        // Render
        viewContainer.innerHTML = '';
        if (featureModule && featureModule.render) {
            featureModule.render(viewContainer);
        }

        // Bind events (with proper context)
        if (featureModule && featureModule.bind) {
            featureModule.bind.call(featureModule, viewContainer);
        }
    }
};

export default NavigationManager;
