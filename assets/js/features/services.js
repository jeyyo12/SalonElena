/**
 * Services Feature
 */
import DOM from '../core/dom.js';
import Store from '../core/store.js';
import ModalManager from '../ui/modalManager.js';
import ToastManager from '../ui/toastManager.js';
import NavigationManager from '../ui/navigationManager.js';

const ServicesFeature = {
    render(container) {
        const services = Store.load('services') || [];

        const html = `
            <div class="section">
                <div class="section-header">
                    <h3 class="section-title">Servicii</h3>
                    <button class="btn btn-primary" id="btnAddService">+ Serviciu Nou</button>
                </div>

                ${services.length === 0 ? 
                    '<p style="text-align: center; color: var(--color-text-secondary); padding: 40px;">Nicio serviciu înregistrat</p>' :
                    `<table class="data-table">
                        <thead>
                            <tr>
                                <th>Nume</th>
                                <th>Categorie</th>
                                <th>Durată (min)</th>
                                <th>Preț</th>
                                <th>Acțiuni</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(service => `
                                <tr data-id="${service.id}">
                                    <td><strong>${service.name}</strong></td>
                                    <td>${service.category || '-'}</td>
                                    <td>${service.durationMin || '-'}</td>
                                    <td>${service.price} RON</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" data-action="edit">Editează</button>
                                        <button class="btn btn-sm btn-danger" data-action="delete">Șterge</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        `;

        container.innerHTML = html;
    },

    bind(container) {
        const addBtn = DOM.get('#btnAddService');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddForm());
        }

        // Table event delegation
        const table = DOM.get('.data-table');
        if (table) {
            table.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const row = e.target.closest('tr');
                const id = row?.dataset.id;

                if (action === 'delete' && id) {
                    this.handleDelete(id);
                } else if (action === 'edit' && id) {
                    this.showEditForm(id);
                }
            });
        }
    },

    showAddForm() {
        const body = `
            <form id="serviceForm">
                <div class="form-group">
                    <label>Nume Serviciu *</label>
                    <input type="text" id="srvName" placeholder="Ex: Tăiere Păr - Femei" required>
                </div>
                <div class="form-group">
                    <label>Categorie</label>
                    <select id="srvCategory">
                        <option value="">-- Selectează --</option>
                        <option value="Coafură">Coafură</option>
                        <option value="Vopsit">Vopsit</option>
                        <option value="Tratament">Tratament</option>
                        <option value="Ondulare">Ondulare</option>
                        <option value="Extensii">Extensii</option>
                        <option value="Alte">Alte</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Durată (minute)</label>
                    <input type="number" id="srvDuration" min="15" step="15" placeholder="45">
                </div>
                <div class="form-group">
                    <label>Preț *</label>
                    <input type="number" id="srvPrice" step="0.01" min="0" required>
                </div>
            </form>
        `;

        ModalManager.open({
            title: 'Adaugă Serviciu',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Salvează',
                    class: 'btn-primary',
                    onClick: () => this.saveService()
                }
            ]
        });
    },

    showEditForm(id) {
        const services = Store.load('services') || [];
        const service = services.find(s => s.id === id);
        if (!service) return;

        const body = `
            <form id="serviceForm">
                <div class="form-group">
                    <label>Nume Serviciu *</label>
                    <input type="text" id="srvName" value="${service.name}" required>
                </div>
                <div class="form-group">
                    <label>Categorie</label>
                    <select id="srvCategory">
                        <option value="" ${!service.category ? 'selected' : ''}>-- Selectează --</option>
                        <option value="Coafură" ${service.category === 'Coafură' ? 'selected' : ''}>Coafură</option>
                        <option value="Vopsit" ${service.category === 'Vopsit' ? 'selected' : ''}>Vopsit</option>
                        <option value="Tratament" ${service.category === 'Tratament' ? 'selected' : ''}>Tratament</option>
                        <option value="Ondulare" ${service.category === 'Ondulare' ? 'selected' : ''}>Ondulare</option>
                        <option value="Extensii" ${service.category === 'Extensii' ? 'selected' : ''}>Extensii</option>
                        <option value="Alte" ${service.category === 'Alte' ? 'selected' : ''}>Alte</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Durată (minute)</label>
                    <input type="number" id="srvDuration" value="${service.durationMin || ''}" min="15" step="15">
                </div>
                <div class="form-group">
                    <label>Preț *</label>
                    <input type="number" id="srvPrice" value="${service.price}" step="0.01" min="0" required>
                </div>
            </form>
        `;

        const self = this;
        ModalManager.open({
            title: 'Editează Serviciu',
            body,
            buttons: [
                {
                    text: 'Anulează',
                    class: 'btn-secondary',
                    onClick: () => ModalManager.close()
                },
                {
                    text: 'Salvează',
                    class: 'btn-primary',
                    onClick: () => self.updateService(id)
                }
            ]
        });
    },

    saveService() {
        const name = DOM.get('#srvName').value.trim();
        const category = DOM.get('#srvCategory').value || null;
        const duration = parseInt(DOM.get('#srvDuration').value) || 0;
        const price = parseFloat(DOM.get('#srvPrice').value);

        if (!name || !price) {
            ToastManager.error('Completează câmpurile obligatorii');
            return;
        }

        const service = {
            id: Store.generateId(),
            name,
            category,
            durationMin: duration,
            price
        };

        const services = Store.load('services') || [];
        services.push(service);
        Store.save('services', services);

        ModalManager.close();
        ToastManager.success('Serviciu adăugat');
        NavigationManager.renderView('services');
    },

    updateService(id) {
        const services = Store.load('services') || [];
        const service = services.find(s => s.id === id);
        if (!service) return;

        const name = DOM.get('#srvName').value.trim();
        const category = DOM.get('#srvCategory').value || null;
        const duration = parseInt(DOM.get('#srvDuration').value) || 0;
        const price = parseFloat(DOM.get('#srvPrice').value);

        if (!name || !price) {
            ToastManager.error('Completează câmpurile obligatorii');
            return;
        }

        service.name = name;
        service.category = category;
        service.durationMin = duration;
        service.price = price;

        Store.save('services', services);
        ModalManager.close();
        ToastManager.success('Serviciu actualizat');
        NavigationManager.renderView('services');
    },

    handleDelete(id) {
        ModalManager.confirm({
            title: 'Șterge Serviciu',
            message: 'Sunteți sigur că doriți să ștergeți acest serviciu?'
        }).then(confirmed => {
            if (confirmed) {
                const services = Store.load('services') || [];
                const filtered = services.filter(s => s.id !== id);
                Store.save('services', filtered);
                ToastManager.success('Serviciu șters');
                NavigationManager.renderView('services');
            }
        });
    }
};

export default ServicesFeature;
