/**
 * Logger Utility - Production-safe logging
 * Logs only in development mode (can be toggled via window.DEBUG)
 */

const Logger = {
    // Global debug flag - set to false in production
    DEBUG: window.DEBUG || false,
    
    // Logger levels
    LEVELS: {
        LOG: 'log',
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info'
    },

    /**
     * Log message (only in debug mode)
     */
    log(...args) {
        if (!this.DEBUG) return;
        console.log('[SALON]', ...args);
    },

    /**
     * Log error (always logged)
     */
    error(...args) {
        console.error('[SALON ERROR]', ...args);
    },

    /**
     * Log warning (only in debug mode)
     */
    warn(...args) {
        if (!this.DEBUG) return;
        console.warn('[SALON WARN]', ...args);
    },

    /**
     * Log info (only in debug mode)
     */
    info(...args) {
        if (!this.DEBUG) return;
        console.info('[SALON INFO]', ...args);
    },

    /**
     * Performance timing
     */
    time(label) {
        if (!this.DEBUG) return;
        console.time(`[PERF] ${label}`);
    },

    /**
     * Performance timing end
     */
    timeEnd(label) {
        if (!this.DEBUG) return;
        console.timeEnd(`[PERF] ${label}`);
    },

    /**
     * Toggle debug mode
     */
    setDebug(enabled) {
        this.DEBUG = enabled;
        console.log(`🔍 Logger DEBUG: ${enabled ? 'ON' : 'OFF'}`);
    }
};

// Freeze logger to prevent modification
Object.freeze(Logger);
