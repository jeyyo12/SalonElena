/**
 * Tax Estimator for Romanian Hairstyle Salon
 * Calculates annual tax obligations based on selected fiscal regime
 * Single source of truth: localStorage("transactions")
 */

const TaxEstimator = {
    // Configuration (editable via UI)
    config: {
        regime: 'srl_micro',           // 'srl_micro' | 'srl_profit' | 'pfa'
        fiscalYear: new Date().getFullYear(),
        currency: 'RON',
        isVATpayer: false,
        employeeCount: 0,
        estimatedSalaryCost: 0,
        
        // Tax rates (configurable)
        micro_tax_rate: 0.01,           // 1% default (can be 3%)
        profit_tax_rate: 0.16,          // 16% standard
        
        // PFA specific (in RON per month or %)
        pfa_income_tax_rate: 0.10,      // 10% example
        pfa_cas_monthly: 350,            // Monthly CAS contribution (estimate)
        pfa_cass_monthly: 110,           // Monthly CASS contribution (estimate)
        pfa_use_percentage: false,       // If true, use % instead of fixed amounts
    },

    // Cached calculation results
    _cachedResults: null,

    /**
     * Initialize TaxEstimator and load saved config
     */
    init() {
        this.loadConfig();
        Logger.log('[TaxEstimator] Initialized');
    },

    /**
     * Load configuration from localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('taxEstimatorConfig');
            if (saved) {
                Object.assign(this.config, JSON.parse(saved));
            }
        } catch (err) {
            Logger.warn('[TaxEstimator] Failed to load config:', err);
        }
    },

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('taxEstimatorConfig', JSON.stringify(this.config));
            Logger.log('[TaxEstimator] Config saved');
        } catch (err) {
            Logger.error('[TaxEstimator] Failed to save config:', err);
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
     * Calculate annual totals: income, expenses, profit
     */
    getYearTotals(year) {
        const txs = this.getYearTransactions(year);

        const income = txs
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenses = txs
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const profit = income - expenses;

        return {
            year,
            income,
            expenses,
            profit,
            transactionCount: txs.length,
            incomeCount: txs.filter(t => t.type === 'income').length,
            expenseCount: txs.filter(t => t.type === 'expense').length
        };
    },

    /**
     * Calculate taxes based on selected regime
     */
    calculateTaxes(year) {
        const totals = this.getYearTotals(year);
        const { income, expenses, profit } = totals;

        let taxBreakdown = {
            regime: this.config.regime,
            income,
            expenses,
            profit,
            grossTax: 0,
            additionalContributions: 0,
            totalTax: 0,
            assumptions: []
        };

        if (this.config.regime === 'srl_micro') {
            taxBreakdown = this._calculateSrlMicro(totals);
        } else if (this.config.regime === 'srl_profit') {
            taxBreakdown = this._calculateSrlProfit(totals);
        } else if (this.config.regime === 'pfa') {
            taxBreakdown = this._calculatePFA(totals);
        }

        // Store results
        this._cachedResults = {
            ...taxBreakdown,
            calculatedAt: new Date().toISOString(),
            config: { ...this.config }
        };

        return taxBreakdown;
    },

    /**
     * SRL Microîntreprindere calculation
     * Tax = income * micro_tax_rate (1% or 3%)
     */
    _calculateSrlMicro(totals) {
        const { income, expenses, profit } = totals;
        const rate = this.config.micro_tax_rate;

        return {
            regime: 'srl_micro',
            income,
            expenses,
            profit,
            grossTax: income * rate,
            additionalContributions: 0,
            totalTax: income * rate,
            assumptions: [
                `Tax rate: ${(rate * 100).toFixed(1)}% of gross income`,
                `Total income subject to tax: ${income.toFixed(2)} RON`,
                `No profit/loss deduction (flat rate on revenue)`
            ]
        };
    },

    /**
     * SRL Impozit pe profit calculation
     * Tax = max(0, profit) * 16%
     */
    _calculateSrlProfit(totals) {
        const { income, expenses, profit } = totals;
        const rate = this.config.profit_tax_rate;
        const taxableProfit = Math.max(0, profit);

        return {
            regime: 'srl_profit',
            income,
            expenses,
            profit,
            grossTax: taxableProfit * rate,
            additionalContributions: 0,
            totalTax: taxableProfit * rate,
            assumptions: [
                `Tax rate: ${(rate * 100).toFixed(1)}% of net profit`,
                `Total income: ${income.toFixed(2)} RON`,
                `Total expenses: ${expenses.toFixed(2)} RON`,
                `Taxable profit: ${taxableProfit.toFixed(2)} RON`,
                `Deductible expenses reduce taxable profit`
            ]
        };
    },

    /**
     * PFA / Activitate independentă calculation
     * Tax = profit * income_tax_rate + CAS + CASS (configurable)
     */
    _calculatePFA(totals) {
        const { income, expenses, profit } = totals;
        const taxableProfit = Math.max(0, profit);

        let incomeTax = 0;
        let casTotal = 0;
        let cassTotal = 0;
        const monthsInYear = 12;

        // Income tax (on net profit)
        if (this.config.pfa_use_percentage) {
            incomeTax = taxableProfit * this.config.pfa_income_tax_rate;
        } else {
            // If using percentage on gross income
            incomeTax = income * this.config.pfa_income_tax_rate;
        }

        // Social security contributions (CAS + CASS)
        casTotal = this.config.pfa_cas_monthly * monthsInYear;
        cassTotal = this.config.pfa_cass_monthly * monthsInYear;

        const totalTax = incomeTax + casTotal + cassTotal;

        return {
            regime: 'pfa',
            income,
            expenses,
            profit,
            grossTax: incomeTax,
            casContribution: casTotal,
            cassContribution: cassTotal,
            additionalContributions: casTotal + cassTotal,
            totalTax: totalTax,
            assumptions: [
                `Income tax rate: ${(this.config.pfa_income_tax_rate * 100).toFixed(1)}% on ${this.config.pfa_use_percentage ? 'net profit' : 'gross income'}`,
                `Monthly CAS: ${this.config.pfa_cas_monthly.toFixed(2)} RON × 12 = ${casTotal.toFixed(2)} RON/year`,
                `Monthly CASS: ${this.config.pfa_cass_monthly.toFixed(2)} RON × 12 = ${cassTotal.toFixed(2)} RON/year`,
                `Total annual contributions: ${(casTotal + cassTotal).toFixed(2)} RON`,
                `Note: Rates are configurable - consult accountant for accuracy`
            ]
        };
    },

    /**
     * Get full summary with legal notes
     */
    getSummary(year) {
        const taxes = this.calculateTaxes(year);
        const totals = this.getYearTotals(year);

        return {
            year,
            ...taxes,
            totals,
            disclaimer: 'ESTIMARE ORIENTATIVĂ - Pentru depuneri oficiale și calcule precise consultă un contabil autorizat sau ANAF.',
            dataQuality: {
                transactionsIncluded: totals.transactionCount,
                incomeTransactions: totals.incomeCount,
                expenseTransactions: totals.expenseCount,
                dataSource: 'localStorage("transactions")',
                filterStatus: 'Only confirmed & non-void transactions'
            }
        };
    },

    /**
     * Export summary as CSV
     */
    exportAsCSV(year) {
        const summary = this.getSummary(year);
        const txs = this.getYearTransactions(year);

        let csv = 'ESTIMARE OBLIGAȚII FISCALE ANUALE - SALON COAFURĂ\n';
        csv += `An fiscal: ${year}\n`;
        csv += `Regim: ${this._getRegimeName(summary.regime)}\n`;
        csv += `Data generării: ${new Date().toLocaleString('ro-RO')}\n\n`;

        // Summary section
        csv += 'REZUMAT FINANCIAR\n';
        csv += `"Venituri anuale (RON)","${summary.income.toFixed(2)}"\n`;
        csv += `"Cheltuieli anuale (RON)","${summary.expenses.toFixed(2)}"\n`;
        csv += `"Profit net (RON)","${summary.profit.toFixed(2)}"\n\n`;

        // Tax breakdown
        csv += 'CALCUL TAXE\n';
        if (summary.regime === 'srl_micro') {
            csv += `"Tax rate",${(this.config.micro_tax_rate * 100).toFixed(1)}%\n`;
            csv += `"Impozit anual (RON)","${summary.totalTax.toFixed(2)}"\n`;
        } else if (summary.regime === 'srl_profit') {
            csv += `"Tax rate",${(this.config.profit_tax_rate * 100).toFixed(1)}%\n`;
            csv += `"Profit impozabil (RON)","${summary.profit.toFixed(2)}"\n`;
            csv += `"Impozit anual (RON)","${summary.totalTax.toFixed(2)}"\n`;
        } else if (summary.regime === 'pfa') {
            csv += `"Impozit venit","${summary.grossTax.toFixed(2)}"\n`;
            csv += `"Cotizație CAS (12 luni)","${summary.casContribution.toFixed(2)}"\n`;
            csv += `"Cotizație CASS (12 luni)","${summary.cassContribution.toFixed(2)}"\n`;
            csv += `"Total contribuții anuale","${summary.additionalContributions.toFixed(2)}"\n`;
            csv += `"Total obligații fiscale (RON)","${summary.totalTax.toFixed(2)}"\n`;
        }

        csv += '\n\nDETALIU TRANZACȚII\n';
        csv += 'Data,Tip,Descriere,Suma,Metoda plată\n';
        txs.forEach(tx => {
            const date = (tx.dateTime || tx.date).split('T')[0];
            const desc = (tx.note || tx.description || '').replace(/"/g, '""');
            csv += `${date},"${tx.type}","${desc}","${tx.amount.toFixed(2)}","${tx.paymentMethod || 'N/A'}"\n`;
        });

        csv += '\n\nASUMPŢII ȘI SETĂRI\n';
        summary.assumptions.forEach(assumption => {
            csv += `"${assumption}"\n`;
        });

        csv += '\n\nDISCLAIMER\n';
        csv += `"${summary.disclaimer}"\n`;

        return csv;
    },

    /**
     * Trigger download of CSV file
     */
    downloadCSV(year) {
        const csv = this.exportAsCSV(year);
        const filename = `Estimare-Taxe-${year}.csv`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Logger.log(`[TaxEstimator] CSV exported: ${filename}`);
    },

    /**
     * Get regime display name
     */
    _getRegimeName(regime) {
        const names = {
            'srl_micro': 'SRL Microîntreprindere',
            'srl_profit': 'SRL Impozit pe Profit (16%)',
            'pfa': 'PFA / Activitate Independentă'
        };
        return names[regime] || regime;
    },

    /**
     * Handle storage/data change events
     */
    onDataChanged(event) {
        Logger.log('[TaxEstimator] Data changed, clearing cache');
        this._cachedResults = null;
    }
};

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TaxEstimator.init();
    });
} else {
    TaxEstimator.init();
}

// Listen for data changes
window.addEventListener('data:changed', (e) => {
    TaxEstimator.onDataChanged(e);
});

window.addEventListener('storage', (e) => {
    if (e.key === Storage.KEYS.TRANSACTIONS) {
        TaxEstimator.onDataChanged(e);
    }
});
