/**
 * Performance Monitor - Real-time performance metrics and bottleneck detection
 * Monitor app performance without adding overhead
 */

const Perf = {
    // Metrics storage
    metrics: {
        operations: [],
        pageMetrics: {}
    },

    // Thresholds for warnings
    thresholds: {
        operation: 100,  // ms
        render: 50,      // ms
        storage: 10      // ms
    },

    /**
     * Start timing an operation
     */
    start(label) {
        if (!this.metrics.operations.find(m => m.label === label && !m.ended)) {
            this.metrics.operations.push({
                label,
                startTime: performance.now(),
                ended: false
            });
        }
    },

    /**
     * End timing an operation
     */
    end(label) {
        const metric = this.metrics.operations.find(m => m.label === label && !m.ended);
        if (metric) {
            metric.endTime = performance.now();
            metric.duration = metric.endTime - metric.startTime;
            metric.ended = true;
            
            // Check threshold
            const threshold = this.getThreshold(label);
            if (metric.duration > threshold) {
                Logger.warn(`[PERF] Slow operation: ${label} took ${metric.duration.toFixed(2)}ms`);
            }
            
            return metric.duration;
        }
        return null;
    },

    /**
     * Get appropriate threshold for label
     */
    getThreshold(label) {
        if (label.includes('render')) return this.thresholds.render;
        if (label.includes('storage')) return this.thresholds.storage;
        return this.thresholds.operation;
    },

    /**
     * Record page load metrics
     */
    recordPageMetrics() {
        if (window.performance && window.performance.timing) {
            const timing = window.performance.timing;
            this.metrics.pageMetrics = {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                loadComplete: timing.loadEventEnd - timing.loadEventStart,
                domInteractive: timing.domInteractive - timing.navigationStart,
                domComplete: timing.domComplete - timing.navigationStart,
                totalTime: timing.loadEventEnd - timing.navigationStart
            };
        }
    },

    /**
     * Get operation metrics
     */
    getMetrics(label = null) {
        if (label) {
            return this.metrics.operations.filter(m => m.label.includes(label) && m.ended);
        }
        return this.metrics.operations.filter(m => m.ended);
    },

    /**
     * Get average operation time
     */
    getAverage(label) {
        const metrics = this.getMetrics(label);
        if (metrics.length === 0) return 0;
        
        const total = metrics.reduce((sum, m) => sum + m.duration, 0);
        return total / metrics.length;
    },

    /**
     * Get slowest operation
     */         
    getSlowest(label = null) {
        const metrics = this.getMetrics(label);
        if (metrics.length === 0) return null;
        
        return metrics.reduce((max, m) => m.duration > max.duration ? m : max);
    },

    /**
     * Get fastest operation
     */
    getFastest(label = null) {
        const metrics = this.getMetrics(label);
        if (metrics.length === 0) return null;
        
        return metrics.reduce((min, m) => m.duration < min.duration ? m : min);
    },

    /**
     * Show performance report
     */
    report(label = null) {
        const metrics = this.getMetrics(label);
        
        console.log('╔══════════════════════════════════════╗');
        console.log('║  PERFORMANCE REPORT                  ║');
        console.log('╚══════════════════════════════════════╝');
        
        if (this.metrics.pageMetrics.totalTime) {
            console.group('Page Load Metrics');
            console.table(this.metrics.pageMetrics);
            console.groupEnd();
        }
        
        if (metrics.length > 0) {
            console.group(`Operations (${metrics.length})`);
            console.table(metrics.map(m => ({
                label: m.label,
                duration: `${m.duration.toFixed(2)}ms`,
                time: new Date(m.startTime).toLocaleTimeString()
            })));
            console.groupEnd();
            
            console.group('Summary');
            console.log(`Average: ${this.getAverage(label).toFixed(2)}ms`);
            console.log(`Slowest: ${this.getSlowest(label)?.label} - ${this.getSlowest(label)?.duration.toFixed(2)}ms`);
            console.log(`Fastest: ${this.getFastest(label)?.label} - ${this.getFastest(label)?.duration.toFixed(2)}ms`);
            console.groupEnd();
        }
    },

    /**
     * Clear metrics
     */
    clear() {
        this.metrics.operations = [];
        this.metrics.pageMetrics = {};
    },

    /**
     * Export metrics as JSON
     */
    export() {
        return JSON.stringify(this.metrics, null, 2);
    }
};

// Record page load metrics when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => Perf.recordPageMetrics(), 0);
    });
} else {
    setTimeout(() => Perf.recordPageMetrics(), 0);
}

// Freeze Perf to prevent modification
Object.freeze(Perf);
