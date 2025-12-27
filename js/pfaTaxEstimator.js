/**
 * PFA Annual Tax Estimator for Romania
 * Calculates: Income Tax (10%) + CAS (25%) + CASS (10%)
 * With strict thresholds based on minimum salary
 * Single source of truth: localStorage("transactions")
 */

const PfaTaxEstimator = {
    // Configuration
    config: {
        selectedYear: new Date().getFullYear(),
        salariu_minim_brut: 4050,          // 2025 minimum wage (RON)
        income_tax_rate: 0.10,              // 10% on net income
        cas_rate: 0.25,                     // 25% on CAS base
        cass_rate: 0.10,                    // 10% on CASS base
        exceptCAS: false,                   // Pensioner/exempted from CAS
        previousSalaryIncome: false         // Had ≥6 minimum salaries in previous year
    },

    // Cached results
    _cachedResults: null,

    /**
     * Initialize PFA Tax Estimator
     */
    init() {
        this.loadConfig();
        Logger.log('[PfaTaxEstimator] Initialized');
    },

    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('pfaTaxEstimatorConfig');
            if (saved) {
                Object.assign(this.config, JSON.parse(saved));
            }
        } catch (err) {
            Logger.warn('[PfaTaxEstimator] Failed to load config:', err);
        }
    },

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('pfaTaxEstimatorConfig', JSON.stringify(this.config));
            Logger.log('[PfaTaxEstimator] Config saved');
        } catch (err) {
            Logger.error('[PfaTaxEstimator] Failed to save config:', err);
        }
    },

    /**
     * Get transactions for specific year
     */
    getYearTransactions(year) {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        return transactions.filter(tx => {
            const txYear = new Date(tx.dateTime || tx.date).getFullYear();
            return txYear === year && tx.status !== 'void';
        });
    },

    /**
     * Get YTD (Year-to-Date) transactions and calculate elapsed days
     */
    getYearToDateData(year) {
        const transactions = Storage.load(Storage.KEYS.TRANSACTIONS, []);
        const today = new Date();
        const currentYear = today.getFullYear();

        // Filter for current year up to today
        const ytdTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.dateTime || tx.date);
            const txYear = txDate.getFullYear();
            return txYear === year && tx.status !== 'void' && txDate <= today;
        });

        // Calculate days elapsed in the year
        const yearStart = new Date(year, 0, 1);
        const daysElapsed = Math.ceil((today - yearStart) / (1000 * 60 * 60 * 24));
        const daysInYear = new Date(year, 11, 31) - new Date(year, 0, 1);
        const totalDaysInYear = Math.ceil(daysInYear / (1000 * 60 * 60 * 24)) + 1;

        const income = ytdTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenses = ytdTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const net = Math.max(0, income - expenses);

        return {
            year,
            income: Math.round(income * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            net: Math.round(net * 100) / 100,
            transactionCount: ytdTransactions.length,
            incomeCount: ytdTransactions.filter(t => t.type === 'income').length,
            expenseCount: ytdTransactions.filter(t => t.type === 'expense').length,
            daysElapsed,
            totalDaysInYear,
            isCurrentYear: year === currentYear
        };
    },

    /**
     * Calculate annual totals (entire year)
     */
    getYearTotals(year) {
        const txs = this.getYearTransactions(year);

        const income = txs
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenses = txs
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const net = Math.max(0, income - expenses);

        return {
            year,
            income,
            expenses,
            net,
            transactionCount: txs.length,
            incomeCount: txs.filter(t => t.type === 'income').length,
            expenseCount: txs.filter(t => t.type === 'expense').length
        };
    },

    /**
     * Get threshold values for display
     */
    getThresholds() {
        const cfg = this.config;
        return {
            prag12: 12 * cfg.salariu_minim_brut,
            prag24: 24 * cfg.salariu_minim_brut,
            minCASS: 6 * cfg.salariu_minim_brut,
            maxCASS: 60 * cfg.salariu_minim_brut
        };
    },

    /**
     * Calculate PFA taxes for a given net income
     * Returns detailed calculation
     */
    calculateTaxesForNet(net, cfg) {
        // 1. INCOME TAX (10% on net)
        const incomeTax = net * cfg.income_tax_rate;

        // 2. CAS (PENSION) - threshold-based
        let cas = 0;
        let casBase = 0;
        let casExplanation = '';
        const prag12 = 12 * cfg.salariu_minim_brut;
        const prag24 = 24 * cfg.salariu_minim_brut;

        if (!cfg.exceptCAS) {
            if (net >= prag24) {
                casBase = prag24;
                casExplanation = `Venit ≥ ${prag24} RON (24 × ${cfg.salariu_minim_brut} RON) → CAS pe baza maxim: ${prag24} RON`;
            } else if (net >= prag12) {
                casBase = prag12;
                casExplanation = `Venit între ${prag12}-${prag24} RON → CAS pe baza minim: ${prag12} RON`;
            } else {
                casBase = 0;
                casExplanation = `Venit < ${prag12} RON → CAS = 0 (sub prag 12 salarii minime)`;
            }
            cas = casBase * cfg.cas_rate;
        } else {
            casExplanation = 'CAS exceptat (pensionar/neaptă)';
        }

        // 3. CASS (HEALTH) - base between 6 and 60 minimum salaries
        let cass = 0;
        let cassBase = 0;
        let cassExplanation = '';
        const minBase = 6 * cfg.salariu_minim_brut;
        const maxBase = 60 * cfg.salariu_minim_brut;

        if (net < minBase) {
            if (cfg.previousSalaryIncome) {
                cassBase = net;
                cassExplanation = `Venit < ${minBase} RON dar cu venituri salariale anterioare → CASS pe venit actual: ${net.toFixed(2)} RON`;
            } else {
                cassBase = minBase;
                cassExplanation = `Venit < ${minBase} RON (6 salarii minime) → CASS pe baza minima: ${minBase} RON`;
            }
        } else if (net <= maxBase) {
            cassBase = net;
            cassExplanation = `Venit între ${minBase}-${maxBase} RON → CASS pe venit actual: ${net.toFixed(2)} RON`;
        } else {
            cassBase = maxBase;
            cassExplanation = `Venit > ${maxBase} RON (60 salarii minime) → CASS pe baza maxim: ${maxBase} RON`;
        }

        cass = cassBase * cfg.cass_rate;

        // 4. TOTAL
        const totalDue = incomeTax + cas + cass;

        return {
            incomeTax: Math.round(incomeTax * 100) / 100,
            cas: Math.round(cas * 100) / 100,
            cass: Math.round(cass * 100) / 100,
            casBase: Math.round(casBase * 100) / 100,
            cassBase: Math.round(cassBase * 100) / 100,
            totalDue: Math.round(totalDue * 100) / 100,
            casExplanation,
            cassExplanation
        };
    },

    /**
     * Calculate YTD taxes and projection
     */
    calculateYTDAndProjection(year) {
        const ytdData = this.getYearToDateData(year);
        const cfg = this.config;

        // Calculate YTD taxes
        const ytdTaxes = this.calculateTaxesForNet(ytdData.net, cfg);

        // Calculate projection
        let projectedNet = ytdData.net;
        let projectedTaxes = ytdTaxes;
        let projectionInfo = '';

        if (ytdData.isCurrentYear && ytdData.daysElapsed > 0) {
            const avgNetPerDay = ytdData.net / ytdData.daysElapsed;
            projectedNet = Math.round(avgNetPerDay * ytdData.totalDaysInYear * 100) / 100;
            projectedTaxes = this.calculateTaxesForNet(projectedNet, cfg);
            projectionInfo = `Pe baza a ${ytdData.daysElapsed} zile: mediu ${(avgNetPerDay).toFixed(2)} RON/zi → estimare pe ${ytdData.totalDaysInYear} zile`;
        }

        return {
            ytd: {
                ...ytdData,
                ...ytdTaxes
            },
            projection: {
                net: projectedNet,
                ...projectedTaxes,
                info: projectionInfo
            }
        };
    },

    /**
     * Calculate PFA taxes according to Romanian rules
     */
    calculatePFATaxes(year) {
        const totals = this.getYearTotals(year);
        const { income, expenses, net } = totals;
        const cfg = this.config;

        const taxes = this.calculateTaxesForNet(net, cfg);

        // Round to 2 decimals
        const result = {
            year,
            income: Math.round(income * 100) / 100,
            expenses: Math.round(expenses * 100) / 100,
            net: Math.round(net * 100) / 100,
            incomeTax: taxes.incomeTax,
            casBase: taxes.casBase,
            cas: taxes.cas,
            cassBase: taxes.cassBase,
            cass: taxes.cass,
            totalDue: taxes.totalDue,
            casExplanation: taxes.casExplanation,
            cassExplanation: taxes.cassExplanation,
            transactionCount: totals.transactionCount,
            incomeCount: totals.incomeCount,
            expenseCount: totals.expenseCount
        };

        this._cachedResults = result;
        return result;
    },

    /**
     * Get calculation summary with assumptions
     */
    getSummary(year) {
        const calculation = this.calculatePFATaxes(year);
        const cfg = this.config;

        const assumptions = [
            `Rata impozit venit: ${(cfg.income_tax_rate * 100).toFixed(0)}%`,
            `Rata CAS: ${(cfg.cas_rate * 100).toFixed(0)}%`,
            `Rata CASS: ${(cfg.cass_rate * 100).toFixed(0)}%`,
            `Salariu minim brut (praguri): ${cfg.salariu_minim_brut} RON`,
            `Prag CAS (minim): 12 salarii = ${(12 * cfg.salariu_minim_brut)} RON`,
            `Prag CAS (maxim): 24 salarii = ${(24 * cfg.salariu_minim_brut)} RON`,
            `Bază CASS (minim): 6 salarii = ${(6 * cfg.salariu_minim_brut)} RON`,
            `Bază CASS (maxim): 60 salarii = ${(60 * cfg.salariu_minim_brut)} RON`
        ];

        if (cfg.exceptCAS) {
            assumptions.push('⚠ CAS exceptat (pensionar/neaptă)');
        }

        if (cfg.previousSalaryIncome) {
            assumptions.push('ℹ Cu venituri salariale precedente: CASS = min(venit actual, 60 salarii)');
        }

        return {
            ...calculation,
            assumptions,
            disclaimer: 'Estimare orientativă pe baza tranzacțiilor introduse. Pentru depunere oficială (Declarația Unică) verifică împreună cu un contabil / ANAF.',
            dataQuality: {
                incomeTransactions: calculation.incomeCount,
                expenseTransactions: calculation.expenseCount,
                totalTransactions: calculation.transactionCount,
                dataSource: 'localStorage("transactions") - confirmed & non-void'
            }
        };
    },

    /**
     * Export to CSV
     */
    exportAsCSV(year) {
        const summary = this.getSummary(year);
        const cfg = this.config;

        let csv = 'ESTIMARE TAXE ANUALE PFA - ROMÂNIA\n';
        csv += `An fiscal: ${year}\n`;
        csv += `Data generării: ${new Date().toLocaleString('ro-RO')}\n\n`;

        // Summary
        csv += 'REZUMAT FINANCIAR\n';
        csv += `"Venituri anuale (RON)","${summary.income.toFixed(2)}"\n`;
        csv += `"Cheltuieli anuale (RON)","${summary.expenses.toFixed(2)}"\n`;
        csv += `"Venit net (RON)","${summary.net.toFixed(2)}"\n\n`;

        // Taxes
        csv += 'CALCUL TAXE\n';
        csv += `"Impozit venit 10% (RON)","${summary.incomeTax.toFixed(2)}"\n`;
        csv += `"Bază CAS (RON)","${summary.casBase.toFixed(2)}"\n`;
        csv += `"CAS 25% (RON)","${summary.cas.toFixed(2)}"\n`;
        csv += `"Bază CASS (RON)","${summary.cassBase.toFixed(2)}"\n`;
        csv += `"CASS 10% (RON)","${summary.cass.toFixed(2)}"\n`;
        csv += `"TOTAL OBLIGAȚII (RON)","${summary.totalDue.toFixed(2)}"\n\n`;

        // Settings
        csv += 'SETĂRI UTILIZATE\n';
        csv += `"Salariu minim brut","${cfg.salariu_minim_brut} RON"\n`;
        csv += `"Rata impozit venit","${(cfg.income_tax_rate * 100).toFixed(0)}%"\n`;
        csv += `"Rata CAS","${(cfg.cas_rate * 100).toFixed(0)}%"\n`;
        csv += `"Rata CASS","${(cfg.cass_rate * 100).toFixed(0)}%"\n`;
        csv += `"Exceptat CAS",${cfg.exceptCAS ? 'DA' : 'NU'}\n`;
        csv += `"Venituri salariale precedent",${cfg.previousSalaryIncome ? 'DA' : 'NU'}\n\n`;

        // Assumptions
        csv += 'ASUMPȚII\n';
        summary.assumptions.forEach(assumption => {
            csv += `"${assumption}"\n`;
        });

        csv += '\n' + summary.disclaimer;

        return csv;
    },

    /**
     * Download CSV file
     */
    downloadCSV(year) {
        const csv = this.exportAsCSV(year);
        const filename = `Estimare-PFA-${year}.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Logger.log(`[PfaTaxEstimator] CSV exported: ${filename}`);
    },

    /**
     * Handle data changes
     */
    onDataChanged() {
        Logger.log('[PfaTaxEstimator] Data changed, invalidating cache');
        this._cachedResults = null;
    }
};

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PfaTaxEstimator.init();
    });
} else {
    PfaTaxEstimator.init();
}

// Listen for data changes
window.addEventListener('data:changed', () => {
    PfaTaxEstimator.onDataChanged();
});

window.addEventListener('storage', (e) => {
    if (e.key === Storage.KEYS.TRANSACTIONS) {
        PfaTaxEstimator.onDataChanged();
    }
});
