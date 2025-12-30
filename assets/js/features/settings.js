/**
 * Settings Feature
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import ModalManager from '../ui/modalManager.js';
import ToastManager from '../ui/toastManager.js';
import NavigationManager from '../ui/navigationManager.js';

const SettingsFeature = {
    render(container) {
        const salonName = Store.getSetting('salonName', 'Salon Elena');
        const currency = Store.getSetting('currency', 'RON');

        const html = `
            <div class="section">
                <h3 class="section-title" style="margin-bottom: 24px;">Setări Salonului</h3>

                <div class="form-group">
                    <label>Nume Salon</label>
                    <input type="text" id="settingSalonName" value="${salonName}">
                </div>

                <div class="form-group">
                    <label>Monedă</label>
                    <select id="settingCurrency">
                        <option value="RON" ${currency === 'RON' ? 'selected' : ''}>RON - Leu Român</option>
                        <option value="EUR" ${currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                        <option value="USD" ${currency === 'USD' ? 'selected' : ''}>USD - Dolar</option>
                        <option value="GBP" ${currency === 'GBP' ? 'selected' : ''}>GBP - Lira Sterlină</option>
                    </select>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-primary" id="btnSaveSettings">💾 Salvează</button>
                    <button class="btn btn-danger" id="btnResetData">🗑️ Resetează Toate Datele</button>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title" style="margin-bottom: 16px;">Despre Aplicație</h3>
                <p style="color: var(--color-text-secondary); line-height: 1.6;">
                    <strong>Salon Elena - Management System</strong><br>
                    Versiune: 1.0.0<br>
                    Tehnologie: HTML5 + CSS3 + ES Modules<br>
                    Persistență: localStorage<br>
                    <br>
                    © 2024 - Salon Elena. Toate drepturile rezervate.
                </p>
            </div>
        `;

        container.innerHTML = html;
    },

    bind(container) {
        const saveBtn = DOM.get('#btnSaveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        const resetBtn = DOM.get('#btnResetData');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.handleResetData());
        }
    },

    saveSettings() {
        const salonName = DOM.get('#settingSalonName').value.trim();
        const currency = DOM.get('#settingCurrency').value;

        if (!salonName) {
            ToastManager.error('Introduceți numele salonului');
            return;
        }

        Store.setSetting('salonName', salonName);
        Store.setSetting('currency', currency);

        ToastManager.success('Setări salvate');
    },

    handleResetData() {
        ModalManager.confirm({
            title: 'Resetează Baza de Date',
            message: 'Atenție! Aceasta va șterge TOATE datele (programări, clienți, servicii, cheltuieli). Sunteți sigur?'
        }).then(confirmed => {
            if (confirmed) {
                Store.clearAll();
                ToastManager.success('Baza de date a fost resetată');
                NavigationManager.navigate('dashboard');
            }
        });
    }
};

export default SettingsFeature;
